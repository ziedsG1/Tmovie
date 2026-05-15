import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPublicOrigin } from "./site-origin";
import { decodeProxyPayload, encodeProxyPayload } from "./stream";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type",
};

function originFromReferer(referer: string): string | undefined {
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}

async function fetchUpstream(url: string, referer: string, range?: string | null) {
  const origin = originFromReferer(referer);
  const headerSets: Record<string, string>[] = [
    {
      "User-Agent": UA,
      Accept: "*/*",
      ...(referer ? { Referer: referer } : {}),
      ...(origin ? { Origin: origin } : {}),
      ...(range ? { Range: range } : {}),
    },
    {
      "User-Agent": UA,
      Accept: "*/*",
      Referer: referer || "https://www.imdb.com/",
      Origin: "https://brightpathsignals.com",
      ...(range ? { Range: range } : {}),
    },
    { "User-Agent": UA, Accept: "*/*", ...(range ? { Range: range } : {}) },
  ];

  let lastErr: unknown;
  for (const headers of headerSets) {
    try {
      const res = await fetch(url, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
        redirect: "follow",
      });
      if (res.ok || res.status === 206) return res;
      lastErr = new Error(`CDN ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

function isM3u8Url(href: string): boolean {
  const path = href.split("?")[0].split("#")[0].toLowerCase();
  return path.endsWith(".m3u8") || path.includes(".m3u8");
}

function rewritePlaylist(
  body: string,
  manifestUrl: string,
  referer: string,
  publicOrigin: string
): string {
  const prefix = publicOrigin.replace(/\/$/, "");

  return body
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t || t.startsWith("#")) return line;
      let abs: string;
      try {
        abs = new URL(t, manifestUrl).href;
      } catch {
        return line;
      }
      const enc = encodeProxyPayload(abs, referer);
      if (isM3u8Url(abs)) {
        return enc.length > 1200
          ? `${prefix}/api/hls?p=${enc}`
          : `${prefix}/api/hls/${enc}.m3u8`;
      }
      return enc.length > 1200 ? `${prefix}/api/seg?p=${enc}` : `${prefix}/api/seg/${enc}`;
    })
    .join("\n");
}

export async function proxyManifestRequest(req: NextRequest, encoded: string) {
  const data = decodeProxyPayload(encoded.replace(/\.m3u8$/i, ""));
  if (!data?.u) return new NextResponse("Bad request", { status: 400, headers: CORS });

  const upstream = await fetchUpstream(data.u, data.r || "");
  const body = await upstream.text();
  const rewritten = rewritePlaylist(body, data.u, data.r || "", getPublicOrigin(req));

  return new NextResponse(rewritten, {
    headers: {
      ...CORS,
      "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

export async function proxySegmentRequest(req: NextRequest, encoded: string) {
  const data = decodeProxyPayload(encoded);
  if (!data?.u) return new NextResponse("Bad request", { status: 400, headers: CORS });

  const upstream = await fetchUpstream(data.u, data.r || "", req.headers.get("range"));
  const buf = await upstream.arrayBuffer();

  const headers = new Headers(CORS);
  let contentType = upstream.headers.get("content-type") || "";
  if (!contentType || /text\/html/i.test(contentType)) {
    const view = new Uint8Array(buf.slice(0, 188));
    const syncByte = view.findIndex((b) => b === 0x47);
    if (syncByte >= 0) contentType = "video/mp2t";
    else if (view[0] === 0x1a && view[1] === 0x45) contentType = "video/webm";
  }
  if (contentType) headers.set("Content-Type", contentType);

  const pass = ["content-length", "content-range", "accept-ranges", "etag"];
  for (const h of pass) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (!headers.has("content-length")) headers.set("Content-Length", String(buf.byteLength));
  if (!headers.has("accept-ranges")) headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "no-cache");

  return new NextResponse(buf, { status: upstream.status, headers });
}
