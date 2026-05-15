"use client";

import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  src: string;
  poster?: string | null;
  title?: string;
  onEnded?: () => void;
}

export function VideoPlayer({ src, poster, title, onEnded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setError(null);
    setLoading(true);

    let hls: import("hls.js").default | null = null;

    async function setup() {
      if (video!.canPlayType("application/vnd.apple.mpegurl")) {
        video!.src = src;
        video!.addEventListener("loadeddata", () => setLoading(false), { once: true });
        return;
      }

      const Hls = (await import("hls.js")).default;
      if (!Hls.isSupported()) {
        setError("HLS playback is not supported in this browser.");
        setLoading(false);
        return;
      }

      hls = new Hls({ enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video!);
      hls.on(Hls.Events.MANIFEST_PARSED, () => setLoading(false));
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setError("Playback failed. The stream may be unavailable.");
          setLoading(false);
        }
      });
    }

    setup();

    return () => {
      hls?.destroy();
    };
  }, [src]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-surface-border">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      )}
      {error ? (
        <div className="flex aspect-video items-center justify-center p-6 text-center text-sm text-gray-400">
          {error}
        </div>
      ) : (
        <video
          ref={videoRef}
          className="h-full w-full"
          controls
          playsInline
          poster={poster || undefined}
          title={title}
          onEnded={onEnded}
        />
      )}
    </div>
  );
}
