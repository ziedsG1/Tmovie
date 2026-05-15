import { NextRequest, NextResponse } from "next/server";
import { getPublicOrigin } from "@/lib/site-origin";
import { decodeProxyPayload, encodeProxyPayload } from "@/lib/stream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

async function fetchManifest(url: string, referer: string) {
  const origin = originFromReferer(referer);
  const headerSets: Record<string, string>[] = [
    {
      "User-Agent": UA,
      Accept: "*/*",
      ...(referer ? { Referer: referer } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    {
      "User-Agent": UA,
      Accept: "*/*",
      Referer: referer || "https://www.imdb.com/",
      Origin: "https://brightpathsignals.com",
    },
    { "User-Agent": UA, Accept: "*/*" },
  ];

  let lastErr: unknown;
  for (const headers of headerSets) {
    try {
      const res = await fetch(url, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
        redirect: "follow",
      });
      if (res.ok) return res;
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
  const base = manifestUrl.substring(0, manifestUrl.lastIndexOf("/") + 1);

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
      const enc = encodeProxyPayload(abs, referer, base);
      return isM3u8Url(abs)
        ? `${prefix}/api/hls/${enc}.m3u8`
        : `${prefix}/api/seg/${enc}`;
    })
    .join("\n");
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { encoded: string } }
) {
  const encoded = params.encoded.replace(/\.m3u8$/i, "");
  const data = decodeProxyPayload(encoded);
  if (!data?.u) return new NextResponse("Bad request", { status: 400, headers: CORS });

  const manifestUrl = data.u;
  const referer = data.r || "";
  const publicOrigin = getPublicOrigin(req);

  let upstream: Response;
  try {
    upstream = await fetchManifest(manifestUrl, referer);
  } catch {
    return new NextResponse("Proxy error", { status: 502, headers: CORS });
  }

  if (!upstream.ok) {
    return new NextResponse("CDN error", { status: upstream.status, headers: CORS });
  }

  const body = await upstream.text();
  const rewritten = rewritePlaylist(body, manifestUrl, referer, publicOrigin);

  return new NextResponse(rewritten, {
    headers: {
      ...CORS,
      "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

export async function HEAD(
  req: NextRequest,
  ctx: { params: { encoded: string } }
) {
  const res = await GET(req, ctx);
  return new NextResponse(null, { status: res.status, headers: res.headers });
}
