import type { StreamType } from "../stream";

export type ProviderId = "playimdb" | "vidsrc";

export type StreamDelivery = "hls" | "embed";

export interface StreamSourceOption {
  id: ProviderId;
  label: string;
  type: StreamDelivery;
  url: string;
  quality?: string;
}

export interface ProviderContext {
  imdbId: string;
  type: StreamType;
  season?: number;
  episode?: number;
  title?: string;
}
