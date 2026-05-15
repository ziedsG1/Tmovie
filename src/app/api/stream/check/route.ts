import { NextRequest, NextResponse } from "next/server";
import { hasAnyStreamSource } from "@/lib/providers";
import { getTitle } from "@/lib/imdb";
import { checkPlayableBatch, type StreamType } from "@/lib/stream";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const imdbId = searchParams.get("imdb");
  const type = (searchParams.get("type") || "movie") as StreamType;
  const season = searchParams.get("season");
  const episode = searchParams.get("episode");

  if (!imdbId?.startsWith("tt")) {
    return NextResponse.json({ error: "Invalid IMDb ID" }, { status: 400 });
  }

  const deep = searchParams.get("deep") === "1";
  const details = await getTitle(imdbId).catch(() => null);
  const available = await hasAnyStreamSource(
    {
      imdbId,
      type,
      season: season ? parseInt(season, 10) : undefined,
      episode: episode ? parseInt(episode, 10) : undefined,
      title: details?.title,
    },
    { includeVidsrcFallback: deep }
  );

  return NextResponse.json({ imdbId, type, season, episode, available });
}

export async function POST(req: NextRequest) {
  let body: {
    items?: { imdbId: string; type: StreamType; season?: number; episode?: number; title?: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = body.items?.filter((i) => i.imdbId?.startsWith("tt")) || [];
  const results = await checkPlayableBatch(items, 12);

  return NextResponse.json({ results });
}
