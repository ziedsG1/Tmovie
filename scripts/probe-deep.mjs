const UA = "Mozilla/5.0";

async function text(url, ref) {
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Referer: ref || url },
    redirect: "follow",
  });
  return { url: r.url, body: await r.text(), status: r.status };
}

function findUrls(body) {
  const patterns = [
    /https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/gi,
    /"(https?:\/\/[^"]+\.m3u8[^"]*)"/gi,
    /file:\s*["'](https?:\/\/[^"']+)["']/gi,
    /source:\s*["'](https?:\/\/[^"']+)["']/gi,
    /hlsUrl:\s*["'](https?:\/\/[^"']+)["']/gi,
    /playlist:\s*["'](https?:\/\/[^"']+)["']/gi,
  ];
  const out = new Set();
  for (const p of patterns) {
    for (const m of body.matchAll(p)) {
      const u = m[1] || m[0];
      if (u.includes(".m3u8")) out.add(u.replace(/\\u002F/g, "/").replace(/\\\//g, "/"));
    }
  }
  return [...out];
}

const imdb = "tt0816692";
const start = `https://vidsrc.in/embed/movie/${imdb}`;
let page = await text(start, "https://vidsrc.in/");
console.log("L0", page.status, findUrls(page.body).length);
let iframe = page.body.match(/<iframe[^>]+src="([^"]+)"/i)?.[1];
if (iframe) {
  const u = iframe.startsWith("//") ? "https:" + iframe : iframe;
  page = await text(u, start);
  console.log("L1", page.url.slice(0, 50), findUrls(page.body).length, findUrls(page.body).slice(0, 1));
  iframe = page.body.match(/<iframe[^>]+src="([^"]+)"/i)?.[1];
  if (iframe) {
    const u2 = iframe.startsWith("//") ? "https:" + iframe : iframe;
    page = await text(u2, page.url);
    console.log("L2", page.url.slice(0, 50), findUrls(page.body).length, findUrls(page.body).slice(0, 2));
  }
}

// vidfast - look for __NEXT_DATA__
const vf = await text(`https://vidfast.pro/movie/${imdb}`);
const next = vf.body.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
if (next) {
  const j = JSON.parse(next[1]);
  const s = JSON.stringify(j);
  console.log("vidfast next m3u8", (s.match(/\.m3u8/g) || []).length);
  const urls = findUrls(s);
  console.log("vidfast urls", urls.slice(0, 2));
}

// superembed / multiembed redirect
try {
  const r = await fetch(`https://multiembed.mov/?video_id=${imdb}&tmdb=1`, {
    headers: { "User-Agent": UA },
    redirect: "follow",
  });
  const t = await r.text();
  console.log("multi final", r.url.slice(0, 60), findUrls(t).length);
} catch (e) {
  console.log("multi err", e.message);
}
