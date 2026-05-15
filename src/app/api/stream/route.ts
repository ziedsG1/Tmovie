import { NextRequest, NextResponse } from "next/server";
import { getTitle } from "@/lib/imdb";
import { resolveAllStreamSources } from "@/lib/providers";
import type { StreamType } from "@/lib/stream";

export const dynamic = "force-dynamic";

function siteBase(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const imdbId = searchParams.get("imdb");
  const type = (searchParams.get("type") || "movie") as StreamType;
  const season = searchParams.get("season");
  const episode = searchParams.get("episode");
  const titleParam = searchParams.get("title");

  if (!imdbId?.startsWith("tt")) {
    return NextResponse.json({ error: "Invalid IMDb ID" }, { status: 400 });
  }

  const streamReq = {
    imdbId,
    type,
    season: season ? parseInt(season, 10) : undefined,
    episode: episode ? parseInt(episode, 10) : undefined,
  };

  let title = titleParam || undefined;
  if (!title) {
    const details = await getTitle(imdbId).catch(() => null);
    title = details?.title;
  }

  const sources = await resolveAllStreamSources({ ...streamReq, title }, siteBase(req));

  if (!sources.length) {
    return NextResponse.json(
      {
        error: "No stream sources available",
        hint:
          "Providers may not have this title or episode yet (common for very new releases). Try another episode or check back later.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    imdbId,
    type,
    season: streamReq.season,
    episode: streamReq.episode,
    title,
    sources,
    streams: sources.filter((s) => s.type === "hls"),
    embeds: sources.filter((s) => s.type === "embed"),
    playImdbUrl: `https://www.playimdb.com/title/${imdbId}/`,
  });
}
