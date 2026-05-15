"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { toAbsoluteMediaUrl } from "@/lib/absolute-url";

const VideoPlayer = dynamic(
  () => import("./VideoPlayer").then((m) => m.VideoPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    ),
  }
);

interface StreamSourceOption {
  id: string;
  label: string;
  type: "hls";
  url: string;
  quality?: string;
}

interface MultiSourcePlayerProps {
  imdbId: string;
  type: "movie" | "series";
  season?: number;
  episode?: number;
  title: string;
  poster?: string | null;
  onEnded?: () => void;
}

export function MultiSourcePlayer({
  imdbId,
  type,
  season,
  episode,
  title,
  poster,
  onEnded,
}: MultiSourcePlayerProps) {
  const [sources, setSources] = useState<StreamSourceOption[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSources([]);
    setActiveId(null);

    const params = new URLSearchParams({
      imdb: imdbId,
      type,
      title,
    });
    if (type === "series" && season != null && episode != null) {
      params.set("season", String(season));
      params.set("episode", String(episode));
    }

    try {
      const res = await fetch(`/api/stream?${params}`);
      const data = await res.json();
      if (!res.ok) {
        const hint = data.hint ? ` ${data.hint}` : "";
        setError((data.error || "No HLS stream available for this title.") + hint);
        return;
      }

      const list: StreamSourceOption[] = (data.sources || [])
        .filter((s: StreamSourceOption) => s.type === "hls")
        .map((s: StreamSourceOption) => ({
          ...s,
          url: toAbsoluteMediaUrl(s.url),
        }));
      setSources(list);

      if (list[0]) setActiveId(list[0].label + list[0].url);
      else {
        setError(
          "No HLS stream found. Very new or niche titles are often not on PlayIMDb/VidSrc yet — try another episode or a popular series to confirm playback works."
        );
      }
    } catch {
      setError("Failed to load stream.");
    } finally {
      setLoading(false);
    }
  }, [imdbId, type, season, episode, title]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const active = sources.find((s) => activeId === s.label + s.url);
  const label =
    type === "series" && season != null && episode != null
      ? `${title} — S${season}E${episode}`
      : title;

  return (
    <div className="space-y-4">
      {sources.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {sources.map((s) => {
            const key = s.label + s.url;
            const isActive = activeId === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveId(key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "bg-accent text-white"
                    : "border border-surface-border bg-surface-card text-gray-400 hover:text-white"
                }`}
              >
                {s.label}
                {s.quality ? ` · ${s.quality}` : ""}
              </button>
            );
          })}
        </div>
      )}

      {loading && (
        <div className="flex aspect-video items-center justify-center rounded-xl bg-surface-card">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-surface-border bg-surface-card p-8 text-center text-sm text-gray-400">
          <p>{error}</p>
          <button
            type="button"
            onClick={loadSources}
            className="mt-3 rounded-lg bg-accent px-4 py-2 text-white hover:bg-accent-hover"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && active && (
        <VideoPlayer
          key={active.url}
          src={active.url}
          poster={poster}
          title={label}
          onEnded={onEnded}
        />
      )}

      {!loading && sources.length > 0 && (
        <p className="text-xs text-gray-600">
          HLS only — sandbox kept. Iframe embeds that require removing sandbox are not used.
        </p>
      )}
    </div>
  );
}
