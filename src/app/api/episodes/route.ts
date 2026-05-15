import { NextRequest, NextResponse } from "next/server";
import { getSeasonEpisodesMulti } from "@/lib/episodes";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const imdbId = req.nextUrl.searchParams.get("imdb");
  const season = req.nextUrl.searchParams.get("season");

  if (!imdbId?.startsWith("tt") || !season) {
    return NextResponse.json({ error: "imdb and season required" }, { status: 400 });
  }

  const seasonNum = parseInt(season, 10);
  if (Number.isNaN(seasonNum)) {
    return NextResponse.json({ error: "invalid season" }, { status: 400 });
  }

  try {
    const { episodes, source, sourcesTried } = await getSeasonEpisodesMulti(imdbId, seasonNum);
    return NextResponse.json({
      imdbId,
      season: seasonNum,
      episodes,
      source,
      sourcesTried,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load episodes" },
      { status: 500 }
    );
  }
}
