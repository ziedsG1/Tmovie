import type { ImdbTitle } from "./imdb";

const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";

type TmdbItem = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
};

async function externalImdbId(
  kind: "movie" | "tv",
  id: number,
  apiKey: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${TMDB}/${kind}/${id}/external_ids?api_key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { imdb_id?: string | null };
    const raw = data.imdb_id;
    if (!raw) return null;
    return raw.startsWith("tt") ? raw : `tt${raw}`;
  } catch {
    return null;
  }
}

function toTitle(kind: "movie" | "tv", item: TmdbItem, imdbId: string): ImdbTitle {
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  return {
    id: imdbId,
    title: item.title || item.name || imdbId,
    plot: item.overview || "",
    poster: item.poster_path ? `${IMG}${item.poster_path}` : null,
    backdrop: item.backdrop_path
      ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
      : item.poster_path
        ? `${IMG}${item.poster_path}`
        : null,
    rating: item.vote_average ?? 0,
    voteCount: 0,
    year,
    type: kind === "tv" ? "tv" : "movie",
    genres: [],
    titleTypeLabel: "TMDB",
  };
}

async function fetchPopularPage(
  kind: "movie" | "tv",
  page: number,
  apiKey: string
): Promise<TmdbItem[]> {
  const res = await fetch(
    `${TMDB}/${kind}/popular?api_key=${encodeURIComponent(apiKey)}&page=${page}`,
    { signal: AbortSignal.timeout(15000) }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: TmdbItem[] };
  return data.results ?? [];
}

async function popularKind(kind: "movie" | "tv", apiKey: string, pages: number): Promise<ImdbTitle[]> {
  const out: ImdbTitle[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= pages; page++) {
    const batch = await fetchPopularPage(kind, page, apiKey);
    const settled = await Promise.all(
      batch.map(async (item) => {
        const imdbId = await externalImdbId(kind, item.id, apiKey);
        if (!imdbId || seen.has(imdbId)) return null;
        seen.add(imdbId);
        return toTitle(kind, item, imdbId);
      })
    );
    for (const t of settled) {
      if (t) out.push(t);
    }
  }

  return out;
}

/** TMDB popular lists (needs TMDB_API_KEY). */
export async function getTmdbDiscoverPool(): Promise<ImdbTitle[]> {
  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (!apiKey) return [];

  const [movies, series] = await Promise.all([
    popularKind("movie", apiKey, 3),
    popularKind("tv", apiKey, 3),
  ]);

  return [...movies, ...series];
}
