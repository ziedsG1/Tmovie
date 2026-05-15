import { notFound } from "next/navigation";
import { SeriesWatch } from "@/components/SeriesWatch";
import { WatchClient } from "@/components/WatchClient";
import { getSeasonsMulti } from "@/lib/episodes";
import { getTitle, posterUrl } from "@/lib/imdb";
import { isPlayableStream } from "@/lib/stream";

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: { imdbId: string };
  searchParams: { type?: string; season?: string; episode?: string };
}) {
  const imdbId = params.imdbId.toLowerCase();
  if (!/^tt\d+$/.test(imdbId)) notFound();

  const isSeries = searchParams.type === "series";
  const season = searchParams.season ? parseInt(searchParams.season, 10) : 1;
  const episode = searchParams.episode ? parseInt(searchParams.episode, 10) : 1;

  const details = await getTitle(imdbId).catch(() => null);
  const title = details?.title || imdbId;
  const poster = details ? posterUrl(details.poster) : null;
  const asSeries = isSeries || details?.type === "tv";

  const playable = await isPlayableStream(
    asSeries
      ? { imdbId, type: "series", season, episode }
      : { imdbId, type: "movie" }
  );
  if (!playable) notFound();

  if (asSeries) {
    const seasons = await getSeasonsMulti(imdbId).catch(() => []);
    if (!seasons.length) notFound();

    const validSeason = seasons.some((s) => s.season === season)
      ? season
      : seasons[0].season;

    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <SeriesWatch
          seriesId={imdbId}
          seriesTitle={title}
          seasons={seasons}
          initialSeason={validSeason}
          initialEpisode={episode}
          poster={poster}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <WatchClient imdbId={imdbId} type="movie" poster={poster} title={title} />
    </div>
  );
}
