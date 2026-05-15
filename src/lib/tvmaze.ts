import type { ImdbEpisode, ImdbSeason, ImdbTitle } from "./imdb";

const TVMAZE = "https://api.tvmaze.com";
const UA = "Tmovies/1.0";
const MAX_PAGES = 10;
const PAGE_TIMEOUT_MS = 8000;
const PAGE_BATCH = 4;

export interface TvmazeShow {
  id: number;
  name: string;
  type?: string;
  language?: string;
  genres?: string[];
  status?: string;
  runtime?: number | null;
  premiered?: string | null;
  officialSite?: string | null;
  rating?: { average?: number | null };
  weight?: number;
  image?: { medium?: string; original?: string } | null;
  summary?: string | null;
  externals?: { imdb?: string | null; thetvdb?: number | null };
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, "").trim();
}

export function normalizeTvmazeImdbId(imdb: string | null | undefined): string | null {
  if (!imdb) return null;
  const s = String(imdb).trim();
  if (/^tt\d+$/i.test(s)) return s.toLowerCase();
  if (/^\d+$/.test(s)) return `tt${s}`;
  return null;
}

export function tvmazeShowToTitle(show: TvmazeShow): ImdbTitle | null {
  const id = normalizeTvmazeImdbId(show.externals?.imdb ?? undefined);
  if (!id) return null;

  return {
    id,
    title: show.name || "Untitled",
    plot: stripHtml(show.summary),
    poster: show.image?.medium || show.image?.original || null,
    backdrop: show.image?.original || show.image?.medium || null,
    rating: show.rating?.average ?? 0,
    voteCount: 0,
    year: show.premiered ? String(show.premiered).slice(0, 4) : "",
    type: "tv",
    genres: show.genres ?? [],
    runtimeMinutes: show.runtime ?? undefined,
    titleTypeLabel: "TVMaze",
  };
}

async function fetchTvmazePage(page: number): Promise<TvmazeShow[] | null> {
  try {
    const res = await fetch(`${TVMAZE}/shows?page=${page}`, {
      headers: { Accept: "application/json", "User-Agent": UA },
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const shows = (await res.json()) as TvmazeShow[];
    return Array.isArray(shows) && shows.length > 0 ? shows : null;
  } catch {
    return null;
  }
}

/** Paginated TVMaze /shows — parallel pages, IMDb ids only. */
export async function getTvmazeSeriesCatalog(): Promise<ImdbTitle[]> {
  const byId = new Map<string, ImdbTitle>();

  for (let start = 0; start < MAX_PAGES; start += PAGE_BATCH) {
    const pages = Array.from({ length: Math.min(PAGE_BATCH, MAX_PAGES - start) }, (_, i) => start + i);
    const batches = await Promise.all(pages.map((p) => fetchTvmazePage(p)));
    let empty = false;

    for (const shows of batches) {
      if (!shows) {
        empty = true;
        continue;
      }
      for (const show of shows) {
        const title = tvmazeShowToTitle(show);
        if (title) byId.set(title.id, title);
      }
      if (shows.length < 250) empty = true;
    }

    if (empty) break;
  }

  return Array.from(byId.values()).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
}

export async function lookupShowByImdb(imdbId: string): Promise<TvmazeShow | null> {
  try {
    const res = await fetch(`${TVMAZE}/lookup/shows?imdb=${imdbId}`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    return (await res.json()) as TvmazeShow;
  } catch {
    return null;
  }
}

export async function getTvmazeSeasons(imdbId: string): Promise<ImdbSeason[]> {
  const show = await lookupShowByImdb(imdbId);
  if (!show) return [];

  try {
    const res = await fetch(`${TVMAZE}/shows/${show.id}/seasons`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const seasons = (await res.json()) as { number: number; name?: string }[];
    return seasons
      .filter((s) => s.number > 0)
      .map((s) => ({
        season: s.number,
        label: s.name || String(s.number),
      }))
      .sort((a, b) => a.season - b.season);
  } catch {
    return [];
  }
}

export async function getTvmazeSeasonEpisodes(
  imdbId: string,
  season: number
): Promise<ImdbEpisode[]> {
  const show = await lookupShowByImdb(imdbId);
  if (!show) return [];

  try {
    const res = await fetch(`${TVMAZE}/shows/${show.id}/episodes`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];

    const all = (await res.json()) as {
      id: number;
      name: string;
      season: number;
      number: number;
      summary?: string | null;
      image?: { medium?: string; original?: string } | null;
      externals?: { imdb?: string };
    }[];

    return all
      .filter((ep) => ep.season === season && ep.number != null)
      .map((ep) => ({
        id: ep.externals?.imdb
          ? normalizeTvmazeImdbId(ep.externals.imdb) ||
            `tvmaze-${show.id}-s${season}e${ep.number}`
          : `tvmaze-${show.id}-s${season}e${ep.number}`,
        title: ep.name || `Episode ${ep.number}`,
        plot: stripHtml(ep.summary),
        poster: ep.image?.medium || ep.image?.original || show.image?.medium || null,
        season: ep.season,
        episode: ep.number,
      }))
      .sort((a, b) => a.episode - b.episode);
  } catch {
    return [];
  }
}

export function isTvmazeCatalogTitle(item: ImdbTitle): boolean {
  return item.titleTypeLabel === "TVMaze";
}
