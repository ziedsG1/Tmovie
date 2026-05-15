import { resolveTmdbId } from "./tmdb-lookup";

const VAPLAYER_API = "https://streamdata.vaplayer.ru/api.php";
const BRIGHTPATH_BASE = "https://brightpathsignals.com/embed";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface StreamVariant {
  url: string;
  quality: string;
}

export type StreamType = "movie" | "series";

export interface StreamRequest {
  imdbId: string;
  type: StreamType;
  season?: number;
  episode?: number;
}

interface RefererCandidate {
  referer: string;
  origin?: string;
  label: string;
}

function refererCandidates(req: StreamRequest): RefererCandidate[] {
  const { imdbId } = req;

  if (req.type === "series" && req.season != null && req.episode != null) {
    const { season, episode } = req;
    return [
      {
        label: "brightpath",
        referer: `${BRIGHTPATH_BASE}/tv/${imdbId}/${season}/${episode}`,
        origin: "https://brightpathsignals.com",
      },
      {
        label: "playimdb",
        referer: `https://www.playimdb.com/title/${imdbId}/`,
        origin: "https://www.playimdb.com",
      },
      {
        label: "playimdb-embed",
        referer: `https://playimdb.com/embed/tv/${imdbId}/${season}/${episode}`,
        origin: "https://playimdb.com",
      },
      {
        label: "vidsrc-ref",
        referer: `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`,
        origin: "https://vidsrc.to",
      },
      {
        label: "vidsrc-in-ref",
        referer: `https://vidsrc.in/embed/tv/${imdbId}/${season}/${episode}`,
        origin: "https://vidsrc.in",
      },
      {
        label: "imdb",
        referer: `https://www.imdb.com/title/${imdbId}/`,
        origin: "https://www.imdb.com",
      },
    ];
  }

  return [
    {
      label: "brightpath",
      referer: `${BRIGHTPATH_BASE}/movie/${imdbId}`,
      origin: "https://brightpathsignals.com",
    },
    {
      label: "playimdb",
      referer: `https://www.playimdb.com/title/${imdbId}/`,
      origin: "https://www.playimdb.com",
    },
    {
      label: "vidsrc-ref",
      referer: `https://vidsrc.to/embed/movie/${imdbId}`,
      origin: "https://vidsrc.to",
    },
    {
      label: "vidsrc-in-ref",
      referer: `https://vidsrc.in/embed/movie/${imdbId}`,
      origin: "https://vidsrc.in",
    },
    {
      label: "imdb",
      referer: `https://www.imdb.com/title/${imdbId}/`,
      origin: "https://www.imdb.com",
    },
  ];
}

const REFERER_LABELS: Record<string, string> = {
  brightpath: "Brightpath HLS",
  playimdb: "PlayIMDb HLS",
  "playimdb-embed": "PlayIMDb (embed ref)",
  "vidsrc-ref": "HLS (VidSrc referer)",
  "vidsrc-in-ref": "HLS (VidSrc.in referer)",
  "vidsrc-me": "HLS (VidSrc.me referer)",
  vsembed: "HLS (VSEmbed referer)",
  imdb: "HLS (IMDb referer)",
};

function referer(req: StreamRequest): string {
  return refererCandidates(req)[0].referer;
}

async function queryVaplayer(
  req: StreamRequest,
  candidate: RefererCandidate,
  tmdbId: number | null
): Promise<string[] | null> {
  const params = new URLSearchParams({
    imdb: req.imdbId,
    type: req.type === "series" ? "tv" : "movie",
  });
  if (req.type === "series" && req.season != null && req.episode != null) {
    params.set("season", String(req.season));
    params.set("episode", String(req.episode));
  }
  if (tmdbId) params.set("tmdb", String(tmdbId));

  try {
    const apiRes = await fetch(`${VAPLAYER_API}?${params}`, {
      headers: {
        "User-Agent": UA,
        Referer: candidate.referer,
        ...(candidate.origin ? { Origin: candidate.origin } : {}),
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!apiRes.ok) return null;
    const body = (await apiRes.json()) as { data?: { stream_urls?: string[] } };
    const urls = body.data?.stream_urls;
    return Array.isArray(urls) && urls.length > 0 ? urls : null;
  } catch {
    return null;
  }
}

type StreamHit = { urls: string[]; referer: string; source: string };

function extraRefererCandidates(req: StreamRequest, tmdbId: number | null): RefererCandidate[] {
  if (!tmdbId) return [];
  if (req.type === "series" && req.season != null && req.episode != null) {
    return [
      {
        label: "vidsrc-me",
        referer: `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${req.season}&episode=${req.episode}`,
        origin: "https://vidsrc.me",
      },
      {
        label: "vsembed",
        referer: `https://vsembed.ru/embed/tv/${req.imdbId}/${req.season}-${req.episode}`,
        origin: "https://vsembed.ru",
      },
    ];
  }
  if (req.type === "movie") {
    return [
      {
        label: "vidsrc-me",
        referer: `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`,
        origin: "https://vidsrc.me",
      },
    ];
  }
  return [];
}

async function findAllStreamHits(req: StreamRequest): Promise<StreamHit[]> {
  const tmdbId = await resolveTmdbId(req.imdbId, req.type);
  const candidates = [...refererCandidates(req), ...extraRefererCandidates(req, tmdbId)];
  const hits = await Promise.all(
    candidates.map(async (candidate) => {
      const urls = await queryVaplayer(req, candidate, tmdbId);
      if (!urls) return null;
      return { urls, referer: candidate.referer, source: candidate.label };
    })
  );
  return hits.filter((h): h is StreamHit => h !== null);
}

async function findStreamUrls(req: StreamRequest): Promise<StreamHit | null> {
  const hits = await findAllStreamHits(req);
  return hits[0] ?? null;
}

export interface HlsSourceResult {
  label: string;
  referer: string;
  variants: StreamVariant[];
}

function resolutionToQuality(resolution: string | null, bandwidth: number): string {
  if (resolution) {
    const h = parseInt(resolution.split("x")[1]) || 0;
    if (h >= 2160) return "4K";
    if (h >= 1080) return "1080p";
    if (h >= 720) return "720p";
    if (h >= 480) return "480p";
  }
  if (bandwidth > 8000000) return "4K";
  if (bandwidth > 4000000) return "1080p";
  if (bandwidth > 2000000) return "720p";
  return "Auto";
}

function parseMasterPlaylist(body: string, masterUrl: string): StreamVariant[] {
  const lines = body.split("\n");
  const variants: { url: string; quality: string; bandwidth: number }[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("#EXT-X-STREAM-INF:")) continue;

    const bwMatch = line.match(/BANDWIDTH=(\d+)/);
    const resMatch = line.match(/RESOLUTION=([\dx]+)/);
    const bandwidth = bwMatch ? parseInt(bwMatch[1]) : 0;
    const resolution = resMatch ? resMatch[1] : null;

    const urlLine = lines[i + 1]?.trim();
    if (!urlLine || urlLine.startsWith("#")) continue;

    let url: string;
    try {
      url = new URL(urlLine, masterUrl).href;
    } catch {
      url = urlLine;
    }

    const quality = resolutionToQuality(resolution, bandwidth);
    if (!seen.has(quality)) {
      seen.add(quality);
      variants.push({ url, quality, bandwidth });
    }
  }

  return variants.sort((a, b) => b.bandwidth - a.bandwidth).map(({ url, quality }) => ({ url, quality }));
}

function mediaSegmentLines(body: string): string[] {
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

/** Reject obfuscated playlists that point at HTML pages instead of video segments. */
export function isPlayableHlsBody(body: string): boolean {
  if (!body.trimStart().startsWith("#EXTM3U")) return false;
  const segs = mediaSegmentLines(body);
  if (segs.length === 0) return true;
  const junk = segs.filter((l) => /\.(html?|php|shtml)(\?|#|$)/i.test(l));
  return junk.length < Math.max(1, segs.length * 0.25);
}

async function resolveStream(m3u8Url: string, ref: string): Promise<{ url: string; verified: boolean; body?: string } | null> {
  const headerSets: Record<string, string>[] = [
    { "User-Agent": UA, Referer: ref, Origin: "https://brightpathsignals.com" },
    { "User-Agent": UA, Referer: ref },
    { "User-Agent": UA },
  ];

  for (const headers of headerSets) {
    try {
      const res = await fetch(m3u8Url, {
        headers,
        signal: AbortSignal.timeout(8000),
        redirect: "follow",
      });
      if (res.status === 200) {
        const body = await res.text();
        if (body.trimStart().startsWith("#EXTM3U")) return { url: m3u8Url, verified: true, body };
      }
      return { url: m3u8Url, verified: false };
    } catch {
      /* try next headers */
    }
  }
  return null;
}

export type StreamCheckOptions = {
  /** Server-side VidSrc extract (slow; use for single-title checks, not catalog batch) */
  includeVidsrcFallback?: boolean;
};

/** Catalog batch: try top referers in parallel (no TMDB lookup). */
export async function hasVaplayerStreamQuick(req: StreamRequest): Promise<boolean> {
  if (!req.imdbId.startsWith("tt")) return false;
  const hits = await Promise.all(
    refererCandidates(req)
      .slice(0, 3)
      .map((c) => queryVaplayer(req, c, null))
  );
  return hits.some((urls) => !!urls);
}

/** PlayIMDb/vaplayer HLS available (tries all referers). */
export async function hasVaplayerStream(req: StreamRequest): Promise<boolean> {
  if (!req.imdbId.startsWith("tt")) return false;
  return !!(await findStreamUrls(req));
}

/** Catalog / browse: quick vaplayer, then VidSrc embed probe (no full decrypt). */
export async function isPlayableStream(req: StreamRequest): Promise<boolean> {
  if (!req.imdbId.startsWith("tt")) return false;
  if (await hasVaplayerStreamQuick(req)) return true;
  const { checkVidsrcEmbedAvailable } = await import("./vidsrc/extract");
  return checkVidsrcEmbedAvailable(req);
}

/** Fast check: vaplayer; optional full VidSrc extract when includeVidsrcFallback is set */
export async function checkStreamAvailable(
  req: StreamRequest,
  options?: StreamCheckOptions
): Promise<boolean> {
  if (!req.imdbId.startsWith("tt")) return false;
  if (await findStreamUrls(req)) return true;
  if (!options?.includeVidsrcFallback) return false;
  const { checkVidsrcAvailable } = await import("./vidsrc/extract");
  return checkVidsrcAvailable(req);
}

/** Resolve a master or media m3u8 to a playable media playlist URL. */
async function resolvePlayableStreamUrl(m3u8Url: string, ref: string): Promise<string | null> {
  const resolved = await resolveStream(m3u8Url, ref);
  if (!resolved?.body || !isPlayableHlsBody(resolved.body)) return null;

  const masterVariants = parseMasterPlaylist(resolved.body, m3u8Url);
  if (masterVariants.length > 0) {
    for (const variant of masterVariants) {
      const media = await resolvePlayableStreamUrl(variant.url, ref);
      if (media) return media;
    }
    return null;
  }

  return m3u8Url;
}

async function variantsFromHit(hit: StreamHit): Promise<StreamVariant[] | null> {
  for (const url of hit.urls) {
    const playable = await resolvePlayableStreamUrl(url, hit.referer);
    if (playable) return [{ url: playable, quality: "Auto" }];
  }
  return null;
}

/** All distinct HLS options (multiple vaplayer referers). No iframes. */
export async function fetchAllHlsSources(req: StreamRequest): Promise<HlsSourceResult[]> {
  if (!req.imdbId.startsWith("tt")) return [];

  const hits = await findAllStreamHits(req);
  const out: HlsSourceResult[] = [];
  const seen = new Set<string>();

  for (const hit of hits) {
    const variants = await variantsFromHit(hit);
    const url = variants?.[0]?.url;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      label: REFERER_LABELS[hit.source] || "PlayIMDb HLS",
      referer: hit.referer,
      variants: variants!,
    });
  }

  if (out.length === 0) {
    const { extractVidsrcHls } = await import("./vidsrc/extract");
    const vidsrc = await extractVidsrcHls(req);
    if (vidsrc?.url && !seen.has(vidsrc.url)) {
      const resolved = await resolveStream(vidsrc.url, vidsrc.referer);
      if (resolved) {
        const variants =
          resolved.verified && resolved.body
            ? parseMasterPlaylist(resolved.body, resolved.url)
            : [{ url: resolved.url, quality: "Auto" }];
        if (variants.length > 0) {
          out.push({
            label: vidsrc.label,
            referer: vidsrc.referer,
            variants: variants.length > 0 ? variants : [{ url: resolved.url, quality: "Auto" }],
          });
        }
      } else {
        out.push({
          label: vidsrc.label,
          referer: vidsrc.referer,
          variants: [{ url: vidsrc.url, quality: "Auto" }],
        });
      }
    }
  }

  return out;
}

export async function fetchStreams(req: StreamRequest): Promise<StreamVariant[] | null> {
  const all = await fetchAllHlsSources(req);
  return all[0]?.variants ?? null;
}

export function buildReferer(req: StreamRequest): string {
  return referer(req);
}

export function encodeProxyPayload(url: string, refererStr: string, base?: string): string {
  return Buffer.from(JSON.stringify({ u: url, r: refererStr, b: base || "" })).toString("base64url");
}

export function decodeProxyPayload(encoded: string): { u?: string; r?: string; b?: string } | null {
  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString());
  } catch {
    return null;
  }
}

export type StreamCheckItem = {
  imdbId: string;
  type: StreamType;
  season?: number;
  episode?: number;
};

function streamCheckKey(item: StreamCheckItem): string {
  return item.type === "series"
    ? `${item.imdbId}:s${item.season}:e${item.episode}`
    : item.imdbId;
}

function itemToRequest(item: StreamCheckItem): StreamRequest {
  return {
    imdbId: item.imdbId,
    type: item.type,
    season: item.season,
    episode: item.episode,
  };
}

/** Batch playable check: vaplayer first, then VidSrc embed probe for misses. */
export async function checkPlayableBatch(
  items: StreamCheckItem[],
  concurrency = 12
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  const needVidsrc: StreamCheckItem[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (item) => {
        const k = streamCheckKey(item);
        const req = itemToRequest(item);
        if (await hasVaplayerStreamQuick(req)) {
          results[k] = true;
        } else {
          results[k] = false;
          needVidsrc.push(item);
        }
      })
    );
  }

  if (needVidsrc.length > 0) {
    const { checkVidsrcEmbedAvailable } = await import("./vidsrc/extract");
    const vidsrcConcurrency = 8;
    for (let i = 0; i < needVidsrc.length; i += vidsrcConcurrency) {
      const chunk = needVidsrc.slice(i, i + vidsrcConcurrency);
      await Promise.all(
        chunk.map(async (item) => {
          const k = streamCheckKey(item);
          if (results[k]) return;
          const ok = await checkVidsrcEmbedAvailable(itemToRequest(item));
          if (ok) results[k] = true;
        })
      );
    }
  }

  return results;
}

/** Search / small lists: vaplayer quick only (no VidSrc round-trip). */
export async function checkPlayableBatchFast(
  items: StreamCheckItem[],
  concurrency = 28
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (item) => {
        const k = streamCheckKey(item);
        results[k] = await hasVaplayerStreamQuick(itemToRequest(item));
      })
    );
  }

  return results;
}

/** @deprecated Use checkPlayableBatch */
export async function checkStreamsBatch(
  items: StreamCheckItem[],
  concurrency = 8
): Promise<Record<string, boolean>> {
  return checkPlayableBatch(items, concurrency);
}
