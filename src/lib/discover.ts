import { unstable_cache } from "next/cache";
import {
  dedupeTitles,
  getChartPool,
  getPopularTitlesFeed,
  getAdvancedTitles,
  type ImdbTitle,
} from "./imdb";
import { getCinemetaCatalogPool } from "./cinemeta-catalog";
import { getTmdbDiscoverPool } from "./tmdb-discover";
import { getTvmazeSeriesCatalog, isTvmazeCatalogTitle } from "./tvmaze";

export type DiscoverCatalog = {
  all: ImdbTitle[];
  movies: ImdbTitle[];
  series: ImdbTitle[];
  topRatedMovies: ImdbTitle[];
  topRatedSeries: ImdbTitle[];
  tvmazeSeries: ImdbTitle[];
};

const MOVIE_TYPES = ["movie"];
const TV_TYPES = ["tvSeries", "tvMiniSeries", "tvMovie", "tvSpecial"];

async function loadTvmazeTitles(): Promise<ImdbTitle[]> {
  try {
    return await getTvmazeSeriesCatalog();
  } catch {
    return [];
  }
}

async function loadCinemetaTitles(): Promise<ImdbTitle[]> {
  try {
    return await getCinemetaCatalogPool();
  } catch {
    return [];
  }
}

async function loadTmdbTitles(): Promise<ImdbTitle[]> {
  try {
    return await getTmdbDiscoverPool();
  } catch {
    return [];
  }
}

function toDiscoverCatalog(pool: ImdbTitle[], topMovies: ImdbTitle[], topSeries: ImdbTitle[]): DiscoverCatalog {
  const movies = dedupeTitles([
    ...pool.filter((t) => t.type === "movie"),
    ...topMovies,
  ]);
  const series = dedupeTitles([
    ...pool.filter((t) => t.type === "tv"),
    ...topSeries,
  ]);

  return {
    movies,
    series,
    all: dedupeTitles([...movies, ...series]),
    topRatedMovies: dedupeTitles(topMovies).slice(0, 60),
    topRatedSeries: dedupeTitles(topSeries).slice(0, 60),
    tvmazeSeries: series.filter(isTvmazeCatalogTitle),
  };
}

/** Faster catalog build — chart/popular + curated lists (no heavy full IMDb crawl). */
async function buildRawCatalog(): Promise<DiscoverCatalog> {
  const [chartPopular, topMovies, topSeries, cinemeta, tmdb, tvmaze] = await Promise.all([
    Promise.all([getChartPool(280), getPopularTitlesFeed(120)]).then(([chart, popular]) =>
      dedupeTitles([...chart, ...popular])
    ),
    getAdvancedTitles(MOVIE_TYPES, 60, "USER_RATING", "DESC"),
    getAdvancedTitles(TV_TYPES, 60, "USER_RATING", "DESC"),
    loadCinemetaTitles(),
    loadTmdbTitles(),
    loadTvmazeTitles(),
  ]);

  const pool = dedupeTitles([...chartPopular, ...cinemeta, ...tmdb, ...tvmaze]);
  return toDiscoverCatalog(pool, topMovies, topSeries);
}

async function fallbackCatalog(): Promise<DiscoverCatalog> {
  const [meter, popular, cinemeta] = await Promise.all([
    getChartPool(200),
    getPopularTitlesFeed(100),
    loadCinemetaTitles(),
  ]);
  const pool = dedupeTitles([...meter, ...popular, ...cinemeta]);
  const movies = pool.filter((t) => t.type === "movie");
  const series = pool.filter((t) => t.type === "tv");
  return {
    all: pool,
    movies,
    series,
    topRatedMovies: movies.slice(0, 40),
    topRatedSeries: series.slice(0, 40),
    tvmazeSeries: [],
  };
}

async function loadCatalog(): Promise<DiscoverCatalog> {
  try {
    return await buildRawCatalog();
  } catch {
    return fallbackCatalog();
  }
}

/** Browse catalog — metadata only, no stream probes (loads in seconds, not minutes). */
export const getRawDiscoverCatalog = unstable_cache(
  () => loadCatalog(),
  ["discover-browse-v8"],
  { revalidate: 3600 }
);

/** @deprecated Alias — browse no longer blocks on stream checks. */
export const getDiscoverCatalog = getRawDiscoverCatalog;

export async function getDiscoverMovies(): Promise<ImdbTitle[]> {
  const catalog = await getRawDiscoverCatalog();
  return catalog.movies;
}

export async function getDiscoverSeries(): Promise<ImdbTitle[]> {
  const catalog = await getRawDiscoverCatalog();
  return catalog.series;
}
