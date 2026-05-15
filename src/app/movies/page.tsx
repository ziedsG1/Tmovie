import { MovieGrid } from "@/components/MovieGrid";
import { MovieRow } from "@/components/MovieRow";
import { getDiscoverCatalog } from "@/lib/discover";

export const metadata = { title: "Movies — Tmovies" };
export const dynamic = "force-dynamic";

export default async function MoviesPage() {
  let movies: Awaited<ReturnType<typeof getDiscoverCatalog>>["movies"] = [];
  let newReleases: Awaited<ReturnType<typeof getDiscoverCatalog>>["topRatedMovies"] = [];
  let error = false;

  try {
    const catalog = await getDiscoverCatalog();
    movies = catalog.movies;
    newReleases = catalog.topRatedMovies.slice(0, 48);
  } catch {
    error = true;
  }

  return (
    <div className="py-8">
      <h1 className="mb-2 px-4 font-display text-4xl text-white sm:px-6">Movies</h1>
      <p className="mb-8 px-4 text-sm text-gray-400 sm:px-6">
        {error
          ? "Could not load the movie catalog from IMDb."
          : `${movies.length.toLocaleString()} movies in catalog.`}
      </p>

      {!error && (
        <>
          <MovieRow title="New releases" items={newReleases} />
          <MovieGrid title="All movies" items={movies} />
        </>
      )}
    </div>
  );
}
