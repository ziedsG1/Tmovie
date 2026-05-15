import { LruCache } from "./lru-cache";

const CINEMETA_ENDPOINTS = [
  "https://v3-cinemeta.strem.io/meta",
  "https://cinemeta-live.strem.io/meta",
];

const tmdbIdCache = new LruCache<string, number | null>(2000);

export async function resolveTmdbId(
  imdbId: string,
  type: "movie" | "series"
): Promise<number | null> {
  const cacheKey = `${imdbId}:${type}`;
  const hit = tmdbIdCache.get(cacheKey);
  if (hit !== undefined) return hit;

  const kind = type === "series" ? "series" : "movie";

  for (const base of CINEMETA_ENDPOINTS) {
    const id = await fetchCinemetaTmdb(`${base}/${kind}/${imdbId}.json`);
    if (id) {
      tmdbIdCache.set(cacheKey, id);
      return id;
    }
  }

  const wiki = await fetchWikidataTmdb(imdbId);
  if (wiki) {
    tmdbIdCache.set(cacheKey, wiki);
    return wiki;
  }

  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (apiKey) {
    const api = await fetchTmdbFind(imdbId, apiKey);
    if (api) {
      tmdbIdCache.set(cacheKey, api);
      return api;
    }
  }

  tmdbIdCache.set(cacheKey, null);
  return null;
}

async function fetchCinemetaTmdb(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { meta?: { moviedb_id?: number | string } };
    return parseTmdb(data?.meta?.moviedb_id);
  } catch {
    return null;
  }
}

async function fetchWikidataTmdb(imdbId: string): Promise<number | null> {
  const sparql = `
SELECT ?tmdb WHERE {
  ?item wdt:P345 "${imdbId}" .
  { ?item wdt:P4947 ?tmdb . } UNION { ?item wdt:P4983 ?tmdb . }
}
LIMIT 1`;
  try {
    const res = await fetch(
      `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`,
      {
        signal: AbortSignal.timeout(12000),
        headers: {
          Accept: "application/sparql-results+json",
          "User-Agent": "Tmovies/1.0 (https://github.com/tmovies)",
        },
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: { bindings?: { tmdb?: { value?: string } }[] };
    };
    const raw = data.results?.bindings?.[0]?.tmdb?.value;
    if (!raw) return null;
    const n = parseInt(raw.replace(/^.*\//, ""), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

async function fetchTmdbFind(imdbId: string, apiKey: string): Promise<number | null> {
  try {
    const params = new URLSearchParams({
      external_source: "imdb_id",
      api_key: apiKey,
    });
    const res = await fetch(
      `https://api.themoviedb.org/3/find/${imdbId}?${params}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      movie_results?: { id?: number }[];
      tv_results?: { id?: number }[];
    };
    const movie = data.movie_results?.[0]?.id;
    const tv = data.tv_results?.[0]?.id;
    return parseTmdb(movie ?? tv);
  } catch {
    return null;
  }
}

function parseTmdb(raw: number | string | undefined | null): number | null {
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
