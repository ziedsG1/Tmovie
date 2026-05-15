"use client";

import { MultiSourcePlayer } from "./MultiSourcePlayer";

interface WatchClientProps {
  imdbId: string;
  type: "movie" | "series";
  season?: number;
  episode?: number;
  poster?: string | null;
  title: string;
}

export function WatchClient(props: WatchClientProps) {
  const label =
    props.type === "series" && props.season != null && props.episode != null
      ? `${props.title} — S${props.season}E${props.episode}`
      : props.title;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-white">{label}</h1>
        <span className="font-mono text-sm text-gray-500">{props.imdbId}</span>
      </div>
      <MultiSourcePlayer {...props} />
    </div>
  );
}
