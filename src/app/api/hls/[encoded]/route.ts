import { NextRequest, NextResponse } from "next/server";
import { decodeProxyPayload, encodeProxyPayload } from "@/lib/stream";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function siteBase(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
}

async function fetchManifest(url: string, referer: string) {
  return fetch(url, {
    headers: {
      "User-Agent": UA,
      ...(referer ? { Referer: referer, Origin: "https://brightpathsignals.com" } : {}),
    },
    signal: AbortSignal.timeout(12000),
    redirect: "follow",
  });
}

function rewritePlaylist(
  body: string,
  manifestUrl: string,
  referer: string,
  baseUrl: string
): string {
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
        abs = t;
      }
      const enc = encodeProxyPayload(abs, referer, base);
      return abs.includes(".m3u8")
        ? `${baseUrl}/api/hls/${enc}.m3u8`
        : `${baseUrl}/api/seg/${enc}.ts`;
    })
    .join("\n");
}

export async function GET(
  req: NextRequest,
  { params }: { params: { encoded: string } }
) {
  const encoded = params.encoded.replace(/\.m3u8$/, "");
  const data = decodeProxyPayload(encoded);
  if (!data?.u) return new NextResponse("Bad request", { status: 400 });

  const manifestUrl = data.u;
  const referer = data.r || "";
  const origin = siteBase(req);

  let upstream: Response;
  try {
    upstream = await fetchManifest(manifestUrl, referer);
  } catch {
    return new NextResponse("Proxy error", { status: 502 });
  }

  if (!upstream.ok) return new NextResponse("CDN error", { status: upstream.status });

  const body = await upstream.text();
  const rewritten = rewritePlaylist(body, manifestUrl, referer, origin);

  return new NextResponse(rewritten, {
    headers: {
      "Content-Type": "application/vnd.apple.mpegurl",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
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
