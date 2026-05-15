import type { ImdbTitle } from "./imdb";
import { checkPlayableBatch, checkPlayableBatchFast, type StreamCheckItem } from "./stream";

function toCheckItem(t: ImdbTitle): StreamCheckItem {
  return t.type === "tv"
    ? { imdbId: t.id, type: "series", season: 1, episode: 1 }
    : { imdbId: t.id, type: "movie" };
}

function resultKey(t: ImdbTitle): string {
  return t.type === "tv" ? `${t.id}:s1:e1` : t.id;
}

/** Search results — quick vaplayer-only check (keeps search snappy). */
export async function filterPlayableTitles(titles: ImdbTitle[]): Promise<ImdbTitle[]> {
  if (!titles.length) return [];

  const items = titles.map(toCheckItem);
  const results =
    titles.length <= 12
      ? await checkPlayableBatch(items, 16)
      : await checkPlayableBatchFast(items, 28);

  return titles.filter((t) => results[resultKey(t)]);
}
