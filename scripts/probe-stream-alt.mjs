const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

async function vaplayer(imdb, type, season, episode) {
  const params = new URLSearchParams({ imdb, type: type === "series" ? "tv" : "movie" });
  if (season) params.set("season", season);
  if (episode) params.set("episode", episode);
  const refs = [
    `https://brightpathsignals.com/embed/movie/${imdb}`,
    `https://www.playimdb.com/title/${imdb}/`,
    `https://playimdb.com/embed/movie/${imdb}`,
  ];
  for (const ref of refs) {
    const r = await fetch(`https://streamdata.vaplayer.ru/api.php?${params}`, {
      headers: { "User-Agent": UA, Referer: ref, Origin: "https://brightpathsignals.com" },
    });
    const j = await r.json().catch(() => ({}));
    console.log("vap", ref.split("/")[2], r.status, j.data?.stream_urls?.[0]?.slice(0, 60) ?? "none");
  }
}

await vaplayer("tt0816692", "movie"); // Interstellar
await vaplayer("tt0903747", "series", "5", "1");

// sm.embedflix / vidfast etc
const embeds = [
  "https://vidfast.pro/movie/tt0816692",
  "https://www.2embed.cc/embed/tt0816692",
  "https://player.autoembed.cc/embed/movie/tt0816692",
  "https://multiembed.mov/?video_id=tt0816692&tmdb=1",
  "https://embed.su/embed/movie/tt0816692",
  "https://vidsrc.in/embed/movie/tt0816692",
];
for (const u of embeds) {
  try {
    const r = await fetch(u, { headers: { "User-Agent": UA }, redirect: "follow" });
    const t = await r.text();
    const sandboxBlock = /sandbox/i.test(t) && /not allowed|remove sandbox/i.test(t);
    const m3u8 = t.match(/https?:[^"'\s]+\.m3u8[^"'\s]*/);
    console.log(
      u.slice(8, 45),
      r.status,
      sandboxBlock ? "BLOCKS_SANDBOX" : "no-sandbox-msg",
      m3u8 ? "has-m3u8-in-html" : ""
    );
  } catch (e) {
    console.log(u.slice(8, 40), "err");
  }
}
