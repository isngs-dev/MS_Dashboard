/**
 * Lead form + meeting validation, shared by the browser (inline errors) and the API
 * route (never trust the client), so the rules live in exactly one place.
 */

import { isDateString, isTimeString, isValidTimeZone, zonedTimeToUtc } from "./time";

export type LeadPayload = {
  name: string;
  company: string;
  phone: string;
  email: string;
};

export type LeadErrors = Partial<Record<keyof LeadPayload, string>>;

/** A meeting the visitor chose in the "Schedule a Meet" pop-up. */
export type MeetingRequest = {
  /** YYYY-MM-DD, wall-clock date in `timeZone` */
  date: string;
  /** HH:mm (24h), wall-clock time in `timeZone` */
  time: string;
  /** IANA zone of the visitor, e.g. "Africa/Lagos" */
  timeZone: string;
};

export type MeetingErrors = { date?: string; time?: string };

export const MIN_LEAD_MINUTES = 30;
export const MAX_DAYS_AHEAD = 90;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// digits plus the usual separators; 7-15 digits covers local through E.164 numbers
const PHONE_CHARS_RE = /^\+?[\d\s().-]+$/;

const MAX_LEN = { name: 100, company: 150, phone: 30, email: 254 } as const;

export const FIELD_ORDER: (keyof LeadPayload)[] = ["name", "company", "phone", "email"];

export function validateField(field: keyof LeadPayload, raw: string): string | undefined {
  const value = raw.trim();
  if (value.length > MAX_LEN[field]) return `Please keep this under ${MAX_LEN[field]} characters.`;
  switch (field) {
    case "name":
      if (!value) return "Please enter your name.";
      if (value.length < 2) return "Your name looks too short.";
      return undefined;
    case "company":
      if (!value) return "Please enter your company name.";
      return undefined;
    case "phone": {
      if (!value) return "Please enter your phone number.";
      const digits = value.replace(/\D/g, "");
      if (!PHONE_CHARS_RE.test(value) || digits.length < 7 || digits.length > 15) {
        return "Enter a valid phone number (7 to 15 digits).";
      }
      return undefined;
    }
    case "email":
      if (!value) return "Please enter your email address.";
      if (!EMAIL_RE.test(value)) return "Enter a valid email address.";
      return undefined;
  }
}

export function validateLead(values: LeadPayload): LeadErrors {
  const errors: LeadErrors = {};
  for (const field of FIELD_ORDER) {
    const message = validateField(field, values[field] ?? "");
    if (message) errors[field] = message;
  }
  return errors;
}

export function normalizeLead(values: LeadPayload): LeadPayload {
  return {
    name: values.name.trim(),
    company: values.company.trim(),
    phone: values.phone.trim(),
    email: values.email.trim().toLowerCase(),
  };
}

/** Checks the chosen slot is well-formed and between 30 minutes and 90 days from `now`. */
export function validateMeeting(m: Partial<MeetingRequest>, now: Date = new Date()): MeetingErrors {
  const errors: MeetingErrors = {};
  const date = (m.date ?? "").trim();
  const time = (m.time ?? "").trim();

  if (!date) errors.date = "Please choose a date.";
  else if (!isDateString(date)) errors.date = "Please choose a valid date.";
  if (!time) errors.time = "Please choose a time.";
  else if (!isTimeString(time)) errors.time = "Please choose a valid time.";
  if (errors.date || errors.time) return errors;

  const timeZone = m.timeZone && isValidTimeZone(m.timeZone) ? m.timeZone : "UTC";
  const when = zonedTimeToUtc(date, time, timeZone);
  if (!when) {
    errors.date = "Please choose a valid date and time.";
    return errors;
  }

  const ahead = when.getTime() - now.getTime();
  if (ahead < MIN_LEAD_MINUTES * 60_000) errors.time = `Please choose a time at least ${MIN_LEAD_MINUTES} minutes from now.`;
  else if (ahead > MAX_DAYS_AHEAD * 86_400_000) errors.date = `Please choose a date within the next ${MAX_DAYS_AHEAD} days.`;
  return errors;
}
