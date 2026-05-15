import { NextRequest, NextResponse } from "next/server";
import { proxySegmentRequest } from "@/lib/hls-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/** Short URL fallback when encoded path would exceed platform limits. */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("p");
  if (!p) return new NextResponse("Bad request", { status: 400, headers: CORS });
  try {
    return await proxySegmentRequest(req, p);
  } catch {
    return new NextResponse("Proxy error", { status: 502, headers: CORS });
  }
}
