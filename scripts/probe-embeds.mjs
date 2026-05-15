const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const imdb = "tt1375666";
const tv = { id: "tt0903747", s: 5, e: 1 };

const movieUrls = [
  `https://vidsrc.to/embed/movie/${imdb}`,
  `https://vidsrc.me/embed/movie/${imdb}`,
  `https://vidsrc.net/embed/movie/${imdb}`,
  `https://vidsrc-embed.ru/embed/movie/${imdb}`,
  `https://vidsrc.in/embed/movie/${imdb}`,
  `https://www.2embed.cc/embed/${imdb}`,
  `https://www.2embed.to/embed/${imdb}`,
  `https://embed.su/embed/movie/${imdb}`,
  `https://multiembed.mov/directstream.php?video_id=${imdb}`,
  `https://player.smashy.stream/movie/${imdb}`,
  `https://vidsrc.pro/embed/movie/${imdb}`,
  `https://moviesapi.club/movie/${imdb}`,
];

const tvUrls = [
  `https://vidsrc.to/embed/tv/${tv.id}/${tv.s}/${tv.e}`,
  `https://vidsrc.me/embed/tv/${tv.id}/${tv.s}/${tv.e}`,
  `https://vidsrc.in/embed/tv/${tv.id}/${tv.s}/${tv.e}`,
  `https://www.2embed.cc/embed/tv/${imdb}/${tv.s}/${tv.e}`.replace(imdb, tv.id),
  `https://multiembed.mov/?video_id=${tv.id}&tmdb=1&s=${tv.s}&e=${tv.e}`,
  `https://player.smashy.stream/tv/${tv.id}?s=${tv.s}&e=${tv.e}`,
];

async function check(url) {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    const t = await r.text();
    const bad =
      /not found|404|error|unavailable/i.test(t) && t.length < 3000;
    const ok = r.ok && t.length > 800 && !bad;
    console.log(ok ? "OK" : "NO", r.status, url.slice(0, 70));
  } catch (e) {
    console.log("ERR", url.slice(0, 70), e.message);
  }
}

for (const u of movieUrls) await check(u);
console.log("--- TV ---");
for (const u of tvUrls) await check(u);
