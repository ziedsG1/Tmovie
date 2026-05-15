import { encodeProxyPayload, fetchAllHlsSources, type StreamRequest } from "../stream";
import type { ProviderContext, StreamSourceOption } from "./types";

export type { ProviderContext, StreamSourceOption, ProviderId } from "./types";
export { getFallbackEmbedProviders, getEmbedProviders } from "./embed";

export function canOfferStream(ctx: ProviderContext): boolean {
  if (ctx.type === "movie") return true;
  return ctx.season != null && ctx.episode != null;
}

export async function resolveAllStreamSources(
  ctx: ProviderContext,
  siteBase: string
): Promise<StreamSourceOption[]> {
  if (!canOfferStream(ctx)) return [];

  const req: StreamRequest = {
    imdbId: ctx.imdbId,
    type: ctx.type,
    season: ctx.season,
    episode: ctx.episode,
  };

  const hlsSources = await fetchAllHlsSources(req);
  const sources: StreamSourceOption[] = [];

  for (const s of hlsSources) {
    const variant = s.variants[0];
    if (!variant) continue;
    const enc = encodeProxyPayload(variant.url, s.referer);
    const id = s.label.toLowerCase().includes("vidsrc") ? "vidsrc" : "playimdb";
    sources.push({
      id,
      label: s.label,
      type: "hls",
      url: `${siteBase}/api/hls/${enc}.m3u8`,
      quality: variant.quality,
    });
  }

  const seen = new Set<string>();
  return sources.filter((src) => {
    const key = `${src.label}:${src.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function hasAnyStreamSource(
  ctx: ProviderContext,
  options?: { includeVidsrcFallback?: boolean }
): Promise<boolean> {
  if (!canOfferStream(ctx)) return false;
  const req = reqFromCtx(ctx);
  const { checkStreamAvailable, isPlayableStream } = await import("../stream");
  if (options?.includeVidsrcFallback) {
    return checkStreamAvailable(req, { includeVidsrcFallback: true });
  }
  return isPlayableStream(req);
}

function reqFromCtx(ctx: ProviderContext): StreamRequest {
  return {
    imdbId: ctx.imdbId,
    type: ctx.type,
    season: ctx.season,
    episode: ctx.episode,
  };
}
