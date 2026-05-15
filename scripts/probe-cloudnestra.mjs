const UA = "Mozilla/5.0";
const hash = "ZDIxNzJkMTViYWY2ZWNhZWUxZDBjMDc5NTA5NDMzYzA6Y1hacE"; // truncated - get from live
const embed = await (await fetch("https://vidsrc.me/embed/movie?tmdb=157336", { headers: { "User-Agent": UA } })).text();
const m = embed.match(/cloudnestra\.com\/rcp\/([^"']+)/);
if (!m) {
  console.log("no rcp");
  process.exit(0);
}
const rcpUrl = `https://cloudnestra.com/rcp/${m[1]}`;
console.log("rcp", rcpUrl.slice(0, 80) + "...");

const rcp = await fetch(rcpUrl, { headers: { "User-Agent": UA, Referer: "https://vidsrc.me/" } });
const html = await rcp.text();
console.log("status", rcp.status, "len", html.length);
console.log("prorcp", html.match(/\/prorcp\/[^"']+/));
console.log("m3u8", html.match(/https?:\/\/[^\s"'<>]+\.m3u8/g)?.slice(0, 2));
console.log("src:", html.match(/src:\s*'([^']+)'/)?.[1]);
console.log("sample", html.slice(0, 400));
