"use client";
import { useId, useState } from "react";
import { Check, ChevronDown, Eye, EyeOff, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// 16px on phones: anything smaller makes iOS Safari zoom the page when the field is focused.
const control = "block w-full rounded-lg border bg-white px-3 text-base text-ink placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500 sm:text-sm";
const ok = "border-line focus:border-brand-600";
const bad = "border-red-500";

/** Label + control + hint/error wiring for accessibility. `children` is a render prop receiving aria props. */
export function Field({ label, error, hint, required, children, className }) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {label} {required && <span className="text-red-600" aria-hidden>*</span>}
        </label>
      )}
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {error ? <p id={`${id}-err`} role="alert" className="text-xs text-red-600">{error}</p> : hint ? <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Input({ label, error, hint, required, className, ref, type, ...props }) {
  const isPassword = type === "password";
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(a) => (
        <div className="relative">
          <input ref={ref} type={isPassword && visible ? "text" : type} className={cn(control, "h-12 sm:h-10", error ? bad : ok, isPassword && "pr-12", className)} {...a} {...props} />
          {isPassword && (
            // Show/hide: a real button (keyboard + screen-reader friendly), 44px touch target on phones.
            <button type="button" onClick={() => setVisible((v) => !v)} aria-pressed={visible} aria-label={visible ? "Hide password" : "Show password"}
              className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink active:bg-slate-200 sm:size-8">
              {visible ? <EyeOff className="size-5 sm:size-4" aria-hidden /> : <Eye className="size-5 sm:size-4" aria-hidden />}
            </button>
          )}
        </div>
      )}
    </Field>
  );
}

/**
 * A duration entered as hours + minutes. The value it reads and reports is TOTAL MINUTES (what the API stores),
 * so forms and schemas keep working in minutes while people never have to convert.
 */
export function DurationInput({ label, error, hint, required, value, onChange, onBlur, disabled, name }) {
  const total = value === "" || value === null || value === undefined || Number.isNaN(Number(value)) ? null : Math.max(0, Math.round(Number(value)));
  const part = (v) => Math.max(0, Math.floor(Number(v) || 0));
  const hours = total === null ? "" : Math.floor(total / 60);
  const minutes = total === null ? "" : total % 60;
  const box = cn(control, "h-12 pr-9 sm:h-10", error ? bad : ok);
  const unit = "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted";
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(a) => (
        <div role="group" aria-label={label} className="grid grid-cols-2 gap-2">
          <div className="relative">
            <input {...a} name={name && `${name}-hours`} type="number" inputMode="numeric" min={0} step={1} disabled={disabled} aria-label={`${label}: hours`} className={box}
              value={hours} onBlur={onBlur} onChange={(e) => onChange(part(e.target.value) * 60 + part(minutes))} />
            <span className={unit} aria-hidden>hr</span>
          </div>
          <div className="relative">
            <input name={name && `${name}-minutes`} type="number" inputMode="numeric" min={0} step={1} disabled={disabled} aria-label={`${label}: minutes`} aria-invalid={a["aria-invalid"]} className={box}
              value={minutes} onBlur={onBlur} onChange={(e) => onChange(part(hours) * 60 + part(e.target.value))} />
            <span className={unit} aria-hidden>min</span>
          </div>
        </div>
      )}
    </Field>
  );
}

/**
 * A percentage box. The value it reads and reports is a FRACTION (0.5 = 50%), so forms and the API keep working in
 * fractions while people type percentages.
 */
export function PercentInput({ label, error, hint, required, value, onChange, onBlur, disabled, name, max = 100 }) {
  const shown = value === "" || value === null || value === undefined || Number.isNaN(Number(value)) ? "" : Math.round(Number(value) * 10000) / 100;
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(a) => (
        <div className="relative">
          <input {...a} name={name} type="number" inputMode="decimal" min={0} max={max} step="any" disabled={disabled} value={shown} onBlur={onBlur}
            onChange={(e) => onChange(e.target.value === "" ? "" : Math.round(Number(e.target.value) * 100) / 10000)} className={cn(control, "h-12 pr-9 sm:h-10", error ? bad : ok)} />
          <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
        </div>
      )}
    </Field>
  );
}

/**
 * Text box with suggestions: choose one from the list, or type something that is not there.
 * `options` are plain strings; the value is whatever text ends up in the box.
 */
export function Combobox({ label, error, hint, required, value = "", onChange, onBlur, options = [], placeholder, disabled, name, maxLength, addLabel = "Add" }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const text = value ?? "";
  const query = text.trim().toLowerCase();
  const exact = options.some((o) => o.toLowerCase() === query);
  // While the box holds exactly one of the options, show them all: the person is browsing, not searching.
  const shown = !query || exact ? options : options.filter((o) => o.toLowerCase().includes(query));
  const isNew = Boolean(query) && !exact;
  const choose = (v) => { onChange(v); setOpen(false); setActive(-1); };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      if (shown.length) setActive((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length);
    } else if (e.key === "Enter" && open && active >= 0 && shown[active]) { e.preventDefault(); choose(shown[active]); }
    else if (e.key === "Escape" && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
  };

  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(a) => (
        <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { setOpen(false); setActive(-1); if (text !== text.trim()) onChange(text.trim()); onBlur?.(e); } }}>
          <input {...a} name={name} type="text" role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off" disabled={disabled} maxLength={maxLength} placeholder={placeholder} value={text} className={cn(control, "h-12 pr-10 sm:h-10", error ? bad : ok)}
            onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }} onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onKeyDown={onKeyDown} />
          <ChevronDown aria-hidden className={cn("pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted transition-transform", open && "rotate-180")} />
          {open && !disabled && (shown.length > 0 || isNew) && (
            <ul id={listId} role="listbox" aria-label={label} className="animate-pop absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-line bg-white p-1 text-sm shadow-lg">
              {shown.map((o, i) => (
                <li key={o} id={`${listId}-${i}`} role="option" aria-selected={o.toLowerCase() === query} tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()} onClick={() => choose(o)} onMouseEnter={() => setActive(i)}
                  className={cn("flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 sm:min-h-0", i === active && "bg-slate-100")}>
                  <span className="truncate">{o}</span>{o.toLowerCase() === query && <Check className="size-4 shrink-0 text-brand-600" aria-hidden />}
                </li>
              ))}
              {isNew && (
                <li role="presentation" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(text.trim())}
                  className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-brand-700 hover:bg-brand-50 sm:min-h-0", shown.length > 0 && "mt-1 border-t border-line")}>
                  <Plus className="size-4 shrink-0" aria-hidden /><span className="truncate">{addLabel} “{text.trim()}”</span>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </Field>
  );
}

export function Select({ label, error, hint, required, options = [], placeholder, className, ref, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(a) => (
        <select ref={ref} className={cn(control, "h-12 sm:h-10", error ? bad : ok, className)} {...a} {...props}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </Field>
  );
}

export function Textarea({ label, error, hint, required, className, ref, rows = 3, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(a) => <textarea ref={ref} rows={rows} className={cn(control, "py-2", error ? bad : ok, className)} {...a} {...props} />}
    </Field>
  );
}

export function Checkbox({ label, hint, error, className, ref, ...props }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 py-1.5 text-sm sm:min-h-0 sm:gap-2.5 sm:py-0">
        <input id={id} ref={ref} type="checkbox" className="mt-0.5 size-5 shrink-0 rounded border-slate-300 accent-brand-600 sm:size-4" {...props} />
        <span><span className="font-medium text-ink">{label}</span>{hint && <span className="block text-xs text-muted">{hint}</span>}</span>
      </label>
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Native date input (accessible, mobile-friendly). type="month" for month pickers. */
export function DatePicker({ type = "date", ...props }) {
  return <Input type={type} {...props} />;
}

export function FormError({ message }) {
  if (!message) return null;
  return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</div>;
}
