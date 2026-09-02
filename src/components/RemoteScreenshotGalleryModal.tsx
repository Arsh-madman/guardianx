import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';

interface RemoteScreenshot {
  id: string;
  child_id: number;
  device_id: number;
  image_url: string;
  captured_at: string;
  foreground_app: string;
  screen_resolution: string;
  battery_at_capture: number;
  trigger_source: 'parent_request' | 'automated_schedule' | 'safety_trigger';
  notes?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  childId: number;
  childName: string;
  onScreenshotCaptured?: () => void | Promise<void>;
}

export const RemoteScreenshotGalleryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  childId,
  childName,
  onScreenshotCaptured,
}) => {
  const [screenshots, setScreenshots] = useState<RemoteScreenshot[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadScreenshots = useCallback(async () => {
    if (!isOpen) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/device/screenshots/${childId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || `Request failed (${res.status})`);
      }

      const items = Array.isArray(data?.screenshots) ? data.screenshots : [];
      setScreenshots(items);
      setSelectedIndex((i) =>
        items.length ? Math.min(i, items.length - 1) : 0
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load screenshots');
    } finally {
      setLoading(false);
    }
  }, [childId, isOpen]);

  useEffect(() => {
    if (isOpen) void loadScreenshots();
  }, [isOpen, loadScreenshots]);

  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();

      if (e.key === 'ArrowLeft' && screenshots.length) {
        setSelectedIndex((i) => (i === 0 ? screenshots.length - 1 : i - 1));
      }

      if (e.key === 'ArrowRight' && screenshots.length) {
        setSelectedIndex((i) => (i === screenshots.length - 1 ? 0 : i + 1));
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, screenshots.length]);

  const selected = useMemo(
    () => screenshots[selectedIndex] ?? null,
    [screenshots, selectedIndex]
  );

  const requestScreenshot = async () => {
    try {
      setCapturing(true);
      setError(null);

      const res = await fetch('/api/device/screenshots/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || `Request failed (${res.status})`);
      }

      await loadScreenshots();
      await onScreenshotCaptured?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to request screenshot');
    } finally {
      setCapturing(false);
    }
  };

  const deleteScreenshot = async (id: string) => {
    try {
      setDeleting(true);
      setError(null);

      const res = await fetch(
        `/api/device/screenshots/${childId}/${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || `Delete failed (${res.status})`);
      }

      const next = screenshots.filter((s) => s.id !== id);
      setScreenshots(next);
      setSelectedIndex((i) =>
        next.length ? Math.min(i, next.length - 1) : 0
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to delete screenshot');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-3xl bg-[#08110F] border border-[#214235] shadow-2xl flex flex-col">

        <div className="px-6 py-4 border-b border-[#214235] flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-black text-white">
                Remote Screenshots
              </h2>
            </div>
            <p className="text-xs text-[#7C9B8A] mt-1">
              {childName} • {screenshots.length} screenshot
              {screenshots.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void requestScreenshot()}
              disabled={capturing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-black text-xs font-black hover:bg-emerald-400 disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              {capturing ? 'Capturing…' : 'Capture Now'}
            </button>

            <button
              type="button"
              onClick={() => void loadScreenshots()}
              disabled={loading}
              className="p-2 rounded-xl bg-[#10201B] border border-[#214235] text-[#B8F36B]"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#10201B] border border-[#214235] text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden grid lg:grid-cols-[1fr_280px]">
          <div className="min-h-0 flex flex-col">

            <div className="flex-1 min-h-0 flex items-center justify-center p-5 bg-black/30">
              {selected ? (
                <div className="relative w-full h-full flex items-center justify-center">

                  <img
                    src={selected.image_url}
                    alt={`Screenshot from ${selected.foreground_app}`}
                    className="max-h-full max-w-full object-contain rounded-2xl border border-[#214235] shadow-2xl"
                  />

                  {screenshots.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedIndex((i) =>
                            i === 0 ? screenshots.length - 1 : i - 1
                          )
                        }
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 text-white"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedIndex((i) =>
                            i === screenshots.length - 1 ? 0 : i + 1
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 text-white"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <ImageIcon className="w-12 h-12 text-[#36584B] mx-auto mb-4" />
                  <p className="font-black text-white">No screenshots yet</p>
                  <p className="text-xs text-[#7C9B8A] mt-1">
                    Request a screenshot to populate the gallery.
                  </p>
                </div>
              )}
            </div>

            {selected && (
              <div className="px-5 py-4 border-t border-[#214235] bg-[#10201B]">
                <div className="flex items-start justify-between gap-4">

                  <div>
                    <div className="text-sm font-black text-white">
                      {selected.foreground_app}
                    </div>

                    <div className="text-xs text-[#7C9B8A] mt-1">
                      {new Date(selected.captured_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">

                    <a
                      href={selected.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-[#08110F] border border-[#214235] text-[#B8F36B]"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => {
                        if (window.confirm('Delete this screenshot?')) {
                          void deleteScreenshot(selected.id);
                        }
                      }}
                      className="p-2 rounded-xl bg-[#08110F] border border-red-900/50 text-red-300 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4 text-[11px]">

                  <div>
                    <div className="text-[#7C9B8A]">Resolution</div>
                    <div className="text-white font-bold mt-1">
                      {selected.screen_resolution}
                    </div>
                  </div>

                  <div>
                    <div className="text-[#7C9B8A]">Battery</div>
                    <div className="text-white font-bold mt-1">
                      {selected.battery_at_capture}%
                    </div>
                  </div>

                  <div>
                    <div className="text-[#7C9B8A]">Trigger</div>
                    <div className="text-white font-bold mt-1">
                      {selected.trigger_source.replaceAll('_', ' ')}
                    </div>
                  </div>

                </div>

                {selected.notes && (
                  <div className="text-[11px] text-[#7C9B8A] mt-4">
                    {selected.notes}
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="min-h-0 overflow-y-auto border-l border-[#214235] bg-[#10201B] p-4">

            <div className="text-[11px] font-black uppercase tracking-wider text-[#7C9B8A] mb-3">
              Captured
            </div>

            <div className="space-y-3">
              {screenshots.map((screenshot, index) => (
                <button
                  key={screenshot.id}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className={`w-full text-left rounded-2xl overflow-hidden border ${
                    index === selectedIndex
                      ? 'border-emerald-400 bg-[#162B24]'
                      : 'border-[#214235] bg-[#08110F]'
                  }`}
                >
                  <div className="aspect-video bg-black overflow-hidden">
                    <img
                      src={screenshot.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-3">
                    <div className="text-xs font-black text-white truncate">
                      {screenshot.foreground_app}
                    </div>

                    <div className="text-[10px] text-[#7C9B8A] mt-1">
                      {new Date(screenshot.captured_at).toLocaleTimeString()}
                    </div>
                  </div>
                </button>
              ))}

              {!loading && screenshots.length === 0 && (
                <div className="p-5 rounded-2xl border border-dashed border-[#214235] text-center">
                  <p className="text-xs font-bold text-[#7C9B8A]">
                    Gallery empty
                  </p>
                </div>
              )}
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
};

export default RemoteScreenshotGalleryModal;
