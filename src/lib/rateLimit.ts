/**
 * Tiny in-memory fixed-window rate limiter for the lead endpoint.
 *
 * Good enough for a single Node server. If you deploy to serverless / several
 * instances, swap this for a shared store (Upstash Redis, Vercel KV, ...).
 */
const hits = new Map<string, { count: number; resetAt: number }>();

/** Returns true if the call is allowed, false once `limit` is exceeded inside `windowMs`. */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  // opportunistic cleanup so the map cannot grow forever
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }

  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}
