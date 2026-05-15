import { MovieGrid } from "@/components/MovieGrid";
import { MovieRow } from "@/components/MovieRow";
import { getDiscoverCatalog } from "@/lib/discover";
import type { ImdbTitle } from "@/lib/imdb";

export const metadata = { title: "TV Shows — Tmovies" };
export const dynamic = "force-dynamic";

export default async function TvPage() {
  let series: ImdbTitle[] = [];
  let tvmazeSeries: ImdbTitle[] = [];
  let topRated: ImdbTitle[] = [];
  let error = false;

  try {
    const catalog = await getDiscoverCatalog();
    series = catalog.series;
    tvmazeSeries = catalog.tvmazeSeries;
    topRated = catalog.topRatedSeries.slice(0, 40);
  } catch {
    error = true;
  }

  return (
    <div className="py-8">
      <h1 className="mb-2 px-4 font-display text-4xl text-white sm:px-6">TV Shows</h1>
      <p className="mb-8 px-4 text-sm text-gray-400 sm:px-6">
        {error
          ? "Could not load the series catalog from IMDb."
          : `${series.length.toLocaleString()} series in catalog.`}
      </p>

      {!error && (
        <>
          <MovieRow title="Top rated series" items={topRated} />
          {tvmazeSeries.length > 0 && (
            <MovieRow title="TVMaze catalog" items={tvmazeSeries.slice(0, 40)} />
          )}
          <MovieGrid title="All TV series" items={series} />
          {tvmazeSeries.length > 40 && (
            <MovieGrid
              title="More TVMaze series"
              subtitle="Episode lists from TVMaze when IMDb is sparse"
              items={tvmazeSeries.slice(40)}
            />
          )}
        </>
      )}
    </div>
  );
}
