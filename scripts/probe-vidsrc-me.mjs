const UA = "Mozilla/5.0";
const url = "https://vidsrc.me/embed/movie?tmdb=157336";
const html = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
console.log("serversList", html.includes("serversList"));
console.log("data-hash", html.match(/data-hash="([^"]+)"/g));
console.log("iframe", html.match(/<iframe[^>]+src="([^"]+)"/i));
const idx = html.indexOf("serversList");
console.log("ctx", html.slice(idx, idx + 800));
