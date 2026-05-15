const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

async function fetchText(url) {
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    redirect: "follow",
  });
  return { status: r.status, url: r.url, text: await r.text() };
}

// breaking bad on egibest
const eg = await fetchText("https://egibest.ws/?s=breaking+bad");
const results = [...eg.text.matchAll(/href="(https:\/\/egibest\.ws\/[^"]+)"/gi)]
  .map((m) => m[1])
  .filter((u) => u.includes("%") || u.includes("breaking") || u.includes("Breaking"));
console.log("search hits", results.slice(0, 8));

// try movies page for structure
const moviePage = await fetchText("https://egibest.ws/movie/mortal-kombat/");
console.log("movie try", moviePage.status);

// scrape homepage for imdb or data attributes
const home = await fetchText("https://egibest.ws/");
const watchUrls = [...home.text.matchAll(/href="(https:\/\/egibest\.ws\/[^"]*(?:episode|حلقة|فيلم|مسلسل)[^"]*)"/gi)]
  .map((m) => m[1])
  .slice(0, 3);
console.log("watch urls from home", watchUrls);

for (const u of watchUrls.length ? watchUrls : ["https://egibest.ws/%d9%85%d8%b4%d8%a7%d9%87%d8%af%d8%a9-%d9%85%d8%b3%d9%84%d8%b3%d9%84-the-good-wife-%d8%a7%d9%84%d9%85%d9%88%d8%b3%d9%85-%d8%a7%d9%84%d8%ae%d8%a7%d9%85%d8%b3-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d8%a9-1/"]) {
  const p = await fetchText(u);
  console.log("\nPAGE", p.url.slice(0, 80));
  const iframes = [...p.text.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]);
  const dataSrc = [...p.text.matchAll(/data-src=["']([^"']+)["']/gi)].map((m) => m[1]);
  const m3u8 = p.text.match(/https?:[^"'\s\\]+\.m3u8[^"'\s\\]*/gi);
  const ajax = p.text.match(/admin-ajax|wp-json|player|embed/gi)?.slice(0, 5);
  console.log("iframes", iframes.slice(0, 4));
  console.log("data-src", dataSrc.slice(0, 4));
  console.log("m3u8", m3u8?.slice(0, 2));
  console.log("keywords", ajax);
}

// vidsrc rip API?
try {
  const api = await fetch("https://vidsrc.rip/api/source/tt0903747", { headers: { "User-Agent": UA } });
  console.log("\nvidsrc.rip", api.status, (await api.text()).slice(0, 300));
} catch (e) {
  console.log("vidsrc.rip", e.message);
}
