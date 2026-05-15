type CheerioRoot = ReturnType<Awaited<typeof import("cheerio")>["load"]>;
import { resolveTmdbId } from "../tmdb-lookup";
import { decrypt } from "./decoder";

type StreamRequest = {
  imdbId: string;
  type: "movie" | "series";
  season?: number;
  episode?: number;
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const FETCH_HEADERS = {
  "User-Agent": UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const FETCH_TIMEOUT_MS = 25000;

interface ServerEntry {
  name: string;
  dataHash: string;
}

function embedCandidates(req: StreamRequest, tmdbId: number | null): string[] {
  const { imdbId } = req;
  const urls: string[] = [];

  if (req.type === "series" && req.season != null && req.episode != null) {
    const { season, episode } = req;
    if (tmdbId) {
      urls.push(
        `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`
      );
    }
    urls.push(
      `https://vidsrc.me/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}`,
      `https://vsembed.ru/embed/tv/${imdbId}/${season}-${episode}`,
      `https://vsembed.ru/embed/tv/${imdbId}/${season}/${episode}`
    );
  } else if (req.type === "movie") {
    if (tmdbId) {
      urls.push(`https://vidsrc.me/embed/movie?tmdb=${tmdbId}`);
    }
    urls.push(
      `https://vidsrc.me/embed/movie?imdb=${imdbId}`,
      `https://vsembed.ru/embed/movie/${imdbId}`
    );
  }

  return Array.from(new Set(urls));
}

let cheerioLoad: ((html: string) => CheerioRoot) | null = null;

async function loadHtml(html: string): Promise<CheerioRoot> {
  if (!cheerioLoad) {
    const mod = await import("cheerio");
    cheerioLoad = mod.load;
  }
  return cheerioLoad(html);
}

async function parseServers(html: string): Promise<{ servers: ServerEntry[]; baseDom: string }> {
  const $ = await loadHtml(html);
  const servers: ServerEntry[] = [];
  const seen = new Set<string>();

  function add(name: string, hash: string | null | undefined) {
    if (!hash || seen.has(hash)) return;
    seen.add(hash);
    servers.push({ name, dataHash: hash });
  }

  $(".serversList .server").each((_, el) => {
    const server = $(el);
    add(server.text().trim() || "Server", server.attr("data-hash"));
  });

  Array.from(html.matchAll(/data-hash="([^"]+)"/gi), (m) => add("Mirror", m[1]));

  let iframeSrc = $("iframe").attr("src") ?? "";
  if (iframeSrc.startsWith("//")) iframeSrc = `https:${iframeSrc}`;

  let baseDom = "https://cloudnestra.com";
  if (iframeSrc) {
    try {
      baseDom = new URL(iframeSrc).origin;
      const rcpInFrame = iframeSrc.match(/\/rcp\/([^?"#\s]+)/i);
      if (rcpInFrame) add("Primary", rcpInFrame[1]);
    } catch {
      /* keep default */
    }
  }

  const rcpInHtml = html.match(/cloudnestra\.com\/rcp\/([^?"#'\s]+)/i);
  if (rcpInHtml) add("Cloudnestra", rcpInHtml[1]);

  return { servers, baseDom };
}

function rcpPathFromHtml(html: string): string | null {
  const match = html.match(/src:\s*'([^']*)'/);
  return match?.[1] ?? null;
}

async function prorcpToM3u8(baseDom: string, prorcpId: string): Promise<string | null> {
  const prorcpUrl = `${baseDom}/prorcp/${prorcpId}`;
  const prorcpRes = await fetch(prorcpUrl, {
    headers: { ...FETCH_HEADERS, Referer: `${baseDom}/` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!prorcpRes.ok) return null;
  const prorcpHtml = await prorcpRes.text();

  const extScripts = Array.from(
    prorcpHtml.matchAll(/<script[^>]+src=['"](\/[^'"]+\.js[^'"]*)['"]/gi),
    (m) => m[1]
  );
  if (!extScripts.length) return null;

  const decryptRegex = /\{}\}window\[([^"]+)\("([^"]+)"\)/;
  let decryptMatches: RegExpMatchArray | null = null;

  for (const scriptPath of extScripts) {
    try {
      const jsRes = await fetch(`${baseDom}${scriptPath}`, {
        headers: {
          ...FETCH_HEADERS,
          Referer: `${baseDom}/`,
          Accept: "*/*",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!jsRes.ok) continue;
      const jsCode = await jsRes.text();
      const hit = jsCode.match(decryptRegex);
      if (hit) {
        decryptMatches = hit;
        break;
      }
    } catch {
      /* try next script */
    }
  }
  if (!decryptMatches || decryptMatches.length < 3) return null;

  const cipherType = decryptMatches[2].trim();
  const idKey = decryptMatches[1].trim();

  const $ = await loadHtml(prorcpHtml);
  const elementId = decrypt(cipherType, idKey);
  if (!elementId) return null;

  let payload = "";
  $("[id]").each((_, el) => {
    if ($(el).attr("id") === elementId) payload = $(el).text();
  });
  if (!payload) return null;

  const stream = decrypt(payload, cipherType);
  if (!stream || !stream.includes(".m3u8")) return null;
  return stream.startsWith("http") ? stream : `https:${stream}`;
}

async function rcpToStream(baseDom: string, hash: string): Promise<string | null> {
  const rcpRes = await fetch(`${baseDom}/rcp/${hash}`, {
    headers: { ...FETCH_HEADERS, Referer: `${baseDom}/` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!rcpRes.ok) return null;
  const rcpHtml = await rcpRes.text();
  const data = rcpPathFromHtml(rcpHtml);
  if (!data?.startsWith("/prorcp/")) return null;
  return prorcpToM3u8(baseDom, data.replace("/prorcp/", ""));
}

async function extractFromEmbedPage(embedUrl: string): Promise<VidsrcExtractResult | null> {
  let embedRes: Response;
  try {
    embedRes = await fetch(embedUrl, {
      headers: FETCH_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
  if (!embedRes.ok) return null;

  const embedHtml = await embedRes.text();
  const { servers, baseDom } = await parseServers(embedHtml);
  if (!servers.length) return null;

  for (const server of servers) {
    try {
      const url = await rcpToStream(baseDom, server.dataHash);
      if (url) {
        return {
          url,
          referer: `${baseDom}/`,
          label: server.name ? `VidSrc (${server.name})` : "VidSrc HLS",
        };
      }
    } catch {
      /* try next server */
    }
  }
  return null;
}

export interface VidsrcExtractResult {
  url: string;
  referer: string;
  label: string;
}

export async function extractVidsrcHls(req: StreamRequest): Promise<VidsrcExtractResult | null> {
  if (!req.imdbId.startsWith("tt")) return null;
  if (req.type === "series" && (req.season == null || req.episode == null)) return null;

  const tmdbId = await resolveTmdbId(req.imdbId, req.type);
  const embedUrls = embedCandidates(req, tmdbId);

  for (const embedUrl of embedUrls) {
    const hit = await extractFromEmbedPage(embedUrl);
    if (hit) return hit;
  }

  return null;
}

/** Fast: embed page lists servers / rcp (no decrypt chain). */
export async function checkVidsrcEmbedAvailable(req: StreamRequest): Promise<boolean> {
  if (!req.imdbId.startsWith("tt")) return false;
  if (req.type === "series" && (req.season == null || req.episode == null)) return false;

  const tmdbId = await resolveTmdbId(req.imdbId, req.type);
  for (const embedUrl of embedCandidates(req, tmdbId)) {
    try {
      const res = await fetch(embedUrl, {
        headers: FETCH_HEADERS,
        redirect: "follow",
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) continue;
      const { servers } = await parseServers(await res.text());
      if (servers.length > 0) return true;
    } catch {
      /* try next embed URL */
    }
  }
  return false;
}

export async function checkVidsrcAvailable(req: StreamRequest): Promise<boolean> {
  const hit = await extractVidsrcHls(req);
  return !!hit?.url;
}
