import type { ImdbTitle, MediaType } from "./imdb";

const CINEMETA = "https://v3-cinemeta.strem.io/catalog";

type CinemetaMeta = {
  id: string;
  type?: string;
  name?: string;
  poster?: string;
  background?: string;
  description?: string;
  releaseInfo?: string;
  imdbRating?: number | string;
  genres?: string[];
};

function mapMeta(meta: CinemetaMeta): ImdbTitle | null {
  if (!meta.id?.startsWith("tt")) return null;
  const type: MediaType = meta.type === "series" ? "tv" : "movie";
  const rating =
    typeof meta.imdbRating === "number"
      ? meta.imdbRating
      : parseFloat(String(meta.imdbRating ?? "")) || 0;

  return {
    id: meta.id,
    title: meta.name || meta.id,
    plot: meta.description || "",
    poster: meta.poster || null,
    backdrop: meta.background || meta.poster || null,
    rating,
    voteCount: 0,
    year: meta.releaseInfo?.slice(0, 4) || "",
    type,
    genres: meta.genres ?? [],
    titleTypeLabel: "Cinemeta",
  };
}

async function fetchCatalog(path: string): Promise<ImdbTitle[]> {
  try {
    const res = await fetch(`${CINEMETA}/${path}.json`, {
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { metas?: CinemetaMeta[] };
    const out: ImdbTitle[] = [];
    for (const meta of data.metas ?? []) {
      const title = mapMeta(meta);
      if (title) out.push(title);
    }
    return out;
  } catch {
    return [];
  }
}

/** Popular / highly rated titles from Stremio Cinemeta (IMDb ids). */
export async function getCinemetaCatalogPool(): Promise<ImdbTitle[]> {
  const lists = await Promise.all([
    fetchCatalog("movie/top"),
    fetchCatalog("movie/imdbRating"),
    fetchCatalog("movie/year"),
    fetchCatalog("series/top"),
    fetchCatalog("series/imdbRating"),
    fetchCatalog("series/year"),
  ]);
  return lists.flat();
}
