import { resolveTmdbId } from "./tmdb-lookup";

/** @deprecated Use resolveTmdbId from ./tmdb-lookup */
export async function imdbToTmdb(
  imdbId: string,
  type: "movie" | "series"
): Promise<number | null> {
  return resolveTmdbId(imdbId, type);
}
