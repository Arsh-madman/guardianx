# GuardianX Architecture & Production Blueprint

## 1. Executive Summary & Core Product Mission
**GuardianX** is a consent-first family safety system designed for ethical, transparent child protection. Unlike traditional parental spyware that relies on clandestine, root-level, or accessibility-abusing surveillance, GuardianX enforces strict, verifiable consent boundaries:
- **Child Empowerment**: Only the child device can grant, renew, or revoke consent. The maximum consent lifetime is **30 days**.
- **Capability Granularity**: Access to **LOCATION**, **CAMERA**, **MICROPHONE**, **LIVE_VIEW**, and **DEVICE_STATUS** is authorized individually rather than through an opaque blanket permission.
- **Request-Based Ephemeral Execution**: Parents dispatch distinct capability requests. Each request carries cryptographic verification, expiration time windows, and state tracking (`pending` → `accepted` → `running` → `fulfilled` / `denied` / `expired` / `failed`).
- **Android Privacy & Platform Integrity**: Full adherence to Android 14+ / CameraX / AudioRecord foreground service mandates, status bar privacy chip indicators, and locked-screen limitations.
- **Comprehensive Audit Trail**: Every grant, renewal, revocation, and capability execution generates immutable audit logs with actor and timestamp records.

---

## 2. System Architecture & Component Interactions

```
┌─────────────────────────────────────────────────────────────┐
│                    PARENT PORTAL (WEB/APP)                  │
│   - Manage Linked Child Devices & Consent Expiry Countdown  │
│   - Request On-Demand Location / Camera / Microphone        │
│   - Live OpenStreetMap / Safezones / SOS Emergency Feed     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON-RPC / REST
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             GUARDIANX CORE FASTAPI / BACKEND ENGINE         │
│  - JWT & Device Auth Security Layer                         │
│  - Consent & Capability Validator (30-day enforce)          │
│  - Request Lifecycle State Machine (pending -> fulfilled)   │
│  - Immutable Audit Logging Service                          │
│  - SQLite / PostgreSQL Database with Alembic Migrations     │
└──────────────────────────────▲──────────────────────────────┘
                               │ HTTPS / TLS Heartbeat / WS
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              CHILD DEVICE (ANDROID NATIVE / RN)             │
│  - Device Pairing & Rotating Token Management               │
│  - Explicit 30-Day Consent Dialog & Capability Checkboxes   │
│  - Dedicated CameraManager (CameraX) & AudioManager         │
│  - Android Foreground Service + Visible Privacy Indicators  │
│  - In-App Active Capability Session Banner + "STOP" control │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Database ER Model & Alembic Migration Map

```
  ┌───────────────┐          ┌───────────────┐
  │     User      │ 1      * │     Child     │
  │───────────────│──────────│───────────────│
  │ id (PK)       │          │ id (PK)       │
  │ email         │          │ parent_id(FK) │
  │ hashed_pwd    │          │ name          │
  │ role (parent) │          │ age           │
  └───────────────┘          └───────┬───────┘
                                     │ 1
                                     │ *
                             ┌───────┴───────┐
                             │    Device     │
                             │───────────────│
                             │ id (PK)       │
                             │ child_id (FK) │
                             │ device_uuid   │
                             │ pairing_token │
                             │ battery_level │
                             │ last_seen     │
                             └───────┬───────┘
                                     │ 1
                                     │ *
                             ┌───────┴───────┐ 1    * ┌────────────────────┐
                             │    Consent    │────────│ ConsentCapability  │
                             │───────────────│        │────────────────────│
                             │ id (PK)       │        │ id (PK)            │
                             │ child_id (FK) │        │ consent_id (FK)    │
                             │ device_id(FK) │        │ capability (ENUM)  │
                             │ parent_id(FK) │        │ enabled (BOOL)     │
                             │ granted_at    │        └────────────────────┘
                             │ expires_at    │
                             │ is_active     │
                             │ revoked_at    │
                             └───────┬───────┘
                                     │ 1
                                     │ *
                   ┌─────────────────┴─────────────────┐
                   │                                   │
                   ▼                                   ▼
        ┌───────────────────────┐           ┌───────────────────────┐
        │   CapabilityRequest   │           │      AuditEvent       │
        │───────────────────────│           │───────────────────────│
        │ id (PK)               │           │ id (PK)               │
        │ parent_id (FK)        │           │ actor_id              │
        │ child_id (FK)         │           │ actor_type (p/c/sys)  │
        │ device_id (FK)        │           │ child_id (FK)         │
        │ capability (ENUM)     │           │ device_id (FK)        │
        │ status (ENUM)         │           │ capability            │
        │ created_at            │           │ request_id (FK)       │
        │ expires_at            │           │ event_type            │
        │ fulfilled_at          │           │ metadata (JSON)       │
        └───────────────────────┘           │ timestamp             │
                                            └───────────────────────┘
```

---

## 4. Consent & Capability State Machine

```
                   ┌──────────────┐
                   │  NO CONSENT  │
                   └──────┬───────┘
                          │ Child explicitly reviews capabilities
                          │ & clicks "Grant Consent (30 Days)"
                          ▼
                   ┌──────────────┐
        ┌──────────│    ACTIVE    │──────────┐
        │          └──────────────┘          │
        │ Child clicks        │ 30 days      │ Capability toggle
        │ "Revoke"            │ elapsed      │ changed by child
        ▼                     ▼              ▼
 ┌──────────────┐      ┌──────────────┐ ┌──────────────┐
 │   REVOKED    │      │   EXPIRED    │ │ CAP UPDATED  │
 └──────────────┘      └──────────────┘ └──────────────┘
        │                     │
        └──────────┬──────────┘
                   │ Child re-authorizes
                   ▼
             [ NEW GRANT ]
```

---

## 5. Request Lifecycle Matrix
1. **Parent Dispatch**: Parent triggers e.g. `POST /api/v1/requests` with `{ child_id: 1, capability: "LOCATION" }`.
2. **Backend Validation**:
   - Verify caller is linked parent.
   - Verify an active, non-expired, non-revoked consent exists for child/device.
   - Verify `capability` is explicitly enabled in `ConsentCapability`.
   - Set status to `pending`, with `expires_at = now() + 60s`.
3. **Child Device Notification**: Device receives request via polling / WebSocket / push.
4. **Device Validation**: Native device verifies its UUID, pairing token, local Android OS permissions.
5. **Execution**:
   - `LOCATION`: FusedLocationProvider single high-accuracy fix.
   - `CAMERA` / `MICROPHONE`: Starts foreground service with persistent notification + green privacy indicator.
6. **Fulfillment**: Device posts result to `/api/v1/requests/{id}/fulfill`. State updates to `fulfilled`. Audit event logged.

---

## 6. Android Platform & Privacy Compliance
- **CameraX API**: Managed through `CameraManager.kt`, bound to Android lifecycle.
- **AudioRecord / AudioTrack**: Managed through `AudioManager.kt`.
- **Foreground Service Type**: `android:foregroundServiceType="camera|microphone|location"` in AndroidManifest with explicit persistent notification: *"GuardianX is actively sharing camera/mic with family"*.
- **Locked Screen Safety**: If screen is locked, request prompts user unlock or launches dedicated overlay activity compliant with KeyguardManager.
- **Zero Stealth Policy**: No background hidden mic recording or suppressed LED/privacy chips. Child has an immediate prominent **"STOP SESSION"** button.

---

## 7. Quality & Release Checklist
- [x] Full REST API implementation with granular capabilities & consent validation
- [x] Ephemeral request-based lifecycle with automatic timeout
- [x] In-memory & SQLite/PostgreSQL schema with audit logging
- [x] Parent Dashboard with real-time map, device health, and camera/mic capability controls
- [x] Child Device View with 30-day consent granting, capability toggling, live session banner, and panic SOS
- [x] Split-Screen testing harness to simulate live parent-child interaction
