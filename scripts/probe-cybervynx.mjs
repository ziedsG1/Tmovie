const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

async function check(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  const h = await r.text();
  const hasPlayer =
    h.includes("video") || h.includes("player") || h.includes("jwplayer") || h.includes("hls");
  console.log(url, r.status, "len", h.length, "player?", hasPlayer);
}

await check("https://cybervynx.com/embed/movie/tt1375666");
await check("https://cybervynx.com/embed/tv/tt0903747/5/1");
await check("https://cybervynx.com/e/tt1375666");
