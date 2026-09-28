"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

/* Everything works on "YYYY-MM-DD" keys in UTC, so a date never shifts with the viewer's timezone. */
const pad = (n) => String(n).padStart(2, "0");
const keyOf = (y, m, d) => { const t = new Date(Date.UTC(y, m, d)); return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`; };
const partsOf = (key) => key.split("-").map(Number);
const weekdayOf = (key) => { const [y, m, d] = partsOf(key); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
const WEEK = [["Mon", 1], ["Tue", 2], ["Wed", 3], ["Thu", 4], ["Fri", 5], ["Sat", 6], ["Sun", 0]];

/**
 * Inline calendar for picking separate days: tap a day to add it, tap it again to remove it (e.g. 28, 29 and 3).
 * value: sorted date keys · daysOff: weekday numbers (0 = Sunday) · holidays: [{ date, name }] — neither can be picked.
 * single: only one day can be chosen (e.g. half-day leave); picking another replaces it.
 */
export function DatesPicker({ label, value = [], onChange, error, hint, required, single = false, daysOff = [], holidays = [], today, min, max = 62 }) {
  const anchor = value[0] || today || keyOf(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const [view, setView] = useState(() => { const [y, m] = partsOf(anchor); return { y, m: m - 1 }; });
  const holidayName = new Map(holidays.map((h) => [h.date, h.name]));
  const chosen = new Set(value);

  const first = keyOf(view.y, view.m, 1);
  const lead = (weekdayOf(first) + 6) % 7; // Monday-first
  const count = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => keyOf(view.y, view.m, i + 1))];
  const move = (by) => setView(({ y, m }) => { const t = new Date(Date.UTC(y, m + by, 1)); return { y: t.getUTCFullYear(), m: t.getUTCMonth() }; });
  const monthLabel = formatDate(first, { month: "long", year: "numeric" });
  const inThisMonth = value.filter((k) => k.startsWith(first.slice(0, 7))).length;

  const toggle = (k) => {
    if (single) return onChange(chosen.has(k) ? [] : [k]);
    if (chosen.has(k)) return onChange(value.filter((d) => d !== k));
    if (value.length < max) onChange([...value, k].sort());
  };

  return (
    <div className="space-y-1.5">
      {label && <p className="text-sm font-medium text-ink">{label} {required && <span className="text-red-600" aria-hidden>*</span>}</p>}
      <div className={cn("rounded-xl border bg-white p-3", error ? "border-red-500" : "border-line")}>
        <div className="mb-2 flex items-center justify-between">
          <button type="button" onClick={() => move(-1)} aria-label="Previous month" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-slate-100 active:bg-slate-200"><ChevronLeft className="size-5" aria-hidden /></button>
          <p className="text-sm font-semibold" aria-live="polite">{monthLabel}{inThisMonth > 0 && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{inThisMonth}</span>}</p>
          <button type="button" onClick={() => move(1)} aria-label="Next month" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-slate-100 active:bg-slate-200"><ChevronRight className="size-5" aria-hidden /></button>
        </div>
        <div role="grid" aria-label={monthLabel} aria-multiselectable={!single} className="grid grid-cols-7 gap-y-1 text-center">
          {WEEK.map(([name, wd]) => <span key={name} role="columnheader" className={cn("pb-1 text-[11px] font-semibold uppercase tracking-wide", daysOff.includes(wd) ? "text-slate-300" : "text-muted")}>{name}</span>)}
          {cells.map((k, i) => {
            if (!k) return <span key={`b${i}`} />;
            const holiday = holidayName.get(k);
            const off = daysOff.includes(weekdayOf(k)) || Boolean(holiday);
            const disabled = off || Boolean(min && k < min);
            const on = chosen.has(k);
            return (
              <div key={k} role="gridcell" aria-selected={on} className="py-0.5">
                <button type="button" disabled={disabled} onClick={() => toggle(k)} aria-pressed={on} title={holiday ?? (off ? "Day off" : undefined)}
                  aria-label={`${formatDate(k, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}${holiday ? `, holiday: ${holiday}` : off ? ", day off" : ""}`}
                  className={cn("relative mx-auto grid size-10 place-items-center rounded-full text-sm tabular-nums transition-colors sm:size-9",
                    on ? "bg-brand-600 font-semibold text-white hover:bg-brand-700" : disabled ? "cursor-not-allowed text-slate-300" : "text-ink hover:bg-brand-50 hover:text-brand-700")}>
                  {partsOf(k)[2]}
                  {k === today && !on && <span aria-hidden className="absolute bottom-1 size-1 rounded-full bg-brand-600" />}
                  {holiday && <span aria-hidden className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-purple-400" />}
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-2 text-xs text-muted">
          <span>{single ? "Tap the day" : "Tap each day you need. Tap again to remove it."}</span>
          <span className="flex items-center gap-3"><span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-purple-400" />Holiday</span><span className="text-slate-400">Grey = day off</span></span>
        </div>
      </div>
      {error ? <p role="alert" className="text-xs text-red-600">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
