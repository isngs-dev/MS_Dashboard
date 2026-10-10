import { normalizeLead, type LeadPayload, type MeetingRequest } from "./validation";

type Options = {
  /** set when the visitor booked a call in the "Schedule a Meet" pop-up */
  meeting?: MeetingRequest;
  /** honeypot value (should always be empty for real visitors) */
  website?: string;
};

/** Thrown for any non-2xx answer; `code` is the server's error key (e.g. "slot_unavailable"). */
export class SubmitError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
  ) {
    super(`Lead submission failed with status ${status}`);
    this.name = "SubmitError";
  }
}

export type SubmitResult = {
  /** false in local dev without SendGrid keys (the email is written to .dev-outbox instead) */
  delivered: boolean;
  booked: boolean;
};

/**
 * Sends the lead to /api/lead (src/app/api/lead/route.ts), which emails the
 * confirmation through SendGrid. Resolves on success, throws on any failure so
 * the UI can show its error state.
 */
export async function submitLead(payload: LeadPayload, options: Options = {}): Promise<SubmitResult> {
  const response = await fetch("/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...normalizeLead(payload), meeting: options.meeting, website: options.website ?? "" }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: unknown };
    throw new SubmitError(response.status, typeof data.error === "string" ? data.error : undefined);
  }

  const data = (await response.json().catch(() => ({}))) as Partial<SubmitResult>;
  return { delivered: data.delivered !== false, booked: Boolean(data.booked) };
}
