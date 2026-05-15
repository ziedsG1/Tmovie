"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toAbsoluteMediaUrl } from "@/lib/absolute-url";

interface VideoPlayerProps {
  src: string;
  poster?: string | null;
  title?: string;
  onEnded?: () => void;
}

const LOAD_TIMEOUT_MS = 22000;

export function VideoPlayer({ src, poster, title, onEnded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const playSrc = useMemo(() => toAbsoluteMediaUrl(src), [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playSrc) return;

    setError(null);
    setLoading(true);

    let hls: import("hls.js").default | null = null;
    let destroyed = false;
    let fatalRetries = 0;

    const clearLoading = () => {
      if (!destroyed) setLoading(false);
    };

    const fail = (message: string) => {
      if (destroyed) return;
      setError(message);
      clearLoading();
    };

    const loadTimeout = window.setTimeout(() => {
      fail("Stream timed out. Try another source above or click Retry on the player.");
    }, LOAD_TIMEOUT_MS);

    const onCanPlay = () => {
      window.clearTimeout(loadTimeout);
      clearLoading();
    };

    const onVideoError = () => {
      const code = video.error?.code;
      const msg =
        code === 4
          ? "Stream blocked or unavailable (MEDIA_ERR_SRC_NOT_SUPPORTED)."
          : "Video failed to load. Try another source.";
      fail(msg);
    };

    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("loadeddata", onCanPlay);
    video.addEventListener("error", onVideoError);

    async function setup() {
      const useNative =
        video!.canPlayType("application/vnd.apple.mpegurl") &&
        !/Chrome|Chromium|Edg\//.test(navigator.userAgent);

      if (useNative) {
        video!.src = playSrc;
        try {
          await video!.play();
        } catch {
          /* user may need to press play */
        }
        return;
      }

      const Hls = (await import("hls.js")).default;
      if (!Hls.isSupported()) {
        video!.src = playSrc;
        return;
      }

      hls = new Hls({
        enableWorker: false,
        lowLatencyMode: false,
        manifestLoadingTimeOut: 18000,
        manifestLoadingMaxRetry: 4,
        levelLoadingTimeOut: 18000,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
      });

      hls.loadSource(playSrc);
      hls.attachMedia(video!);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        window.clearTimeout(loadTimeout);
        clearLoading();
        void video!.play().catch(() => {
          /* autoplay blocked — controls still work */
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && fatalRetries < 2) {
          fatalRetries += 1;
          hls?.startLoad();
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && fatalRetries < 2) {
          fatalRetries += 1;
          hls?.recoverMediaError();
          return;
        }

        window.clearTimeout(loadTimeout);
        fail("Playback failed. Try another stream source or refresh the page.");
        hls?.destroy();
        hls = null;
      });
    }

    void setup().catch(() => {
      fail("Could not initialize the player.");
    });

    return () => {
      destroyed = true;
      window.clearTimeout(loadTimeout);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("loadeddata", onCanPlay);
      video.removeEventListener("error", onVideoError);
      hls?.destroy();
    };
  }, [playSrc]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-surface-border">
      {loading && !error && (
        <LoadingOverlay />
      )}
      {error ? (
        <div className="flex aspect-video flex-col items-center justify-center gap-3 p-6 text-center text-sm text-gray-400">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-accent px-4 py-2 text-white hover:bg-accent-hover"
          >
            Reload page
          </button>
        </div>
      ) : (
        <video
          ref={videoRef}
          className="h-full w-full"
          controls
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          poster={poster || undefined}
          title={title}
          onEnded={onEnded}
        />
      )}
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      <p className="text-xs text-gray-500">Loading stream…</p>
    </div>
  );
}
