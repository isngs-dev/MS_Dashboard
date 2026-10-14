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
// digits plus the usual separators, then checked as a US (NANP) number
const PHONE_CHARS_RE = /^\+?[\d\s().-]+$/;

/** The visitor's digits as a US national number: no country code, at most 10 digits. */
const usDigits = (raw: string) => raw.replace(/\D/g, "").replace(/^1/, "").slice(0, 10);

/** "(555) 123-4567" as far as the digits go; used while typing. Separators only appear once a digit follows them. */
export function formatUsPhone(raw: string): string {
  const d = usDigits(raw);
  if (d.length <= 3) return d && `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** NANP: 10 digits, area code and exchange both start with 2-9. */
const isUsPhone = (raw: string) => PHONE_CHARS_RE.test(raw) && /^[2-9]\d{2}[2-9]\d{6}$/.test(usDigits(raw));

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
      return isUsPhone(value) ? undefined : "Enter a valid US phone number, like (555) 234-5678.";
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
    phone: isUsPhone(values.phone.trim()) ? formatUsPhone(values.phone) : values.phone.trim(),
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
