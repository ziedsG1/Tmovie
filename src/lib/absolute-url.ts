/** Turn API-relative stream URLs into absolute (required for some HLS clients on HTTPS). */
export function toAbsoluteMediaUrl(url: string, origin?: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const base =
    origin || (typeof window !== "undefined" ? window.location.origin : "");
  if (!base) return url;
  return `${base.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}
