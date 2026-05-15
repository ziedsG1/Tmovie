"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ImdbEpisode, ImdbSeason } from "@/lib/imdb";
import { MultiSourcePlayer } from "./MultiSourcePlayer";

interface SeriesWatchProps {
  seriesId: string;
  seriesTitle: string;
  seasons: ImdbSeason[];
  initialSeason: number;
  initialEpisode: number;
  poster?: string | null;
}

type EpisodeStatus = "idle" | "checking" | "available" | "unavailable";

interface EpisodeWithStatus extends ImdbEpisode {
  status: EpisodeStatus;
}

export function SeriesWatch({
  seriesId,
  seriesTitle,
  seasons,
  initialSeason,
  initialEpisode,
  poster,
}: SeriesWatchProps) {
  const [season, setSeason] = useState(initialSeason);
  const [episodes, setEpisodes] = useState<EpisodeWithStatus[]>([]);
  const [loadingEps, setLoadingEps] = useState(true);
  const [current, setCurrent] = useState({ season: initialSeason, episode: initialEpisode });
  const [episodeSource, setEpisodeSource] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadEpisodes = useCallback(async (seasonNum: number, pickEpisode?: number) => {
    setLoadingEps(true);
    setEpisodes([]);
    setLoadError(null);
    setEpisodeSource(null);

    try {
      const res = await fetch(`/api/episodes?imdb=${seriesId}&season=${seasonNum}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load episodes");

      const list: EpisodeWithStatus[] = (data.episodes || []).map((ep: ImdbEpisode) => ({
        ...ep,
        status: "idle" as EpisodeStatus,
      }));

      setEpisodes(list);
      setEpisodeSource(data.source || null);

      if (list.length === 0) {
        const tried = (data.sourcesTried as string[] | undefined)?.join(", ") || "IMDb, TVMaze";
        setLoadError(`No episodes found (tried: ${tried}).`);
      } else {
        const ep =
          pickEpisode && list.some((e) => e.episode === pickEpisode)
            ? pickEpisode
            : list[0].episode;
        setCurrent({ season: seasonNum, episode: ep });
      }
    } catch (e) {
      setEpisodes([]);
      setLoadError(e instanceof Error ? e.message : "Failed to load episodes");
    } finally {
      setLoadingEps(false);
    }
  }, [seriesId]);

  const checkEpisodeStreams = useCallback(async (list: EpisodeWithStatus[]) => {
    if (!list.length) return;

    setEpisodes((prev) => prev.map((e) => ({ ...e, status: "checking" as EpisodeStatus })));

    const batchSize = 8;
    const statusMap: Record<string, boolean> = {};

    for (let i = 0; i < list.length; i += batchSize) {
      const chunk = list.slice(i, i + batchSize);
      const items = chunk.map((ep) => ({
        imdbId: seriesId,
        type: "series" as const,
        season: ep.season,
        episode: ep.episode,
        title: seriesTitle,
      }));

      try {
        const res = await fetch("/api/stream/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const data = await res.json();
        Object.assign(statusMap, data.results || {});
      } catch {
        /* continue */
      }

      setEpisodes((prev) =>
        prev.map((ep) => {
          const key = `${seriesId}:s${ep.season}:e${ep.episode}`;
          return {
            ...ep,
            status: statusMap[key] ? "available" : "unavailable",
          };
        })
      );
    }
  }, [seriesId, seriesTitle]);

  useEffect(() => {
    const pick = season === initialSeason ? initialEpisode : undefined;
    loadEpisodes(season, pick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season, seriesId]);

  useEffect(() => {
    if (!loadingEps && episodes.length > 0) {
      checkEpisodeStreams(episodes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingEps, season]);

  const currentEp = useMemo(
    () => episodes.find((e) => e.season === current.season && e.episode === current.episode),
    [episodes, current]
  );

  const playableEpisodes = useMemo(
    () => episodes.filter((e) => e.status === "available"),
    [episodes]
  );

  const currentIndex = playableEpisodes.findIndex(
    (e) => e.season === current.season && e.episode === current.episode
  );

  function selectEpisode(seasonNum: number, episodeNum: number) {
    setCurrent({ season: seasonNum, episode: episodeNum });
  }

  function playNext() {
    if (currentIndex >= 0 && currentIndex < playableEpisodes.length - 1) {
      const next = playableEpisodes[currentIndex + 1];
      selectEpisode(next.season, next.episode);
    }
  }

  const label = currentEp
    ? `${seriesTitle} — S${current.season}E${current.episode}: ${currentEp.title}`
    : `${seriesTitle} — S${current.season}E${current.episode}`;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-4">
        <div>
          <Link href={`/title/${seriesId}`} className="text-sm text-accent hover:underline">
            ← {seriesTitle}
          </Link>
          <h1 className="mt-1 font-display text-2xl text-white sm:text-3xl">{label}</h1>
        </div>

        <MultiSourcePlayer
          key={`${current.season}-${current.episode}`}
          imdbId={seriesId}
          type="series"
          season={current.season}
          episode={current.episode}
          title={seriesTitle}
          poster={currentEp?.poster || poster}
          onEnded={playNext}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={currentIndex <= 0}
            onClick={() => {
              if (currentIndex > 0) {
                const prev = playableEpisodes[currentIndex - 1];
                selectEpisode(prev.season, prev.episode);
              }
            }}
            className="rounded-lg border border-surface-border px-4 py-2 text-sm text-gray-300 disabled:opacity-40 hover:border-accent/40"
          >
            ← Previous
          </button>
          <button
            type="button"
            disabled={currentIndex < 0 || currentIndex >= playableEpisodes.length - 1}
            onClick={playNext}
            className="rounded-lg border border-surface-border px-4 py-2 text-sm text-gray-300 disabled:opacity-40 hover:border-accent/40"
          >
            Next episode →
          </button>
        </div>
      </div>

      <aside className="w-full shrink-0 lg:w-80">
        <div className="sticky top-20 rounded-xl border border-surface-border bg-surface-card">
          <div className="border-b border-surface-border p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Season</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {seasons.map((s) => (
                <button
                  key={s.season}
                  type="button"
                  onClick={() => setSeason(s.season)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    season === s.season
                      ? "bg-accent text-white"
                      : "bg-surface-raised text-gray-400 hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <p className="border-b border-surface-border px-4 py-2 text-xs text-gray-500">
            Episodes
            {episodeSource && <span className="ml-2 text-gold">via {episodeSource}</span>}
            {" · "}green = HLS stream available
          </p>

          <ul className="max-h-[55vh] overflow-y-auto p-2">
            {loadingEps && (
              <li className="py-8 text-center text-sm text-gray-500">
                Loading episodes (IMDb → TVMaze)…
              </li>
            )}
            {!loadingEps && episodes.length === 0 && (
              <li className="space-y-3 py-6 px-2 text-center text-sm text-gray-500">
                <p>{loadError || "No episodes for this season"}</p>
                <button
                  type="button"
                  onClick={() => loadEpisodes(season)}
                  className="rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-300 hover:text-white"
                >
                  Retry
                </button>
              </li>
            )}
            {episodes.map((ep) => {
              const active = ep.season === current.season && ep.episode === current.episode;
              const dot =
                ep.status === "available"
                  ? "bg-emerald-500"
                  : ep.status === "unavailable"
                    ? "bg-gray-600"
                    : ep.status === "checking"
                      ? "bg-amber-500 animate-pulse"
                      : "bg-gray-700";

              return (
                <li key={ep.id}>
                  <button
                    type="button"
                    onClick={() => selectEpisode(ep.season, ep.episode)}
                    className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      active ? "bg-accent/20 ring-1 ring-accent/50" : "hover:bg-surface-raised"
                    }`}
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
                    <span className="min-w-0 flex-1">
                      <span className="font-mono text-xs text-gold">E{ep.episode}</span>
                      <p className={`text-sm ${active ? "font-medium text-white" : "text-gray-300"}`}>
                        {ep.title}
                      </p>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}
