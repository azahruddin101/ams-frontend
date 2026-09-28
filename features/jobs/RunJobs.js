"use client";
import { useState } from "react";
import { CheckCircle2, Play, XCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jobService } from "@/services";
import { useAuthStore, hasPermission } from "@/stores/authStore";
import { Badge, Button, Checkbox, FormError, Input, Modal } from "@/components/ui";
import { toast } from "@/stores/uiStore";
import { getErrorMessage } from "@/lib/errors";
import { formatDate, todayKey } from "@/lib/utils";

const ABOUT = {
  daily: "Closes each finished day: marks people who never scanned as absent, fills in holidays, week-offs and leave, and flags days with no check-out.",
  monthly: "Closes last month's attendance so it is final.",
  subscriptions: "Marks subscriptions that have run out as expired and tells those companies.",
};
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const describe = ({ key, summary: s }) => ({
  daily: () => (s.companies ? `${plural(s.days, "day")} closed (${s.from === s.to ? formatDate(s.to) : `${formatDate(s.from)} → ${formatDate(s.to)}`}) for ${plural(s.companies, "company", "companies")}, ${plural(s.employeeDays, "employee day")} checked` : "No active company to process"),
  monthly: () => (s.companies ? `${s.month}: ${plural(s.records, "record")} closed` : "Nothing to close"),
  subscriptions: () => `${plural(s.expired, "subscription")} expired`,
})[key]?.() ?? "Done";

const daysAgo = (n) => { const d = new Date(`${todayKey()}T00:00:00`); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/** Dashboard button: runs the background jobs by hand while the schedule is switched off (or whenever needed). */
export function RunJobsButton({ variant = "secondary" }) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(null); // null = all
  const [catchUp, setCatchUp] = useState(false);
  const [from, setFrom] = useState(daysAgo(7));
  const allowed = hasPermission(user, "jobs.run");
  const status = useQuery({ queryKey: ["jobs"], queryFn: jobService.status, enabled: allowed });
  const jobs = status.data?.data.jobs ?? [];
  const chosen = picked ?? jobs.map((j) => j.key);
  const platform = user?.role === "SUPER_ADMIN";

  const run = useMutation({
    mutationFn: () => jobService.run({ jobs: chosen, ...(catchUp && chosen.includes("daily") && { from }) }),
    onSuccess: (r) => {
      const failed = r.data.results.filter((x) => !x.ok).length;
      if (failed) toast.error(`${plural(failed, "job")} failed`); else toast.success(r.message);
      qc.invalidateQueries(); // attendance, dashboards and reports may all have changed
    },
  });
  if (!allowed) return null;
  const close = () => { setOpen(false); run.reset(); };
  const toggle = (key) => setPicked(chosen.includes(key) ? chosen.filter((k) => k !== key) : [...chosen, key]);

  return (
    <>
      <Button variant={variant} icon={Play} onClick={() => setOpen(true)}>Run jobs</Button>
      <Modal open={open} onClose={close} title="Run background jobs">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {status.data && (status.data.data.scheduled ? <Badge tone="green">Schedule is on</Badge> : <Badge tone="amber">Schedule is off</Badge>)}
            <span className="text-muted">{status.data?.data.scheduled ? "These also run on their own. Running them now is safe." : "Nothing runs on its own right now: run these yourself, ideally once a day."}</span>
          </div>
          <p className="text-sm text-muted">{platform ? "Runs for every active company." : "Runs for your company only."} Pressing it twice does no harm.</p>

          <fieldset disabled={run.isPending} className="space-y-3">
            <legend className="sr-only">Jobs to run</legend>
            {jobs.map((j) => <Checkbox key={j.key} label={j.label} hint={ABOUT[j.key]} checked={chosen.includes(j.key)} onChange={() => toggle(j.key)} />)}
          </fieldset>

          {chosen.includes("daily") && (
            <fieldset disabled={run.isPending} className="space-y-3 rounded-xl border border-line p-3">
              <Checkbox label="Also catch up earlier days" hint="By default only yesterday is closed. Use this if the jobs were not run for a few days." checked={catchUp} onChange={(e) => setCatchUp(e.target.checked)} />
              {catchUp && <Input label="Starting from" type="date" value={from} min={daysAgo(31)} max={daysAgo(1)} onChange={(e) => setFrom(e.target.value)} hint="Up to 31 days back, through yesterday" />}
            </fieldset>
          )}

          <FormError message={run.isError ? getErrorMessage(run.error) : undefined} />
          {run.data && (
            <ul aria-label="Results" className="divide-y divide-line rounded-xl border border-line">
              {run.data.data.results.map((r) => (
                <li key={r.key} className="flex items-start gap-3 p-3 text-sm">
                  {r.ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden /> : <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden />}
                  <span className="min-w-0"><span className="block font-medium">{r.label}</span><span className={r.ok ? "text-muted" : "text-red-700"}>{r.ok ? describe(r) : `Failed: ${r.error}`}</span></span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close} disabled={run.isPending}>{run.data ? "Close" : "Cancel"}</Button>
            <Button icon={Play} loading={run.isPending} disabled={!chosen.length || (catchUp && !from)} onClick={() => run.mutate()}>{run.isPending ? "Running…" : run.data ? "Run again" : "Run now"}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
