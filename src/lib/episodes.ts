import type { ImdbEpisode, ImdbSeason } from "./imdb";
import { getSeasonEpisodes as getImdbSeasonEpisodes, getSeasons as getImdbSeasons } from "./imdb";
import { getTvmazeSeasonEpisodes, getTvmazeSeasons } from "./tvmaze";

export type EpisodeSource = "imdb" | "imdb-all" | "tvmaze";

export interface SeasonEpisodesResult {
  episodes: ImdbEpisode[];
  source: EpisodeSource | null;
  sourcesTried: EpisodeSource[];
}

/** Merge seasons from IMDb + TVMaze (unique by season number) */
export async function getSeasonsMulti(imdbId: string): Promise<ImdbSeason[]> {
  const [imdb, tvmaze] = await Promise.all([
    getImdbSeasons(imdbId).catch(() => []),
    getTvmazeSeasons(imdbId).catch(() => []),
  ]);

  const map = new Map<number, ImdbSeason>();
  for (const s of [...imdb, ...tvmaze]) {
    if (!map.has(s.season)) map.set(s.season, s);
  }
  return Array.from(map.values()).sort((a, b) => a.season - b.season);
}

async function getImdbSeasonEpisodesUnfiltered(
  seriesId: string,
  season: number
): Promise<ImdbEpisode[]> {
  const IMDB_GQL = "https://api.graphql.imdb.com/";
  const all: ImdbEpisode[] = [];
  let after: string | undefined;
  let hasNext = true;

  const fields = `
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

  while (hasNext) {
    const query = after
      ? `query($id:ID!,$first:Int!,$after:ID!){title(id:$id){episodes{episodes(first:$first,after:$after){pageInfo{hasNextPage endCursor}edges{node{${fields}}}}}}}`
      : `query($id:ID!,$first:Int!){title(id:$id){episodes{episodes(first:$first){pageInfo{hasNextPage endCursor}edges{node{${fields}}}}}}}`;

    const variables: Record<string, unknown> = { id: seriesId, first: 50 };
    if (after) variables.after = after;

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

    const json = (await res.json()) as {
      data?: {
        title?: {
          episodes?: {
            episodes?: {
              pageInfo: { hasNextPage: boolean; endCursor: string | null };
              edges: { node: Record<string, unknown> }[];
            };
          };
        };
      };
    };

    const conn = json.data?.title?.episodes?.episodes;
    if (!conn) break;

    for (const edge of conn.edges) {
      const n = edge.node as {
        id: string;
        titleText?: { text: string };
        plot?: { plotText?: { plainText: string } };
        primaryImage?: { url: string };
        series?: {
          episodeNumber?: { episodeNumber: number };
          displayableEpisodeNumber?: {
            displayableSeason?: { season: string };
            episodeNumber?: string;
          };
        };
      };

      const seasonStr = n.series?.displayableEpisodeNumber?.displayableSeason?.season;
      const epSeason = seasonStr ? parseInt(seasonStr, 10) : NaN;
      if (epSeason !== season) continue;

      const epNum =
        n.series?.episodeNumber?.episodeNumber ??
        parseInt(n.series?.displayableEpisodeNumber?.episodeNumber || "0", 10);

      all.push({
        id: n.id,
        title: n.titleText?.text || `Episode ${epNum}`,
        plot: n.plot?.plotText?.plainText || "",
        poster: n.primaryImage?.url || null,
        season,
        episode: epNum,
      });
    }

    hasNext = conn.pageInfo.hasNextPage;
    after = conn.pageInfo.endCursor ?? undefined;
    if (hasNext && !after) break;
  }

  return all.sort((a, b) => a.episode - b.episode);
}

/** Try IMDb (filtered) → IMDb (all pages) → TVMaze */
export async function getSeasonEpisodesMulti(
  imdbId: string,
  season: number
): Promise<SeasonEpisodesResult> {
  const sourcesTried: EpisodeSource[] = [];

  sourcesTried.push("imdb");
  let episodes = await getImdbSeasonEpisodes(imdbId, season).catch(() => []);
  if (episodes.length > 0) {
    return { episodes, source: "imdb", sourcesTried };
  }

  sourcesTried.push("imdb-all");
  episodes = await getImdbSeasonEpisodesUnfiltered(imdbId, season).catch(() => []);
  if (episodes.length > 0) {
    return { episodes, source: "imdb-all", sourcesTried };
  }

  sourcesTried.push("tvmaze");
  episodes = await getTvmazeSeasonEpisodes(imdbId, season).catch(() => []);
  if (episodes.length > 0) {
    return { episodes, source: "tvmaze", sourcesTried };
  }

  return { episodes: [], source: null, sourcesTried };
}
