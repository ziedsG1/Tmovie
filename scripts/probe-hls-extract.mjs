const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

const movie = "tt0816692";
const tv = { id: "tt0903747", s: 5, e: 1 };

async function get(url, headers = {}) {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, ...headers },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    const text = await r.text();
    const m3u8 = [...text.matchAll(/https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/gi)].map((m) => m[0]);
    const src = text.match(/<iframe[^>]+src="([^"]+)"/i)?.[1];
    return { ok: r.ok, status: r.status, final: r.url, m3u8: [...new Set(m3u8)].slice(0, 3), src };
  } catch (e) {
    return { err: e.message };
  }
}

const tests = [
  ["vidsrc.in movie", `https://vidsrc.in/embed/movie/${movie}`, { Referer: "https://vidsrc.in/" }],
  ["vsembed movie", `https://vsembed.ru/embed/movie/${movie}`, { Referer: "https://vidsrc.in/" }],
  ["vidfast movie", `https://vidfast.pro/movie/${movie}`, {}],
  ["vidplay", `https://vidplay.site/e/${movie}`, {}],
  ["multiembed api", `https://multiembed.mov/api/video/${movie}`, {}],
  ["smashy", `https://player.smashy.stream/movie/${movie}`, {}],
  ["2embed", `https://www.2embed.cc/embed/${movie}`, {}],
  ["autoembed", `https://player.autoembed.cc/embed/movie/${movie}`, {}],
  ["embedsu", `https://embed.su/embed/movie/${movie}`, {}],
  ["vidsrc-ru", `https://vidsrc-embed.ru/embed/movie/${movie}`, {}],
];

for (const [name, url, h] of tests) {
  const r = await get(url, h);
  console.log(name, r.err || `${r.status} m3u8=${r.m3u8?.length || 0} iframe=${r.src?.slice(0, 45) || "-"}`);
  if (r.src && !r.m3u8?.length && name === "vidsrc.in movie") {
    const inner = await get(r.src, { Referer: url });
    console.log("  inner", inner.m3u8?.length, inner.m3u8?.[0]?.slice(0, 70));
  }
}

// TV
const tvTests = [
  [`https://vidsrc.in/embed/tv/${tv.id}/${tv.s}/${tv.e}`, { Referer: "https://vidsrc.in/" }],
  [`https://vsembed.ru/embed/tv/${tv.id}/${tv.s}/${tv.e}`, {}],
  [`https://vidfast.pro/tv/${tv.id}/${tv.s}/${tv.e}`, {}],
];
for (const [url, h] of tvTests) {
  const r = await get(url, h);
  console.log("tv", url.slice(8, 40), r.m3u8?.length || r.err);
}
