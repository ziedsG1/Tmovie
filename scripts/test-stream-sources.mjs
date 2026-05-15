const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

async function vap(imdb, season, episode) {
  const ref = `https://brightpathsignals.com/embed/tv/${imdb}/${season}/${episode}`;
  const p = new URLSearchParams({ imdb, type: "tv", season, episode });
  const r = await fetch(`https://streamdata.vaplayer.ru/api.php?${p}`, {
    headers: { "User-Agent": UA, Referer: ref, Origin: "https://brightpathsignals.com" },
  });
  const j = await r.json();
  return j.data?.stream_urls?.length || 0;
}

// TMDB find for vidsrc (needs tmdb id often)
async function tmdbFromImdb(imdb) {
  // use imdb graphql? or free endpoint
  const r = await fetch(
    `https://api.themoviedb.org/3/find/${imdb}?external_source=imdb_id`,
    { headers: { Authorization: "Bearer " + (process.env.TMDB || "") } }
  );
  return r.ok ? r.json() : null;
}

console.log("vap boys s1e1", await vap("tt1190634", "1", "1"));

// try alternate embed referers
const refs = [
  `https://playimdb.com/title/tt1190634/`,
  `https://www.playimdb.com/title/tt1190634/`,
  `https://streamimdb.ru/embed/tv/tt1190634/1/1`,
];
for (const ref of refs) {
  const p = new URLSearchParams({ imdb: "tt1190634", type: "tv", season: "1", episode: "1" });
  const r = await fetch(`https://streamdata.vaplayer.ru/api.php?${p}`, {
    headers: { "User-Agent": UA, Referer: ref },
  });
  const j = await r.json();
  console.log(ref.slice(0, 40), j.data?.stream_urls?.length ?? "err");
}
