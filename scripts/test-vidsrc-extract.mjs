import * as cheerio from "cheerio";
import { decrypt } from "../src/lib/vidsrc/decoder.ts";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

async function extractVidsrcHls(tmdbId, type, season, episode) {
  const url =
    type === "movie"
      ? `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`
      : `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`;

  const embedRes = await fetch(url, { headers: { "User-Agent": UA } });
  const embedHtml = await embedRes.text();
  const $ = cheerio.load(embedHtml);

  const iframeSrc = $("iframe").attr("src") || "";
  const rcpMatch = embedHtml.match(/cloudnestra\.com\/rcp\/([^"']+)/);
  if (!rcpMatch) return null;

  const rcpUrl = `https://cloudnestra.com/rcp/${rcpMatch[1]}`;
  const rcpRes = await fetch(rcpUrl, {
    headers: { "User-Agent": UA, Referer: "https://vidsrc.me/" },
  });
  const rcpHtml = await rcpRes.text();
  const prorcpMatch = rcpHtml.match(/\/prorcp\/([^"']+)/);
  if (!prorcpMatch) return null;

  const prorcpPath = `/prorcp/${prorcpMatch[1]}`;
  const baseDom = "https://cloudnestra.com";
  const prorcpRes = await fetch(`${baseDom}${prorcpPath}`, {
    headers: { "User-Agent": UA, Referer: rcpUrl },
  });
  const prorcpHtml = await prorcpRes.text();

  const scripts = prorcpHtml.match(/<script[^>]*src="([^"]+\.js[^"]*)"[^>]*><\/script>/gi);
  const scriptLine = scripts?.find((s) => !s.includes("cpt.js")) || scripts?.at(-1);
  const scriptMatch = scriptLine?.match(/src="\/([^"]+\.js\?_=[^"]+)"/);
  if (!scriptMatch) {
    console.log("no script", prorcpHtml.slice(0, 500));
    return null;
  }

  const jsRes = await fetch(`${baseDom}/${scriptMatch[1]}`, {
    headers: {
      "User-Agent": UA,
      Referer: `${baseDom}/`,
      Accept: "*/*",
    },
  });
  const jsCode = await jsRes.text();
  const decryptRegex = /{}\}window\[([^"]+)\("([^"]+)"\)/;
  const decryptMatches = jsCode.match(decryptRegex);
  if (!decryptMatches) {
    console.log("no decrypt fn in js");
    return null;
  }

  const fnName = decryptMatches[1];
  const fnKey = decryptMatches[2];
  const $p = cheerio.load(prorcpHtml);
  const id = decrypt(fnKey.trim(), fnName.trim());
  if (!id) return null;
  const dataEl = $p("#" + id);
  const encrypted = await dataEl.text();
  const streamUrl = await decrypt(encrypted, fnKey.trim());
  return { streamUrl, referer: baseDom, title: $("title").text() };
}

// copy decoder - test without ts import
console.log("run via ts after build");
