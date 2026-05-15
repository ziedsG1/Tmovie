import { NextRequest, NextResponse } from "next/server";
import { proxySegmentRequest } from "@/lib/hls-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type",
};

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
  try {
    return await proxySegmentRequest(req, encoded);
  } catch {
    return new NextResponse("Proxy error", { status: 502, headers: CORS });
  }
}

export async function HEAD(
  req: NextRequest,
  ctx: { params: { encoded: string } }
) {
  const res = await GET(req, ctx);
  return new NextResponse(null, { status: res.status, headers: res.headers });
}
