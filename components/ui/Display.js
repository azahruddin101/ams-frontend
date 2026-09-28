import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

const TONES = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  purple: "bg-purple-50 text-purple-700 ring-purple-600/20",
  gray: "bg-slate-100 text-slate-700 ring-slate-500/20",
};

export function Badge({ tone = "gray", children, className }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", TONES[tone], className)}>{children}</span>;
}

export function StatusBadge({ meta, value }) {
  const m = meta[value] ?? { label: value, tone: "gray" };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function Card({ title, action, children, className, padded = true }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-surface shadow-sm", className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </header>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, icon: Icon, tone = "brand", hint }) {
  const iconTone = { brand: "bg-brand-50 text-brand-700", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", red: "bg-red-50 text-red-700", blue: "bg-blue-50 text-blue-700" }[tone];
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm">
      {Icon && <div className={cn("grid size-11 shrink-0 place-items-center rounded-xl", iconTone)}><Icon className="size-5" aria-hidden /></div>}
      <div className="min-w-0">
        <p className="truncate text-sm text-muted">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}

export function EmptyState({ title = "Nothing here yet", description, action, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500"><Icon className="size-6" aria-hidden /></div>
      <h3 className="font-medium">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading…", className }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex items-center justify-center gap-2 py-12 text-sm text-muted", className)}>
      <Loader2 className="size-5 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function ErrorState({ message = "Something went wrong.", onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-red-50 text-red-600"><AlertTriangle className="size-6" aria-hidden /></div>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>Try again</Button>}
    </div>
  );
}

/** Renders the right state for a TanStack Query result. */
export function QueryBoundary({ query, isEmpty, empty, children, errorMessage }) {
  if (query.isLoading) return <LoadingState />;
  if (query.isError) return <ErrorState message={errorMessage} onRetry={() => query.refetch()} />;
  if (isEmpty?.(query.data)) return empty ?? <EmptyState />;
  return children(query.data);
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {/* On phones the actions become full-width, thumb-sized buttons */}
      {actions && <div className="flex w-full flex-wrap items-center gap-2 max-sm:[&>*]:flex-1 sm:w-auto">{actions}</div>}
    </div>
  );
}
