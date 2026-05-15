import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  backdropUrl,
  displayTitle,
  displayYear,
  getTitle,
  posterUrl,
} from "@/lib/imdb";
import { getSeasonsMulti } from "@/lib/episodes";
import { isPlayableStream } from "@/lib/stream";

export default async function TitlePage({ params }: { params: { imdbId: string } }) {
  const imdbId = params.imdbId.toLowerCase();
  if (!/^tt\d+$/.test(imdbId)) notFound();

  const details = await getTitle(imdbId).catch(() => null);
  if (!details) notFound();

  const poster = posterUrl(details.poster);
  const backdrop = backdropUrl(details.backdrop || details.poster);
  const seasons =
    details.type === "tv" ? await getSeasonsMulti(imdbId).catch(() => []) : [];

  const defaultSeason = seasons[0]?.season ?? 1;
  const playable = await isPlayableStream(
    details.type === "tv"
      ? { imdbId, type: "series", season: defaultSeason, episode: 1 }
      : { imdbId, type: "movie" }
  );

  return (
    <div>
      <div className="relative h-[40vh] min-h-[280px] w-full">
        {backdrop && <Image src={backdrop} alt="" fill className="object-cover" sizes="100vw" />}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="-mt-32 flex flex-col gap-8 md:flex-row">
          <div className="relative h-[320px] w-[220px] flex-shrink-0 overflow-hidden rounded-xl ring-2 ring-surface-border">
            {poster ? (
              <Image src={poster} alt={displayTitle(details)} fill className="object-cover" sizes="220px" />
            ) : (
              <div className="flex h-full items-center justify-center bg-surface-card text-gray-500">
                No poster
              </div>
            )}
          </div>

          <div className="flex-1 pt-4 md:pt-16">
            <p className="text-xs font-medium uppercase tracking-widest text-gold">
              {details.titleTypeLabel || (details.type === "tv" ? "TV Series" : "Movie")} · IMDb
            </p>
            <h1 className="font-display text-4xl text-white sm:text-5xl">{displayTitle(details)}</h1>
            <p className="mt-2 text-gray-400">
              {displayYear(details)}
              {details.runtimeMinutes ? ` · ${details.runtimeMinutes} min` : ""}
              {details.rating > 0 && (
                <span className="ml-3 text-gold">
                  ★ {details.rating.toFixed(1)}
                  {details.voteCount > 0 && (
                    <span className="ml-1 text-gray-500">
                      ({details.voteCount.toLocaleString()} votes)
                    </span>
                  )}
                </span>
              )}
            </p>

            {details.genres.length > 0 && (
              <p className="mt-3 flex flex-wrap gap-2">
                {details.genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-full border border-surface-border px-3 py-0.5 text-xs text-gray-400"
                  >
                    {g}
                  </span>
                ))}
              </p>
            )}

            <p className="mt-6 max-w-3xl leading-relaxed text-gray-300">{details.plot}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              {playable ? (
                <Link
                  href={
                    details.type === "tv"
                      ? `/watch/${imdbId}?type=series&season=${defaultSeason}&episode=1`
                      : `/watch/${imdbId}`
                  }
                  className="rounded-lg bg-accent px-8 py-3 font-semibold text-white transition hover:bg-accent-hover"
                >
                  {details.type === "tv" ? "▶ Watch episodes" : "▶ Watch now"}
                </Link>
              ) : (
                <p className="rounded-lg border border-surface-border px-6 py-3 text-sm text-gray-400">
                  No stream available for this title yet.
                </p>
              )}
              <a
                href={`https://www.imdb.com/title/${imdbId}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-surface-border px-6 py-3 text-sm text-gray-300 hover:text-white"
              >
                IMDb ↗
              </a>
              <a
                href={`https://www.playimdb.com/title/${imdbId}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-surface-border px-6 py-3 text-sm text-gray-300 hover:text-white"
              >
                PlayIMDb ↗
              </a>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              HLS playback only (sandboxed — no VidSrc/2Embed iframes)
            </p>
            <p className="mt-1 font-mono text-xs text-gray-600">{imdbId}</p>
          </div>
        </div>

        {playable && details.type === "tv" && seasons.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-6 font-display text-2xl text-white">Seasons</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {seasons.map((s) => (
                <Link
                  key={s.season}
                  href={`/watch/${imdbId}?type=series&season=${s.season}&episode=1`}
                  className="rounded-xl border border-surface-border bg-surface-card p-5 transition hover:border-accent/40"
                >
                  <h3 className="font-semibold text-white">Season {s.label}</h3>
                  <p className="mt-1 text-xs text-gray-500">Episodes one by one · M3U8</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
