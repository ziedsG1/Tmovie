import { unstable_cache } from "next/cache";
import { getChartPool, type ImdbTitle, type MediaType } from "./imdb";
import { filterPlayableTitles } from "./playable";
import { isPlayableStream } from "./stream";

async function buildPlayableCatalog(limit: number): Promise<ImdbTitle[]> {
  const pool = await getChartPool(limit);
  return filterPlayableTitles(pool);
}

export const getPlayableCatalog = unstable_cache(
  () => buildPlayableCatalog(120),
  ["playable-catalog-v3"],
  { revalidate: 3600 }
);

export async function getPlayableMovies(limit = 40): Promise<ImdbTitle[]> {
  const all = await getPlayableCatalog();
  return all.filter((t) => t.type === "movie").slice(0, limit);
}

export async function getPlayableTv(limit = 40): Promise<ImdbTitle[]> {
  const all = await getPlayableCatalog();
  return all.filter((t) => t.type === "tv").slice(0, limit);
}

export async function isSeriesPlayable(imdbId: string): Promise<boolean> {
  return isPlayableStream({ imdbId, type: "series", season: 1, episode: 1 });
}

export async function isMoviePlayable(imdbId: string): Promise<boolean> {
  return isPlayableStream({ imdbId, type: "movie" });
}

export { filterPlayableTitles, type MediaType };
