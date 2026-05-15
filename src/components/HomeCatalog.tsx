import { Hero } from "@/components/Hero";
import { MovieGrid } from "@/components/MovieGrid";
import { MovieRow } from "@/components/MovieRow";
import { getDiscoverCatalog } from "@/lib/discover";

export async function HomeCatalog() {
  let catalog: Awaited<ReturnType<typeof getDiscoverCatalog>> | null = null;
  let apiError = false;

  try {
    catalog = await getDiscoverCatalog();
    if (!catalog?.all?.length) apiError = true;
  } catch {
    apiError = true;
  }

  const featured = catalog?.all[0];

  return (
    <>
      {apiError && (
        <div className="mx-4 mt-4 rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200 sm:mx-6">
          Could not reach IMDb. Check your network connection.
        </div>
      )}

      {featured ? <Hero item={featured} /> : null}

      <p className="mb-6 px-4 text-sm text-gray-400 sm:px-6">
        {catalog
          ? `${catalog.all.length.toLocaleString()} titles with streams available (PlayIMDb or VidSrc).`
          : "Browse movies and series from IMDb."}
      </p>

      {catalog ? (
        <>
          <MovieRow title="Trending now" items={catalog.all.slice(0, 60)} />
          <MovieRow title="Top rated movies" items={catalog.topRatedMovies.slice(0, 40)} />
          <MovieRow title="Top rated series" items={catalog.topRatedSeries.slice(0, 40)} />
          <MovieGrid
            title="Movies"
            subtitle={`${catalog.movies.length} movies`}
            items={catalog.movies}
          />
          <MovieGrid
            title="TV series"
            subtitle={`${catalog.series.length} series`}
            items={catalog.series}
          />
          {catalog.tvmazeSeries.length > 0 ? (
            <MovieRow
              title="TV series (TVMaze catalog)"
              items={catalog.tvmazeSeries.slice(0, 50)}
            />
          ) : null}
        </>
      ) : null}
    </>
  );
}
