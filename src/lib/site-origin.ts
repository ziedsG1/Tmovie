import type { NextRequest } from "next/server";

/** Public site origin — always match the deployment the user is actually on. */
export function getPublicOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";

  if (host) {
    const origin = `${proto}://${host.split(",")[0].trim()}`.replace(/\/$/, "");
    const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (env && !/localhost|127\.0\.0\.1/i.test(env)) {
      try {
        const envHost = new URL(env).host;
        if (envHost && envHost !== new URL(origin).host) {
          return origin;
        }
      } catch {
        /* use request origin */
      }
    }
    return origin;
  }

  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env && !/localhost|127\.0\.0\.1/i.test(env)) {
    return env.replace(/\/$/, "");
  }

  return req.nextUrl.origin.replace(/\/$/, "");
}
