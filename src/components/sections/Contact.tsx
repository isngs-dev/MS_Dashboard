"use client";

import { useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import RevealHeading from "@/components/ui/RevealHeading";
import MagneticWrap from "@/components/ui/MagneticWrap";
import TiltCard from "@/components/features/TiltCard";
import FloatingField from "@/components/form/FloatingField";
import ScheduleModal from "@/components/form/ScheduleModal";
import SuccessState from "@/components/form/SuccessState";
import { FormScene } from "@/components/three/lazy";
import { useReducedMotion } from "@/hooks/useQuality";
import { submitLead, SubmitError } from "@/lib/submitLead";
import {
  FIELD_ORDER,
  validateField,
  validateLead,
  type LeadErrors,
  type LeadPayload,
  type MeetingRequest,
} from "@/lib/validation";
import { FORM } from "@/content/copy";

type Status = "idle" | "submitting" | "success";
type Touched = Partial<Record<keyof LeadPayload, boolean>>;

const EMPTY: LeadPayload = { name: "", company: "", phone: "", email: "" };

const FIELD_PROPS = {
  name: { label: FORM.fields.name, type: "text", autoComplete: "name" },
  company: { label: FORM.fields.company, type: "text", autoComplete: "organization" },
  phone: { label: FORM.fields.phone, type: "tel", autoComplete: "tel", inputMode: "tel" as const },
  email: { label: FORM.fields.email, type: "email", autoComplete: "email", inputMode: "email" as const },
} as const;

/** "Tuesday, October 14 at 3:00 PM": the booked slot, in the visitor's own time zone. */
function describeMeeting(m: MeetingRequest): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(`${m.date}T${m.time}`));
}

export default function Contact() {
  const reduced = useReducedMotion();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<LeadPayload>(EMPTY);
  const [errors, setErrors] = useState<LeadErrors>({});
  const [touched, setTouched] = useState<Touched>({});
  const [status, setStatus] = useState<Status>("idle");

  // "Schedule a Meet" pop-up state
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [pending, setPending] = useState<"book" | "skip" | null>(null);
  const [failure, setFailure] = useState<"slot" | "book" | "skip" | null>(null);
  const [booked, setBooked] = useState<string | null>(null);
  // honeypot: real visitors never see this field, bots tend to fill it
  const [trap, setTrap] = useState("");

  const setError = (field: keyof LeadPayload, message: string | undefined) =>
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });

  const handleChange = (field: keyof LeadPayload, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    // once a field has been visited, re-validate live as the user types
    if (touched[field]) setError(field, validateField(field, value));
  };

  const handleBlur = (field: keyof LeadPayload) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setError(field, validateField(field, values[field]));
  };

  // Submitting the form validates it, then opens the "Schedule a Meet" pop-up.
  // Nothing is sent until the visitor picks one of its two options.
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const found = validateLead(values);
    setTouched({ name: true, company: true, phone: true, email: true });
    setErrors(found);
    const firstInvalid = FIELD_ORDER.find((f) => found[f]);
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLInputElement>(`#lead-${firstInvalid}`)?.focus();
      return;
    }

    setStatus("idle");
    setFailure(null);
    setScheduleOpen(true);
  };

  // meeting set -> "call booked" email with the meeting link; no meeting -> normal confirmation
  const send = async (meeting?: MeetingRequest) => {
    if (pending) return;
    setPending(meeting ? "book" : "skip");
    setFailure(null);
    setStatus("submitting");
    try {
      await submitLead(values, { meeting, website: trap });
      setBooked(meeting ? describeMeeting(meeting) : null);
      setStatus("success");
      setScheduleOpen(false);
    } catch (error) {
      setStatus("idle");
      // 409 = someone else holds that slot in the calendar; anything else is a plain failure
      setFailure(error instanceof SubmitError && error.code === "slot_unavailable" ? "slot" : meeting ? "book" : "skip");
    } finally {
      setPending(null);
    }
  };

  const closeSchedule = () => {
    if (pending) return;
    setScheduleOpen(false);
    setFailure(null);
    setStatus("idle");
  };

  return (
    <section
      id="build"
      tabIndex={-1}
      aria-labelledby="build-title"
      className="relative overflow-hidden px-5 py-28 outline-none sm:px-8 sm:py-40"
    >
      {/* drifting particles + ghosted 3D dashboard silhouette */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.5] [mask-image:radial-gradient(ellipse_85%_80%_at_60%_50%,#000_35%,transparent_88%)]">
        <FormScene />
      </div>
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[70vw] max-h-[900px] w-[70vw] max-w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(224_178_142/0.35),transparent_70%)]" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.02fr_1fr] lg:gap-20">
        <div>
          <RevealHeading
            as="h2"
            id="build-title"
            text={FORM.headline}
            highlight={["Around", "Your", "Business"]}
            className="font-display text-[clamp(2.2rem,4.8vw,4.4rem)] font-bold leading-[1.03] text-espresso"
          />
          <p className="mt-7 max-w-xl text-base leading-relaxed text-muted sm:text-lg">{FORM.body}</p>
        </div>

        <motion.div
          animate={reduced ? undefined : { y: [0, -9, 0] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          <div aria-hidden className="absolute -inset-4 rounded-[2.4rem] bg-gradient-to-br from-blue/15 via-sky/10 to-clay/25 blur-3xl" />
          <TiltCard border="live" max={4.5} className="rounded-[2rem]" glassClassName="glass-blur">
            <div className="relative z-10 p-6 sm:p-9" style={{ transform: "translateZ(28px)" }}>
              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <SuccessState key="success" email={values.email.trim()} booked={booked} />
                ) : (
                  <motion.form
                    key="form"
                    ref={formRef}
                    noValidate
                    onSubmit={handleSubmit}
                    aria-label={FORM.headline}
                    exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-col gap-4"
                  >
                    {FIELD_ORDER.map((field) => (
                      <FloatingField
                        key={field}
                        id={`lead-${field}`}
                        name={field}
                        value={values[field]}
                        error={errors[field]}
                        touched={touched[field]}
                        onChange={(v) => handleChange(field, v)}
                        onBlur={() => handleBlur(field)}
                        {...FIELD_PROPS[field]}
                      />
                    ))}

                    {/* honeypot (hidden from people and screen readers) */}
                    <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                      <label>
                        Website
                        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
                      </label>
                    </div>

                    <div className="mt-3">
                      <MagneticWrap block strength={0.18}>
                        <button type="submit" className="btn-cta btn-pulse w-full px-8 py-4 text-base sm:text-lg">
                          <span>{FORM.submit}</span>
                        </button>
                      </MagneticWrap>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </TiltCard>
        </motion.div>
      </div>

      <ScheduleModal
        open={scheduleOpen}
        email={values.email.trim()}
        pending={pending}
        failure={failure}
        onEdit={() => setFailure((f) => (f === "slot" ? null : f))}
        onBook={(meeting) => send(meeting)}
        onSkip={() => send()}
        onClose={closeSchedule}
      />
    </section>
  );
}
