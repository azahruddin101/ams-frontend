"use client";
import { useEffect, useState } from "react";
import { Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { policyService } from "@/services";
import { policySchema, departmentPolicySchema } from "@/schemas";
import { useZodForm, applyServerError } from "@/hooks/useZodForm";
import { useAuthStore, hasPermission } from "@/stores/authStore";
import { Badge, Button, Card, Checkbox, ConfirmDialog, DurationInput, FormError, Input, PercentInput, PageHeader, QueryBoundary, Select } from "@/components/ui";
import { toast } from "@/stores/uiStore";
import { getErrorMessage } from "@/lib/errors";

const COMPANY = ""; // scope value for the company default

const TIMING_MODES = [{ value: "FIXED", label: "Fixed in / out time" }, { value: "FLEXIBLE", label: "Flexible — any time, complete the hours" }, { value: "NO_TIME_BOUND", label: "No time bound — sales / field teams" }];
const TIMING_HINT = {
  FIXED: "Everyone arrives and leaves at a set time",
  FLEXIBLE: "No late marks: only the hours worked count",
  NO_TIME_BOUND: "No set time and no required hours: marking attendance on the day counts as present",
};
const PENALTIES = [{ value: "HALF_DAY", label: "Half day" }, { value: "ABSENT", label: "Absent (full day)" }];
const PERIODS = [{ value: "WEEK", label: "a week (Mon–Sun)" }, { value: "MONTH", label: "a month" }];
const REPEATS = [{ value: "NTH_ONWARDS", label: "That day and every late day after it" }, { value: "EVERY_NTH", label: "Only each time the number is reached again" }];
const DAY_BASES = [
  { value: "CALENDAR_DAYS", label: "Salary ÷ days in the month" },
  { value: "WORKING_DAYS", label: "Salary ÷ working days in the month" },
  { value: "FIXED_DAYS", label: "Salary ÷ a fixed number of days" },
];

const FIXED_FIELDS = [
  ["gracePeriod", "Grace period", "Arrival window before someone counts as late"],
  ["lateAfterMinutes", "Extra time before 'late'", "Added on top of the grace period"],
  ["halfDayAfterMinutes", "Half day if later than"], ["absentAfterMinutes", "Absent if later than"],
  ["earlyCheckoutThreshold", "Early checkout allowed", "Leaving earlier than this counts as an early checkout"],
];
const penaltyWord = (p) => (p === "ABSENT" ? "absent" : "a half day");

export function PolicyPage() {
  const [scope, setScope] = useState(COMPANY);
  const depts = useQuery({ queryKey: ["policy", "departments"], queryFn: policyService.departments });
  const departments = depts.data?.data ?? [];
  const options = [
    { value: COMPANY, label: "Company default" },
    ...departments.map((d) => ({ value: d._id, label: `${d.name} — ${d.hasOwnRules ? "own rules" : "company default"}` })),
  ];

  return (
    <>
      <PageHeader title="Attendance rules" description="Timing, in/out, late penalties and salary deduction. Set a company default, then give any department its own rules. Changes apply to new calculations." />
      <Card className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Rules for" value={scope} onChange={(e) => setScope(e.target.value)} options={options}
            hint={departments.length ? "Employees follow their department's rules; everyone else follows the company default." : "Add departments to give each its own rules."} />
        </div>
      </Card>
      {scope === COMPANY ? <CompanyRules key="company" /> : <DepartmentRules key={scope} departmentId={scope} />}
    </>
  );
}

function CompanyRules() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["policy"], queryFn: policyService.get });
  const form = useZodForm(policySchema, {});
  useEffect(() => { if (q.data) form.reset(q.data.data); }, [q.data, form]);
  const save = useMutation({
    mutationFn: (v) => policyService.update(v),
    onSuccess: (r) => { toast.success(r.message); qc.invalidateQueries({ queryKey: ["policy"] }); },
    onError: (e) => applyServerError(form, e),
  });
  return <QueryBoundary query={q}>{() => <RulesForm form={form} onSubmit={(v) => save.mutate(v)} saving={save.isPending} withGeofence />}</QueryBoundary>;
}

function DepartmentRules({ departmentId }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["policy", "department", departmentId], queryFn: () => policyService.department(departmentId) });
  const form = useZodForm(departmentPolicySchema, {});
  const [customising, setCustomising] = useState(false);
  const [resetting, setResetting] = useState(false);
  const canEdit = hasPermission(useAuthStore((s) => s.user), "attendance_policy.update");
  useEffect(() => { if (q.data) form.reset(q.data.data.policy); }, [q.data, form]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["policy"] });
  const save = useMutation({
    mutationFn: (v) => policyService.updateDepartment(departmentId, v),
    onSuccess: (r) => { toast.success(r.message); setCustomising(false); refresh(); },
    onError: (e) => applyServerError(form, e),
  });
  const reset = useMutation({
    mutationFn: () => policyService.resetDepartment(departmentId),
    onSuccess: (r) => { toast.success(r.message); setResetting(false); setCustomising(false); refresh(); },
    onError: (e) => { toast.error(getErrorMessage(e)); setResetting(false); },
  });

  return (
    <QueryBoundary query={q}>
      {({ data }) => {
        const inherited = data.inherited && !customising;
        return (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium">{data.department.name} {data.inherited ? <Badge tone="gray">Company default</Badge> : <Badge tone="blue">Own rules</Badge>}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {inherited ? "This department follows the company default shown below." : data.inherited ? "Change what differs for this department, then save." : "These rules apply only to employees of this department."}
                </p>
              </div>
              {canEdit && (inherited
                ? <Button onClick={() => setCustomising(true)}>Set rules for this department</Button>
                : data.inherited
                  ? <Button variant="secondary" onClick={() => { setCustomising(false); form.reset(data.policy); }}>Cancel</Button>
                  : <Button variant="secondary" onClick={() => setResetting(true)}>Use company default</Button>)}
            </div>
            <RulesForm form={form} onSubmit={(v) => save.mutate(v)} saving={save.isPending} readOnly={inherited} submitLabel="Save department rules" />
            <ConfirmDialog open={resetting} onClose={() => setResetting(false)} loading={reset.isPending} onConfirm={() => reset.mutate()} confirmLabel="Use company default"
              title={`Remove ${data.department.name}'s own rules?`} message="This department will follow the company default again. Attendance already recorded is not changed." />
          </>
        );
      }}
    </QueryBoundary>
  );
}

function RulesForm({ form, onSubmit, saving, readOnly = false, withGeofence = false, submitLabel = "Save rules" }) {
  const user = useAuthStore((s) => s.user);
  const canEdit = hasPermission(user, "attendance_policy.update") && !readOnly;
  const { register, watch, formState: { errors } } = form;
  const v = watch();
  const unbound = v.timingMode === "NO_TIME_BOUND";
  const fixed = !unbound && v.timingMode !== "FLEXIBLE";
  const number = (name, label, hint, props) => <Input key={name} label={label} hint={hint} type="number" inputMode="decimal" error={errors[name]?.message} {...props} {...register(name)} />;
  const duration = (name, label, hint) => (
    <Controller key={name} name={name} control={form.control} render={({ field }) => <DurationInput label={label} hint={hint} error={errors[name]?.message} name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />
  );
  const percent = (name, label, hint) => (
    <Controller key={name} name={name} control={form.control} render={({ field }) => <PercentInput label={label} hint={hint} max={500} error={errors[name]?.message} name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />
  );
  const select = (name, label, options, hint) => <Select key={name} label={label} hint={hint} options={options} error={errors[name]?.message} {...register(name)} />;

  return (
    <form method="post" noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <FormError message={errors.root?.server?.message} />

      <Card title="Working hours">
        <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {select("timingMode", "Timing", TIMING_MODES, TIMING_HINT[v.timingMode])}
          {fixed && <Input label="Check-in time" type="time" hint="Employees with a shift follow their shift's times" error={errors.expectedCheckInTime?.message} {...register("expectedCheckInTime")} />}
          {fixed && <Input label="Check-out time" type="time" error={errors.expectedCheckOutTime?.message} {...register("expectedCheckOutTime")} />}
          {!unbound && duration("halfDayWorkingMinutes", "Full-day working time", "Working less than this is a half day")}
          {!unbound && duration("minimumWorkingMinutes", "Minimum working time", "Working less than this is absent")}
          {!unbound && duration("overtimeAfterMinutes", "Overtime after", "Time worked beyond this is overtime")}
          {fixed && FIXED_FIELDS.map(([name, label, hint]) => duration(name, label, hint))}
        </fieldset>
      </Card>

      <Card title="Check-ins and check-outs">
        <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
          <Checkbox label="Allow multiple check-ins per day" hint="People can go out and come back in; all sessions are added up" {...register("multipleCheckInAllowed")} />
          <Checkbox label="Allow multiple check-outs per day" {...register("multipleCheckOutAllowed")} />
          {!unbound && <Checkbox label="Track overtime" {...register("overtimeEnabled")} />}
        </fieldset>
      </Card>

      {fixed && (
        <Card title="Repeated lateness">
          <fieldset disabled={!canEdit} className="space-y-5">
            <div className="space-y-3">
              <Checkbox label="Penalise being late several times" hint={v.lateCountEnabled ? `Late ${v.lateCountThreshold} time(s) in ${v.lateCountPeriod === "WEEK" ? "a week" : "a month"} → the day is marked ${penaltyWord(v.lateCountPenalty)}.` : "For example: late 2 days in a week → half day"} {...register("lateCountEnabled")} />
              {v.lateCountEnabled && (
                <div className="grid gap-4 sm:grid-cols-3">
                  {number("lateCountThreshold", "Late days", "1 = every late day")}
                  {select("lateCountPeriod", "Within", PERIODS)}
                  {select("lateCountPenalty", "Mark the day as", PENALTIES)}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <Checkbox label="Penalise being late on consecutive days" hint={v.lateStreakEnabled ? `Late ${v.lateStreakThreshold} working days in a row → the day is marked ${penaltyWord(v.lateStreakPenalty)}.` : "For example: late 2 days in a row → half day. Holidays, week-offs and leave don't break the run."} {...register("lateStreakEnabled")} />
              {v.lateStreakEnabled && (
                <div className="grid gap-4 sm:grid-cols-3">
                  {number("lateStreakThreshold", "Days in a row")}
                  {select("lateStreakPenalty", "Mark the day as", PENALTIES)}
                </div>
              )}
            </div>
            {(v.lateCountEnabled || v.lateStreakEnabled) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {select("latePenaltyRepeat", "Which days are marked", REPEATS, v.latePenaltyRepeat === "EVERY_NTH" ? "e.g. with 3: the 3rd, 6th, 9th late day" : "e.g. with 3: the 3rd, 4th, 5th… late day")}
              </div>
            )}
          </fieldset>
        </Card>
      )}

      <Card title="Salary deduction">
        <fieldset disabled={!canEdit} className="space-y-4">
          <Checkbox label={unbound ? "Deduct salary for absences" : "Deduct salary for absences, half days and lateness"} hint="Shown per employee in Reports → Salary. Each deduction is a percentage of one day's salary." {...register("salaryDeductionEnabled")} />
          {v.salaryDeductionEnabled && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {select("salaryDayBasis", "One day of salary is", DAY_BASES)}
                {v.salaryDayBasis === "FIXED_DAYS" && number("salaryFixedDays", "Days per month", "Commonly 26 or 30")}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {percent("absentDeduction", "Absent day", "% of one day's salary. 100% = the full day")}
                {!unbound && percent("halfDayDeduction", "Half day", "% of one day's salary. Includes days marked half day for lateness")}
                {!unbound && percent("lateDeduction", "Late day", "% of one day's salary. 0% = being late alone costs nothing")}
              </div>
              <Checkbox label="Deduct unpaid leave" hint="100% of a day's salary per day of leave whose type is unpaid (50% for a half day)" {...register("unpaidLeaveDeduction")} />
            </>
          )}
        </fieldset>
      </Card>

      {withGeofence && (
        <Card title="Location">
          <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
            <Checkbox label="Only accept scans at the office" hint="The scanning device must be within the radius. Set the office coordinates in Settings. Applies to the whole company." {...register("geofenceEnabled")} />
            {number("geofenceRadius", "Geofence radius (meters)")}
          </fieldset>
        </Card>
      )}

      {canEdit && <div className="flex justify-end"><Button type="submit" size="lg" loading={saving}>{submitLabel}</Button></div>}
    </form>
  );
}
