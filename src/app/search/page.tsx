import { MovieCard } from "@/components/MovieCard";
import { searchTitles } from "@/lib/imdb";
import { filterPlayableTitles } from "@/lib/playable";

export const metadata = { title: "Search — Tmovies" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim() || "";
  let results: Awaited<ReturnType<typeof searchTitles>> = [];
  let error = false;

  if (q) {
    try {
      results = await filterPlayableTitles(await searchTitles(q));
    } catch {
      error = true;
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 font-display text-4xl text-white">
        {q ? `Results for “${q}”` : "Search"}
      </h1>

      {!q && <p className="text-gray-400">Enter a title in the search bar above.</p>}
      {error && <p className="text-amber-300">Could not search IMDb. Try again later.</p>}

      {q && !error && results.length === 0 && (
        <p className="text-gray-400">No results found on IMDb.</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {results.map((item) => (
          <MovieCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
