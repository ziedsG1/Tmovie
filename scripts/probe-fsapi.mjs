const UA = "Mozilla/5.0";

async function follow(url) {
  const r = await fetch(url, {
    headers: { "User-Agent": UA },
    redirect: "manual",
  });
  const loc = r.headers.get("location");
  const text = await r.text();
  const m3u8 = text.match(/https?:\/\/[^\s"'<>]+\.m3u8/gi);
  return { status: r.status, loc, m3u8: m3u8?.slice(0, 2), len: text.length };
}

const imdb = "tt0816692";
console.log(await follow(`https://fsapi.xyz/movie/${imdb}`));
console.log(await follow(`https://fsapi.xyz/tv-imdb/tt0903747-5-1`));
