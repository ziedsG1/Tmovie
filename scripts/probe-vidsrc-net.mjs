const UA = "Mozilla/5.0";
const urls = [
  "https://vidsrc.me/embed/movie?tmdb=157336",
  "https://vidsrc.xyz/embed/movie?tmdb=157336",
  "https://vidsrc.in/embed/movie?tmdb=157336",
  "https://vidsrc.to/embed/movie/tt0816692",
];

for (const u of urls) {
  try {
    const r = await fetch(u, { headers: { "User-Agent": UA } });
    const t = await r.text();
    const iframe = t.match(/<iframe[^>]+src="([^"]+)"/i)?.[1];
    console.log(u.slice(8, 50), r.status, "hash", (t.match(/data-hash/g) || []).length, "if", iframe?.slice(0, 45));
  } catch (e) {
    console.log(u, e.cause?.code || e.message);
  }
}
