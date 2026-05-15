import { NextRequest, NextResponse } from "next/server";
import { decodeProxyPayload } from "@/lib/stream";

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

function stripProxySuffix(encoded: string): string {
  return encoded.replace(/\.(ts|m4s|mp4|aac|vtt|cmfv)$/i, "");
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { encoded: string } }
) {
  const encoded = stripProxySuffix(params.encoded);
  const data = decodeProxyPayload(encoded);
  if (!data?.u) return new NextResponse("Bad request", { status: 400, headers: CORS });

  const referer = data.r || "";
  const origin = originFromReferer(referer);
  const range = req.headers.get("range");

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

  let upstream: Response | null = null;
  for (const headers of headerSets) {
    try {
      const res = await fetch(data.u, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
        redirect: "follow",
      });
      if (res.ok || res.status === 206) {
        upstream = res;
        break;
      }
    } catch {
      /* try next */
    }
  }

  if (!upstream) return new NextResponse("Proxy error", { status: 502, headers: CORS });

  const buf = await upstream.arrayBuffer();
  const headers = new Headers(CORS);
  const pass = ["content-type", "content-length", "content-range", "accept-ranges", "etag"];
  for (const h of pass) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (!headers.has("content-length")) {
    headers.set("Content-Length", String(buf.byteLength));
  }
  if (!headers.has("accept-ranges")) headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "no-cache");

  return new NextResponse(buf, { status: upstream.status, headers });
}

export async function HEAD(
  req: NextRequest,
  ctx: { params: { encoded: string } }
) {
  const res = await GET(req, ctx);
  return new NextResponse(null, { status: res.status, headers: res.headers });
}
