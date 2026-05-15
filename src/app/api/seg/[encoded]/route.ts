import { NextRequest, NextResponse } from "next/server";
import { decodeProxyPayload } from "@/lib/stream";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function GET(
  req: NextRequest,
  { params }: { params: { encoded: string } }
) {
  const encoded = params.encoded.replace(/\.ts$/, "");
  const data = decodeProxyPayload(encoded);
  if (!data?.u) return new NextResponse("Bad request", { status: 400 });

  const referer = data.r || "";
  const range = req.headers.get("range");

  try {
    const upstream = await fetch(data.u, {
      headers: {
        "User-Agent": UA,
        ...(referer ? { Referer: referer, Origin: "https://brightpathsignals.com" } : {}),
        ...(range ? { Range: range } : {}),
      },
      signal: AbortSignal.timeout(30000),
      redirect: "follow",
    });

    const headers = new Headers();
    const pass = ["content-type", "content-length", "content-range", "accept-ranges", "etag"];
    for (const h of pass) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    if (!headers.has("accept-ranges")) headers.set("Accept-Ranges", "bytes");
    headers.set("Access-Control-Allow-Origin", "*");

    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch {
    return new NextResponse("Proxy error", { status: 502 });
  }
}

export async function HEAD(
  req: NextRequest,
  ctx: { params: { encoded: string } }
) {
  const res = await GET(req, ctx);
  return new NextResponse(null, { status: res.status, headers: res.headers });
}
