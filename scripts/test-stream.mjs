const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const API = "https://streamdata.vaplayer.ru/api.php";
const BASE = "https://brightpathsignals.com/embed";

async function check(imdb, type, season, episode) {
  const ref =
    type === "tv"
      ? `${BASE}/tv/${imdb}/${season}/${episode}`
      : `${BASE}/movie/${imdb}`;
  const params = new URLSearchParams({ imdb, type });
  if (type === "tv") {
    params.set("season", season);
    params.set("episode", episode);
  }
  const res = await fetch(`${API}?${params}`, {
    headers: { "User-Agent": UA, Referer: ref, Origin: "https://brightpathsignals.com" },
  });
  const j = await res.json();
  const urls = j.data?.stream_urls || [];
  return urls.length > 0;
}

const movie = await check("tt0111161", "movie");
const ep1 = await check("tt1190634", "tv", "1", "1");
const ep8 = await check("tt1190634", "tv", "1", "8");
console.log({ movie, ep1, ep8 });
