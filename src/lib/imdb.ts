const IMDB_GQL = "https://api.graphql.imdb.com/";

export type MediaType = "movie" | "tv";

export interface ImdbTitle {
  id: string;
  title: string;
  plot: string;
  poster: string | null;
  backdrop: string | null;
  rating: number;
  voteCount: number;
  year: string;
  type: MediaType;
  genres: string[];
  runtimeMinutes?: number;
  titleTypeLabel?: string;
}

export interface ImdbSeason {
  season: number;
  label: string;
}

export interface ImdbEpisode {
  id: string;
  title: string;
  plot: string;
  poster: string | null;
  season: number;
  episode: number;
}

const LIST_FIELDS = `
  id
  titleText { text }
  titleType { id text }
  primaryImage { url }
  ratingsSummary { aggregateRating voteCount }
  releaseYear { year }
  plot { plotText { plainText } }
  runtime { seconds }
`;

const DETAIL_FIELDS = `
  id
  titleText { text }
  titleType { id text }
  primaryImage { url width height }
  plot { plotText { plainText } }
  ratingsSummary { aggregateRating voteCount }
  releaseYear { year }
  runtime { seconds }
  titleGenres { genres { genre { text } } }
`;

function titleTypeToMedia(typeId: string | undefined): MediaType {
  if (!typeId) return "movie";
  const tvTypes = ["tvSeries", "tvMiniSeries", "tvSpecial", "tvMovie"];
  return tvTypes.includes(typeId) ? "tv" : "movie";
}

function mapListNode(node: GqlTitleNode): ImdbTitle {
  return mapTitleNode(node, true);
}

function mapTitleNode(node: GqlTitleNode, list = false): ImdbTitle {
  const seconds = node.runtime?.seconds;
  return {
    id: node.id,
    title: node.titleText?.text || "Untitled",
    plot: node.plot?.plotText?.plainText || "",
    poster: node.primaryImage?.url || null,
    backdrop: node.primaryImage?.url || null,
    rating: node.ratingsSummary?.aggregateRating ?? 0,
    voteCount: node.ratingsSummary?.voteCount ?? 0,
    year: node.releaseYear?.year ? String(node.releaseYear.year) : "",
    type: titleTypeToMedia(node.titleType?.id),
    genres: node.titleGenres?.genres?.map((g) => g.genre?.text).filter(Boolean) as string[] || [],
    runtimeMinutes: seconds ? Math.round(seconds / 60) : undefined,
    titleTypeLabel: node.titleType?.text,
  };
}

interface GqlTitleNode {
  id: string;
  titleText?: { text: string };
  titleType?: { id: string; text?: string };
  primaryImage?: { url: string; width?: number; height?: number };
  plot?: { plotText?: { plainText: string } };
  ratingsSummary?: { aggregateRating: number; voteCount: number };
  releaseYear?: { year: number };
  runtime?: { seconds: number };
  titleGenres?: { genres: { genre?: { text: string } }[] };
}

async function imdbGql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(IMDB_GQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-imdb-client-name": "IMDbWebApp",
      "x-imdb-user-language": "en-US",
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 3600 },
  });

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }
  if (!json.data) throw new Error("IMDb API returned no data");
  return json.data;
}

export function displayTitle(item: Pick<ImdbTitle, "title">): string {
  return item.title;
}

export function displayYear(item: Pick<ImdbTitle, "year">): string {
  return item.year;
}

export function posterUrl(url: string | null): string | null {
  return url;
}

export function backdropUrl(url: string | null): string | null {
  return url;
}

export async function getMostPopular(limit = 20): Promise<ImdbTitle[]> {
  const data = await imdbGql<{
    topMeterTitles: { edges: { node: GqlTitleNode }[] };
  }>(`
    query ($first: Int!) {
      topMeterTitles(first: $first) {
        edges { node { ${LIST_FIELDS} } }
      }
    }
  `, { first: limit });

  return data.topMeterTitles.edges.map((e) => mapListNode(e.node));
}

export async function getPopularMovies(limit = 20): Promise<ImdbTitle[]> {
  const all = await getMostPopular(Math.max(limit * 2, 30));
  return all.filter((t) => t.type === "movie").slice(0, limit);
}

export async function getPopularTv(limit = 20): Promise<ImdbTitle[]> {
  const all = await getMostPopular(Math.max(limit * 2, 30));
  return all.filter((t) => t.type === "tv").slice(0, limit);
}

export async function searchTitles(query: string, limit = 48): Promise<ImdbTitle[]> {
  const data = await imdbGql<{
    mainSearch: {
      edges: { node: { entity: GqlTitleNode | null } }[];
    };
  }>(`
    query ($q: String!, $first: Int!) {
      mainSearch(first: $first, options: { searchTerm: $q, type: TITLE, includeAdult: false }) {
        edges {
          node {
            entity {
              ... on Title {
                ${LIST_FIELDS}
              }
            }
          }
        }
      }
    }
  `, { q: query, first: limit });

  return data.mainSearch.edges
    .map((e) => e.node.entity)
    .filter((e): e is GqlTitleNode => !!e?.id)
    .filter((e) => {
      const id = e.titleType?.id;
      return id === "movie" || id === "tvSeries" || id === "tvMiniSeries";
    })
    .map((e) => mapListNode(e));
}

export async function getTitle(imdbId: string): Promise<ImdbTitle | null> {
  if (!imdbId.startsWith("tt")) return null;

  const data = await imdbGql<{ title: GqlTitleNode | null }>(`
    query ($id: ID!) {
      title(id: $id) {
        ${DETAIL_FIELDS}
      }
    }
  `, { id: imdbId });

  if (!data.title) return null;
  return mapTitleNode(data.title);
}

export async function getSeasons(seriesId: string): Promise<ImdbSeason[]> {
  const data = await imdbGql<{
    title: {
      episodes: {
        displayableSeasons: {
          edges: { node: { season: string; text: string } }[];
        };
      } | null;
    } | null;
  }>(`
    query ($id: ID!) {
      title(id: $id) {
        episodes {
          displayableSeasons(first: 50) {
            edges {
              node { season text }
            }
          }
        }
      }
    }
  `, { id: seriesId });

  const edges = data.title?.episodes?.displayableSeasons?.edges || [];
  return edges
    .map((e) => ({
      season: parseInt(e.node.season, 10),
      label: e.node.text || e.node.season,
    }))
    .filter((s) => !Number.isNaN(s.season) && s.season > 0);
}

function mapEpisodeNode(
  n: GqlTitleNode & {
    series?: {
      episodeNumber?: { episodeNumber: number };
      displayableEpisodeNumber?: {
        displayableSeason?: { season: string };
        episodeNumber?: string;
      };
    };
  },
  fallbackSeason: number
): ImdbEpisode {
  const epNum =
    n.series?.episodeNumber?.episodeNumber ??
    parseInt(n.series?.displayableEpisodeNumber?.episodeNumber || "0", 10);
  const seasonNum = parseInt(
    n.series?.displayableEpisodeNumber?.displayableSeason?.season || String(fallbackSeason),
    10
  );

  return {
    id: n.id,
    title: n.titleText?.text || `Episode ${epNum}`,
    plot: n.plot?.plotText?.plainText || "",
    poster: n.primaryImage?.url || null,
    season: seasonNum,
    episode: epNum,
  };
}

type GqlEpisodePage = {
  title: {
    episodes: {
      episodes: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        edges: {
          node: GqlTitleNode & {
            series?: {
              episodeNumber?: { episodeNumber: number };
              displayableEpisodeNumber?: {
                displayableSeason?: { season: string };
                episodeNumber?: string;
              };
            };
          };
        }[];
      };
    };
  } | null;
};

const EPISODE_NODE_FIELDS = `
  id
  titleText { text }
  plot { plotText { plainText } }
  primaryImage { url }
  series {
    episodeNumber { episodeNumber }
    displayableEpisodeNumber {
      displayableSeason { season }
      episodeNumber
    }
  }
`;

async function fetchEpisodePage(
  seriesId: string,
  season: number,
  after?: string
): Promise<GqlEpisodePage> {
  if (after) {
    return imdbGql<GqlEpisodePage>(
      `
      query ($id: ID!, $first: Int!, $season: String!, $after: ID!) {
        title(id: $id) {
          episodes {
            episodes(first: $first, after: $after, filter: { includeSeasons: [$season] }) {
              pageInfo { hasNextPage endCursor }
              edges { node { ${EPISODE_NODE_FIELDS} } }
            }
          }
        }
      }
    `,
      { id: seriesId, first: 25, season: String(season), after }
    );
  }

  return imdbGql<GqlEpisodePage>(
    `
    query ($id: ID!, $first: Int!, $season: String!) {
      title(id: $id) {
        episodes {
          episodes(first: $first, filter: { includeSeasons: [$season] }) {
            pageInfo { hasNextPage endCursor }
            edges { node { ${EPISODE_NODE_FIELDS} } }
          }
        }
      }
    }
  `,
    { id: seriesId, first: 25, season: String(season) }
  );
}

export async function getSeasonEpisodes(seriesId: string, season: number): Promise<ImdbEpisode[]> {
  const all: ImdbEpisode[] = [];
  let after: string | undefined;
  let hasNext = true;

  while (hasNext) {
    const page = await fetchEpisodePage(seriesId, season, after);
    const conn = page.title?.episodes?.episodes;
    if (!conn) break;

    for (const edge of conn.edges) {
      all.push(mapEpisodeNode(edge.node, season));
    }

    hasNext = conn.pageInfo.hasNextPage;
    after = conn.pageInfo.endCursor ?? undefined;
    if (hasNext && !after) break;
  }

  return all.sort((a, b) => a.episode - b.episode);
}

export async function getChartPool(limit = 100): Promise<ImdbTitle[]> {
  const data = await imdbGql<{
    topMeterTitles: { edges: { node: GqlTitleNode }[] };
  }>(`
    query ($first: Int!) {
      topMeterTitles(first: $first) {
        edges { node { ${LIST_FIELDS} } }
      }
    }
  `, { first: Math.min(limit, 250) });

  return data.topMeterTitles.edges.map((e) => mapListNode(e.node));
}

export function dedupeTitles(items: ImdbTitle[]): ImdbTitle[] {
  const seen = new Set<string>();
  const out: ImdbTitle[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

/** IMDb “popular titles” feed (up to ~100). */
export async function getPopularTitlesFeed(limit = 100): Promise<ImdbTitle[]> {
  const data = await imdbGql<{
    popularTitles: { titles: GqlTitleNode[] };
  }>(`
    query ($limit: Int!) {
      popularTitles(limit: $limit) {
        titles { ${LIST_FIELDS} }
      }
    }
  `, { limit: Math.min(limit, 100) });

  return data.popularTitles.titles
    .filter((n) => n?.id)
    .map((n) => mapListNode(n))
    .filter((t) => t.type === "movie" || t.type === "tv");
}

type AdvancedSortBy = "POPULARITY" | "USER_RATING" | "RELEASE_DATE";
type AdvancedSortOrder = "ASC" | "DESC";

type AdvancedSearchPage = {
  advancedTitleSearch: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    edges: { node: { title: GqlTitleNode | null } }[];
  };
};

/** Paginated IMDb advanced search (movies or TV). */
export async function getAdvancedTitles(
  titleTypeIds: string[],
  limit: number,
  sortBy: AdvancedSortBy = "POPULARITY",
  sortOrder: AdvancedSortOrder = "DESC"
): Promise<ImdbTitle[]> {
  const all: ImdbTitle[] = [];
  let after: string | undefined;
  const maxPages = Math.ceil(limit / 100) + 2;

  for (let page = 0; page < maxPages && all.length < limit; page++) {
    const first = Math.min(100, limit - all.length);
    const vars: Record<string, unknown> = {
      first,
      types: titleTypeIds,
      sortBy,
      sortOrder,
    };
    if (after) vars.after = after;

    const query = after
      ? `
      query ($first: Int!, $after: String!, $types: [String!]!, $sortBy: AdvancedTitleSearchSortBy!, $sortOrder: SortOrder!) {
        advancedTitleSearch(
          first: $first
          after: $after
          constraints: { titleTypeConstraint: { anyTitleTypeIds: $types } }
          sort: { sortBy: $sortBy, sortOrder: $sortOrder }
        ) {
          pageInfo { hasNextPage endCursor }
          edges { node { title { ${LIST_FIELDS} } } }
        }
      }
    `
      : `
      query ($first: Int!, $types: [String!]!, $sortBy: AdvancedTitleSearchSortBy!, $sortOrder: SortOrder!) {
        advancedTitleSearch(
          first: $first
          constraints: { titleTypeConstraint: { anyTitleTypeIds: $types } }
          sort: { sortBy: $sortBy, sortOrder: $sortOrder }
        ) {
          pageInfo { hasNextPage endCursor }
          edges { node { title { ${LIST_FIELDS} } } }
        }
      }
    `;

    const data = await imdbGql<AdvancedSearchPage>(query, vars);
    const conn = data.advancedTitleSearch;

    for (const edge of conn.edges) {
      const node = edge.node.title;
      if (node?.id) all.push(mapListNode(node));
    }

    if (!conn.pageInfo.hasNextPage || !conn.pageInfo.endCursor) break;
    after = conn.pageInfo.endCursor;
  }

  return all.slice(0, limit);
}

const MOVIE_TYPES = ["movie"];
const TV_TYPES = ["tvSeries", "tvMiniSeries", "tvMovie", "tvSpecial"];

export async function buildMoviesCatalog(): Promise<ImdbTitle[]> {
  const [meter, popular] = await Promise.all([getChartPool(400), getPopularTitlesFeed(200)]);
  const byPopularity = await getAdvancedTitles(MOVIE_TYPES, 350, "POPULARITY", "DESC");
  const byRating = await getAdvancedTitles(MOVIE_TYPES, 250, "USER_RATING", "DESC");
  const byRelease = await getAdvancedTitles(MOVIE_TYPES, 200, "RELEASE_DATE", "DESC");

  return dedupeTitles([
    ...meter.filter((t) => t.type === "movie"),
    ...popular.filter((t) => t.type === "movie"),
    ...byPopularity,
    ...byRating,
    ...byRelease,
  ]);
}

export async function buildSeriesCatalog(): Promise<ImdbTitle[]> {
  const [meter, popular] = await Promise.all([getChartPool(400), getPopularTitlesFeed(200)]);
  const byPopularity = await getAdvancedTitles(TV_TYPES, 350, "POPULARITY", "DESC");
  const byRating = await getAdvancedTitles(TV_TYPES, 250, "USER_RATING", "DESC");
  const byRelease = await getAdvancedTitles(TV_TYPES, 200, "RELEASE_DATE", "DESC");

  return dedupeTitles([
    ...meter.filter((t) => t.type === "tv"),
    ...popular.filter((t) => t.type === "tv"),
    ...byPopularity,
    ...byRating,
    ...byRelease,
  ]);
}

export async function buildFullCatalog(): Promise<{
  all: ImdbTitle[];
  movies: ImdbTitle[];
  series: ImdbTitle[];
  topRatedMovies: ImdbTitle[];
  topRatedSeries: ImdbTitle[];
}> {
  const [movies, series, topRatedMovies, topRatedSeries] = await Promise.all([
    buildMoviesCatalog(),
    buildSeriesCatalog(),
    getAdvancedTitles(MOVIE_TYPES, 120, "USER_RATING", "DESC"),
    getAdvancedTitles(TV_TYPES, 120, "USER_RATING", "DESC"),
  ]);

  return {
    all: dedupeTitles([...movies, ...series]),
    movies,
    series,
    topRatedMovies: dedupeTitles(topRatedMovies),
    topRatedSeries: dedupeTitles(topRatedSeries),
  };
}

// Aliases for pages that used TMDB naming
export const getTrending = getMostPopular;
export const getPopular = getPopularMovies;
export type TmdbItem = ImdbTitle;
export type TmdbDetails = ImdbTitle;
export type TmdbEpisode = ImdbEpisode;

export function extractImdbId(details: { id: string }): string {
  return details.id;
}

export async function findByImdbId(imdbId: string): Promise<{ type: MediaType; id: string } | null> {
  const title = await getTitle(imdbId);
  if (!title) return null;
  return { type: title.type, id: title.id };
}
