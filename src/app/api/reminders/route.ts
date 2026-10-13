import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET or POST /api/reminders   (header: Authorization: Bearer <CRON_SECRET>)
 *
 * Sends the "your call is tomorrow" emails that are due. For an outside scheduler (cron-job.org,
 * a Render cron job, ...) as an alternative or addition to the built-in one (REMINDERS_ENABLED).
 * Add ?dryRun=1 to only count what is due without sending anything.
 * The answer contains counts only, never names or addresses.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return json({ ok: false, error: "not_configured" }, 503);

  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  // compare fixed-length digests so the check takes the same time wherever the first difference is
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(digest(given), digest(secret))) return json({ ok: false, error: "unauthorized" }, 401);

  try {
    const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
    const result = await sendDueReminders({ dryRun });
    return json({ ok: true, dryRun, ...result });
  } catch (error) {
    console.error("[reminders] endpoint failed:", error instanceof Error ? error.message : error);
    return json({ ok: false, error: "failed" }, 502);
  }
}

export const GET = handle;
export const POST = handle;

function json(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
