/**
 * GuardianX Centralized API Client
 * Handles all fetch calls with automatic base URL resolution,
 * error handling, and consent validation.
 */

export interface ApiError {
  status: number;
  message: string;
  detail?: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = this.resolveBaseUrl();
  }

  /**
   * Resolve API base URL based on environment:
   * - Capacitor/Mobile: Uses configured server IP or origin
   * - Browser: Uses VITE_API_URL env var or window.location.origin
   */
  private resolveBaseUrl(): string {
    // Check if running in Capacitor (mobile)
    if (window.location.protocol === 'capacitor:' || window.location.origin.includes('localhost:5173')) {
      // Try to use environment variable first
      const configuredUrl = import.meta.env.VITE_API_URL;
      if (configuredUrl) return configuredUrl;
      
      // Fallback to local development
      return 'http://localhost:3000';
    }

    // Browser environment - use env var or current origin
    return import.meta.env.VITE_API_URL || window.location.origin;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  async request<T>(
    path: string,
    options: RequestInit & { retries?: number } = {}
  ): Promise<T> {
    const { retries = 0, ...fetchOptions } = options;
    const url = `${this.baseUrl}${path}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
        ...fetchOptions,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          status: response.status,
          message: errorData.detail || errorData.message || `HTTP ${response.status}`,
          detail: errorData.detail,
        } as ApiError;
      }

      return await response.json();
    } catch (error: any) {
      // Retry logic for transient failures
      if (retries > 0 && (error.status === 408 || error.status === 429 || error.status >= 500)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.request<T>(path, { ...options, retries: retries - 1 });
      }

      throw error;
    }
  }

  // ========== AUTHENTICATION ==========
  async login(email: string, password: string) {
    return this.request('/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getCurrentUser() {
    return this.request('/api/users/me', { method: 'GET' });
  }

  // ========== CHILDREN & DEVICES ==========
  async getChildren() {
    return this.request('/api/children', { method: 'GET' });
  }

  async getChild(childId: number) {
    return this.request(`/api/children/${childId}`, { method: 'GET' });
  }

  async getDevices() {
    return this.request('/api/devices', { method: 'GET' });
  }

  async postDeviceHeartbeat(deviceUuid: string, batteryLevel: number) {
    return this.request('/api/devices/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ device_uuid: deviceUuid, battery_level: batteryLevel }),
    });
  }

  // ========== CONSENT MANAGEMENT ==========
  async getConsentStatus(childId: number) {
    return this.request(`/api/consent/child/${childId}`, { method: 'GET' });
  }

  async getDeviceConsentStatus(deviceUuid: string) {
    return this.request('/api/consent/device/status', {
      method: 'GET',
      retries: 1,
    });
  }

  async grantConsent(deviceUuid: string, capabilities: Record<string, boolean>) {
    return this.request('/api/consent/grant', {
      method: 'POST',
      body: JSON.stringify({ device_uuid: deviceUuid, capabilities }),
    });
  }

  async revokeConsent(consentId?: number) {
    const endpoint = consentId ? `/api/consent/${consentId}/revoke` : '/api/consent/revoke';
    return this.request(endpoint, { method: 'POST' });
  }

  // ========== CAPABILITY REQUESTS ==========
  async requestCapability(childId: number, capability: string, payload?: any) {
    return this.request('/api/requests', {
      method: 'POST',
      body: JSON.stringify({ child_id: childId, capability, payload }),
    });
  }

  async getRequests(childId?: number, status?: string) {
    const params = new URLSearchParams();
    if (childId) params.append('child_id', String(childId));
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/requests${query}`, { method: 'GET' });
  }

  async getPendingRequests(deviceUuid: string) {
    return this.request(`/api/requests/pending/${deviceUuid}`, { method: 'GET', retries: 1 });
  }

  async fulfillRequest(requestId: number, resultData: any) {
    return this.request(`/api/requests/${requestId}/fulfill`, {
      method: 'POST',
      body: JSON.stringify({ result_data: resultData }),
    });
  }

  // ========== LOCATIONS & GEOFENCES ==========
  async postLocation(deviceUuid: string, latitude: number, longitude: number, accuracy: number, requestId?: number) {
    return this.request('/api/locations/device', {
      method: 'POST',
      body: JSON.stringify({ device_uuid: deviceUuid, latitude, longitude, accuracy, request_id: requestId }),
    });
  }

  async getLatestLocation(childId: number) {
    return this.request(`/api/locations/latest/${childId}`, { method: 'GET' });
  }

  async getLocationHistory(childId: number) {
    return this.request(`/api/locations/history/${childId}`, { method: 'GET' });
  }

  async getGeofences(childId?: number) {
    const query = childId ? `?child_id=${childId}` : '';
    return this.request(`/api/geofences${query}`, { method: 'GET' });
  }

  async createGeofence(data: any) {
    return this.request('/api/geofences', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGeofence(geofenceId: number, data: any) {
    return this.request(`/api/geofences/${geofenceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async toggleGeofence(geofenceId: number) {
    return this.request(`/api/geofences/${geofenceId}/toggle`, { method: 'POST' });
  }

  async deleteGeofence(geofenceId: number) {
    return this.request(`/api/geofences/${geofenceId}`, { method: 'DELETE' });
  }

  async evaluateGeofences(childId: number, latitude?: number, longitude?: number) {
    return this.request(`/api/geofences/evaluate/${childId}`, {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    });
  }

  // ========== BATTERY & NETWORK TELEMETRY ==========
  async getBatteryStatus(childId: number) {
    return this.request(`/api/device/battery/${childId}`, { method: 'GET', retries: 1 });
  }

  async syncBatteryTelemetry(childId: number, data: any) {
    return this.request('/api/device/battery/sync', {
      method: 'POST',
      body: JSON.stringify({ child_id: childId, ...data }),
    });
  }

  async getNetworkStatus(childId: number) {
    return this.request(`/api/device/network/${childId}`, { method: 'GET', retries: 1 });
  }

  // ========== APP USAGE & FILES ==========
  async getInstalledApps(childId: number) {
    return this.request(`/api/device/apps/${childId}`, { method: 'GET', retries: 1 });
  }

  async getDeviceFiles(childId: number) {
    return this.request(`/api/device/files/${childId}`, { method: 'GET', retries: 1 });
  }

  async downloadDeviceFile(childId: number, fileId: string) {
    return this.request(`/api/device/files/${childId}/download/${fileId}`, { method: 'GET' });
  }

  async getCallLogs(childId: number) {
    return this.request(`/api/device/calls/${childId}`, { method: 'GET', retries: 1 });
  }

  async getChatMetadata(childId: number) {
    return this.request(`/api/device/chats/${childId}`, { method: 'GET', retries: 1 });
  }

  // ========== LIVE STREAMING ==========
  async startLiveStream(childId: number, mode: string) {
    return this.request('/api/stream/session', {
      method: 'POST',
      body: JSON.stringify({ child_id: childId, is_active: true, mode }),
    });
  }

  async stopLiveStream(childId: number) {
    return this.request('/api/stream/session', {
      method: 'POST',
      body: JSON.stringify({ child_id: childId, is_active: false }),
    });
  }

  async getLiveStreamSession(childId: number) {
    return this.request(`/api/stream/session/${childId}`, { method: 'GET', retries: 1 });
  }

  async postLiveStreamFeed(data: any) {
    return this.request('/api/stream/feed', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getLiveStreamFeed(childId: number) {
    return this.request(`/api/stream/feed/${childId}`, { method: 'GET', retries: 1 });
  }

  // ========== SCREENSHOTS ==========
  async getScreenshots(childId: number) {
    return this.request(`/api/device/screenshots/${childId}`, { method: 'GET', retries: 1 });
  }

  async requestScreenshot(childId: number, customAppName?: string) {
    return this.request('/api/device/screenshots/request', {
      method: 'POST',
      body: JSON.stringify({ child_id: childId, custom_app: customAppName }),
    });
  }

  async deleteScreenshot(childId: number, screenshotId: string) {
    return this.request(`/api/device/screenshots/${childId}/${encodeURIComponent(screenshotId)}`, {
      method: 'DELETE',
    });
  }

  // ========== AUDIT & NOTIFICATIONS ==========
  async getAuditLogs(childId?: number, filters?: any) {
    const params = new URLSearchParams();
    if (childId) params.append('child_id', String(childId));
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/audit${query}`, { method: 'GET' });
  }

  async getNotifications() {
    return this.request('/api/notifications/my', { method: 'GET', retries: 1 });
  }

  async markNotificationAsRead(notificationId: number) {
    return this.request(`/api/notifications/${notificationId}/read`, { method: 'POST' });
  }

  // ========== EMERGENCY SOS ==========
  async triggerSOS(childId: number, message: string, latitude?: number, longitude?: number) {
    return this.request('/api/trigger', {
      method: 'POST',
      body: JSON.stringify({
        child_id: childId,
        message,
        latitude,
        longitude,
        triggered_by: 'child',
      }),
    });
  }

  async getSosState(childId: number) {
    return this.request(`/api/sos/state/${childId}`, { method: 'GET', retries: 1 });
  }

  async resolveSos(childId: number) {
    return this.request('/api/sos/resolve', {
      method: 'POST',
      body: JSON.stringify({ child_id: childId, resolved_by: 'parent' }),
    });
  }

  // ========== HEALTH & INFO ==========
  async getHealthStatus() {
    return this.request('/api/health', { method: 'GET', retries: 1 });
  }

  async getServiceInfo() {
    return this.request('/api/info', { method: 'GET', retries: 1 });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
