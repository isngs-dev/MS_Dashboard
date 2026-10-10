"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { SCHEDULE } from "@/content/copy";

type Slot = { time: string; busy: boolean };
type Loaded = { key: string; slots: Slot[] | null };

type Props = {
  /** YYYY-MM-DD on the visitor's wall clock; empty until they pick one */
  date: string;
  timeZone: string;
  /** selected start time, HH:mm */
  value: string;
  onChange: (time: string) => void;
  disabled?: boolean;
  /** bump to ask the server again (e.g. after a slot turned out to be taken) */
  refreshKey: number;
  error?: string;
};

/**
 * The times that can be booked on the chosen date. Times that are already taken (or past) are
 * greyed out and cannot be picked. Native radio buttons, so arrow keys and screen readers work.
 */
export default function SlotPicker({ date, timeZone, value, onChange, disabled, refreshKey, error }: Props) {
  const name = useId();
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  // One key per request; a result only counts while it still matches (older answers are ignored).
  const key = date ? `${date}|${timeZone}|${refreshKey}|${attempt}` : "";

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(`/api/availability?${new URLSearchParams({ date, tz: timeZone })}`, { signal: controller.signal, cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data: { slots?: Slot[] }) => setLoaded({ key, slots: Array.isArray(data.slots) ? data.slots : null }))
      .catch(() => {
        if (!controller.signal.aborted) setLoaded({ key, slots: null });
      });
    return () => controller.abort();
  }, [key, date, timeZone]);

  const current = loaded?.key === key ? loaded : null;
  const loading = key !== "" && current === null;
  const slots = current?.slots ?? null;

  const format = useMemo(() => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }), []);
  const label = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return format.format(new Date(2000, 0, 1, h, m));
  };

  const hasFree = slots?.some((s) => !s.busy) ?? false;

  return (
    <fieldset disabled={disabled} className="min-w-0 border-0 p-0" aria-busy={loading}>
      <legend className="mb-2 p-0 text-sm font-semibold text-espresso">{SCHEDULE.time}</legend>

      {!date ? (
        <p className="rounded-xl border border-dashed border-taupe/40 px-4 py-5 text-sm text-faint">{SCHEDULE.pickDate}</p>
      ) : loading ? (
        <div role="status">
          <span className="sr-only">{SCHEDULE.checking}</span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-hidden>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-[2.65rem] animate-pulse rounded-xl bg-sand/70" />
            ))}
          </div>
        </div>
      ) : !slots ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {SCHEDULE.loadFailed}
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold underline underline-offset-2 hover:text-espresso">
            {SCHEDULE.retry}
          </button>
        </p>
      ) : slots.length === 0 ? (
        <p className="rounded-xl border border-dashed border-taupe/40 px-4 py-5 text-sm text-faint">{SCHEDULE.noSlots}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => {
              const text = label(slot.time);
              return (
                <label key={slot.time} className="relative block">
                  <input
                    type="radio"
                    name={`${name}-time`}
                    value={slot.time}
                    checked={value === slot.time}
                    disabled={slot.busy}
                    onChange={() => onChange(slot.time)}
                    aria-label={slot.busy ? `${text}, ${SCHEDULE.legendBusy.toLowerCase()}` : text}
                    data-slot
                    className="peer sr-only"
                  />
                  <span
                    className="block cursor-pointer rounded-xl border border-taupe/35 bg-white/80 px-2 py-2.5 text-center text-sm font-semibold tabular-nums text-espresso transition hover:border-blue hover:text-blue peer-checked:border-blue peer-checked:bg-blue peer-checked:text-white peer-checked:hover:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue/50 peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:border-transparent peer-disabled:bg-[#e8e4df] peer-disabled:text-[#a0978d] peer-disabled:line-through peer-disabled:hover:border-transparent peer-disabled:hover:text-[#a0978d]"
                  >
                    {text}
                  </span>
                </label>
              );
            })}
          </div>

          {!hasFree && <p className="mt-3 text-sm text-faint">{SCHEDULE.noSlots}</p>}

          <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-faint" aria-hidden>
            <span className="flex items-center gap-1.5">
              <i className="h-3 w-3 rounded border border-taupe/40 bg-white" />
              {SCHEDULE.legendFree}
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-3 w-3 rounded bg-[#e8e4df]" />
              {SCHEDULE.legendBusy}
            </span>
          </p>
        </>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
