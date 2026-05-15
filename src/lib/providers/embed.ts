import type { ProviderContext, StreamSourceOption } from "./types";

/**
 * Iframe embeds (VidSrc, 2Embed, etc.) are not used — they block sandboxed players
 * or require removing sandbox (popups/ads). Use HLS via fetchAllHlsSources() instead.
 */
export function getFallbackEmbedProviders(_ctx: ProviderContext): StreamSourceOption[] {
  return [];
}

export function getEmbedProviders(ctx: ProviderContext): StreamSourceOption[] {
  return getFallbackEmbedProviders(ctx);
}
