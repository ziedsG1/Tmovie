import { writeFileSync } from "fs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

async function fetchText(url, referer) {
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Referer: referer || url },
    redirect: "follow",
  });
  return { status: r.status, url: r.url, text: await r.text() };
}

const imdb = "tt0816692";
const pages = [
  { name: "vidsrc.in", url: `https://vidsrc.in/embed/movie/${imdb}` },
  { name: "vidsrc.to", url: `https://vidsrc.to/embed/movie/${imdb}` },
  { name: "vidfast", url: `https://vidfast.pro/movie/${imdb}` },
  { name: "2embed", url: `https://www.2embed.cc/embed/${imdb}` },
];

for (const p of pages) {
  const { status, url, text } = await fetchText(p.url);
  const m3u8 = text.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/gi) || [];
  const sandbox = /sandbox.*not allowed|remove sandbox/i.test(text);
  const iframe = text.match(/<iframe[^>]+src="([^"]+)"/i);
  console.log(p.name, status, sandbox ? "SANDBOX_BLOCK" : "-", "m3u8:", m3u8.length, "iframe:", iframe?.[1]?.slice(0, 50));
  if (iframe && p.name === "vidsrc.in") {
    const inner = await fetchText(iframe[1], p.url);
    const innerM3u8 = inner.text.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/gi) || [];
    console.log("  inner", inner.status, "m3u8", innerM3u8.slice(0, 2));
  }
}
