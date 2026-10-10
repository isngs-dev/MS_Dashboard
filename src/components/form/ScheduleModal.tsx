"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import FloatingField from "@/components/form/FloatingField";
import SlotPicker from "@/components/form/SlotPicker";
import { useReducedMotion } from "@/hooks/useQuality";
import { getLenis } from "@/lib/scroll";
import { MAX_DAYS_AHEAD, validateMeeting, type MeetingRequest } from "@/lib/validation";
import { FORM, SCHEDULE } from "@/content/copy";

type Props = {
  open: boolean;
  /** where the confirmation email will go (shown so the visitor can double-check it) */
  email: string;
  /** which action is currently being sent, if any */
  pending: "book" | "skip" | null;
  /** what went wrong with the last attempt: slot already taken, booking failed, or the plain email failed */
  failure: "slot" | "book" | "skip" | null;
  /** the visitor changed the date or time (clears a "slot taken" message) */
  onEdit: () => void;
  onBook: (meeting: MeetingRequest) => void;
  onSkip: () => void;
  /** close without sending anything and go back to the form */
  onClose: () => void;
};

const noopSubscribe = () => () => {};

/** YYYY-MM-DD in the visitor's local time (what <input type="date"> expects). */
function localDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.28" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * "Schedule a Meet" pop-up shown after the contact form is submitted.
 * The visitor either picks a date and time (-> confirmation with the meeting link)
 * or taps "No, thanks, just email me" (-> normal confirmation email).
 * Rendered in a portal because the form card sits inside 3D-transformed ancestors,
 * which would otherwise break `position: fixed`.
 */
export default function ScheduleModal(props: Props) {
  // false during SSR and hydration, true afterwards (portals need a document)
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!isClient) return null;
  return createPortal(<AnimatePresence>{props.open && <Dialog key="schedule" {...props} />}</AnimatePresence>, document.body);
}

function Dialog({ email, pending, failure, onEdit, onBook, onSkip, onClose }: Props) {
  const reduced = useReducedMotion();
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const busy = pending !== null;

  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);
  const [today] = useState(() => localDate(new Date()));
  const [latest] = useState(() => localDate(new Date(Date.now() + MAX_DAYS_AHEAD * 86_400_000)));

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [touched, setTouched] = useState({ date: false, time: false });
  // bumped to make the time picker ask the server again
  const [refresh, setRefresh] = useState(0);
  const [seenFailure, setSeenFailure] = useState<Props["failure"]>(null);

  // The server says the chosen time was just taken: forget it and show the times as they are now.
  if (failure !== seenFailure) {
    setSeenFailure(failure);
    if (failure === "slot") {
      setTime("");
      setRefresh((n) => n + 1);
    }
  }

  // errors are computed live but only shown for fields the visitor has visited
  const live = validateMeeting({ date, time, timeZone });
  const shown = { date: touched.date ? live.date : undefined, time: touched.time ? live.time : undefined };

  // lock page scroll (Lenis or native), move focus into the dialog, restore it on close
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const lenis = getLenis();
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    if (lenis) lenis.stop();
    else root.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => dialog.current?.querySelector<HTMLInputElement>("#meet-date")?.focus(), 90);
    return () => {
      window.clearTimeout(focusTimer);
      if (lenis) lenis.start();
      else root.style.overflow = previousOverflow;
      previous?.focus?.();
    };
  }, []);

  const handleBook = () => {
    setTouched({ date: true, time: true });
    const errors = validateMeeting({ date, time, timeZone });
    if (errors.date || errors.time) {
      dialog.current?.querySelector<HTMLInputElement>(errors.date ? "#meet-date" : "input[data-slot]:not(:disabled)")?.focus();
      return;
    }
    onBook({ date, time, timeZone });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      if (!busy) onClose();
      return;
    }
    if (e.key !== "Tab" || !dialog.current) return;

    // keep Tab inside the dialog
    const focusable = [
      ...dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'),
    ];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto bg-espresso/45 p-3 backdrop-blur-[3px] sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
      data-lenis-prevent
    >
      <motion.div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="glass gborder gborder-live relative my-auto w-full max-w-[34rem] rounded-[2rem] p-6 sm:p-9"
        style={{ backgroundColor: "#fffdf9" }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label={SCHEDULE.back}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-sand hover:text-espresso disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue/10 text-blue" aria-hidden>
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="5" width="17" height="15" rx="3" />
            <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
            <path d="M8.5 14.5h2M13.5 14.5h2M8.5 17.5h2" />
          </svg>
        </div>

        <h2 id={titleId} className="mt-5 font-display text-3xl font-bold text-espresso sm:text-4xl">
          {SCHEDULE.title}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted">{SCHEDULE.body}</p>
        <p className="mt-1 break-all text-sm text-faint">{email}</p>

        <div className="mt-6 grid gap-5">
          <FloatingField
            id="meet-date"
            name="meeting-date"
            type="date"
            label={SCHEDULE.date}
            value={date}
            min={today}
            max={latest}
            forceFloat
            disabled={busy}
            error={shown.date}
            touched={touched.date}
            onChange={(v) => {
              setDate(v);
              setTime(""); // the times differ from day to day
              onEdit();
            }}
            onBlur={() => setTouched((t) => ({ ...t, date: true }))}
          />
          <SlotPicker
            date={date && !live.date ? date : ""}
            timeZone={timeZone}
            value={time}
            refreshKey={refresh}
            disabled={busy}
            // after "that time was just taken" the message at the bottom already says what to do
            error={failure === "slot" ? undefined : shown.time}
            onChange={(v) => {
              setTime(v);
              setTouched((t) => ({ ...t, time: true }));
              onEdit();
            }}
          />
        </div>
        <p className="mt-3 text-sm text-faint">
          {SCHEDULE.timezone}: <span className="font-medium text-muted">{timeZone.replace(/_/g, " ")}</span>
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <button type="button" onClick={handleBook} disabled={busy} aria-busy={pending === "book"} className="btn-cta btn-pulse w-full px-8 py-4 text-base sm:text-lg">
            {pending === "book" ? (
              <>
                <Spinner />
                <span>{SCHEDULE.booking}</span>
              </>
            ) : (
              <span>{SCHEDULE.book}</span>
            )}
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            aria-busy={pending === "skip"}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-taupe/40 bg-white/70 px-6 py-3.5 text-[0.95rem] font-semibold text-espresso transition hover:border-blue hover:text-blue disabled:cursor-progress disabled:opacity-60"
          >
            {pending === "skip" ? (
              <>
                <Spinner />
                <span>{SCHEDULE.sending}</span>
              </>
            ) : (
              <span>{SCHEDULE.skip}</span>
            )}
          </button>
        </div>

        <p role="alert" className={`mt-4 text-center text-sm text-danger ${failure ? "" : "sr-only"}`}>
          {failure === "slot" ? SCHEDULE.unavailable : failure === "book" ? SCHEDULE.bookFailed : failure === "skip" ? FORM.error : ""}
        </p>
      </motion.div>
    </motion.div>
  );
}
