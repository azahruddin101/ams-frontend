"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { meService } from "@/services";
import { applyLeaveSchema } from "@/schemas";
import { useZodForm, applyServerError } from "@/hooks/useZodForm";
import { X } from "lucide-react";
import { Button, Checkbox, DatesPicker, FormError, LoadingState, Modal, Select, Textarea } from "@/components/ui";
import { toast } from "@/stores/uiStore";
import { cn, formatDate } from "@/lib/utils";

const DEFAULTS = { leaveTypeId: "", approverId: "", reportingToId: "", dates: [], isHalfDay: false, reason: "" };
const NO_DEPARTMENT = "none";

function Section({ step, title, description, children }) {
  return (
    <section className="space-y-3">
      <header className="flex items-start gap-3">
        <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{step}</span>
        <div><h3 className="text-sm font-semibold leading-6">{title}</h3>{description && <p className="text-xs text-muted">{description}</p>}</div>
      </header>
      <div className="sm:pl-9">{children}</div>
    </section>
  );
}

/** "Employee X from department Y": pick the department first, then the person. */
function PersonPicker({ people, value, onChange, error, required, personLabel }) {
  const chosen = people.find((p) => p._id === value);
  const [department, setDepartment] = useState("");
  const dept = chosen ? chosen.departmentKey : department;
  const departments = [...new Map(people.map((p) => [p.departmentKey, p.department ?? "No department"])).entries()].map(([v, label]) => ({ value: v, label })).sort((a, b) => a.label.localeCompare(b.label));
  const inDept = people.filter((p) => p.departmentKey === dept);
  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Department" value={dept} placeholder="Select department…" options={departments} onChange={(e) => { setDepartment(e.target.value); onChange(""); }} />
        <Select label={personLabel} required={required} value={value} disabled={!dept} error={error} placeholder={dept ? "Select employee…" : "Choose a department first"}
          options={inDept.map((p) => ({ value: p._id, label: `${p.name}${p.designation ? ` — ${p.designation}` : ""}` }))} onChange={(e) => onChange(e.target.value)} />
      </div>
      {chosen && <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="font-medium">{chosen.name}</span> <span className="text-muted">({chosen.employeeCode}) from {chosen.department ?? "no department"}</span></p>}
    </div>
  );
}

const keyed = (list) => list.map((p) => ({ ...p, departmentKey: p.departmentId ?? p.department ?? NO_DEPARTMENT }));

export function ApplyLeaveModal({ open, onClose }) {
  const qc = useQueryClient();
  const form = useZodForm(applyLeaveSchema, DEFAULTS);
  const { register, watch, setValue, formState: { errors } } = form;
  const options = useQuery({ queryKey: ["me", "leave-options"], queryFn: meService.leaveOptions, enabled: open });
  const o = options.data?.data;
  const v = watch();
  const close = () => { form.reset(DEFAULTS); onClose(); };

  const apply = useMutation({
    mutationFn: (x) => meService.applyLeave({ leaveTypeId: x.leaveTypeId, dates: x.dates, isHalfDay: x.isHalfDay, ...(x.reason && { reason: x.reason }), ...(x.approverId && { approverId: x.approverId }), ...(x.reportingToId && { reportingToId: x.reportingToId }) }),
    onSuccess: (r) => { toast.success(r.message); close(); qc.invalidateQueries({ queryKey: ["me"] }); },
    onError: (e) => applyServerError(form, e),
  });
  const submit = (x) => {
    if (o.approvers.length && !x.approverId) return form.setError("approverId", { type: "required", message: "Choose who should approve this" });
    apply.mutate(x);
  };

  const type = o?.types.find((t) => t._id === v.leaveTypeId);
  const picked = v.dates ?? [];
  const days = v.isHalfDay ? Math.min(picked.length, 1) * 0.5 : picked.length; // days off and holidays cannot be picked
  const tooMany = type?.remaining != null && days > type.remaining;
  const setDates = (dates) => setValue("dates", dates, { shouldValidate: form.formState.isSubmitted });

  return (
    <Modal open={open} onClose={close} title="Apply for leave" size="lg">
      {!o ? <LoadingState /> : (
        <form method="post" noValidate onSubmit={form.handleSubmit(submit)} className="space-y-6">
          <FormError message={errors.root?.server?.message} />

          <Section step={1} title="Leave type">
            <div role="radiogroup" aria-label="Leave type" className="grid gap-2 sm:grid-cols-3">
              {o.types.map((t) => (
                <label key={t._id} className={cn("cursor-pointer rounded-xl border p-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600", v.leaveTypeId === t._id ? "border-brand-600 bg-brand-50" : "border-line hover:bg-slate-50")}>
                  <input type="radio" value={t._id} className="sr-only" {...register("leaveTypeId")} />
                  <span className="block font-medium">{t.name}</span>
                  <span className="block text-xs text-muted">{t.remaining ?? "—"} day{t.remaining === 1 ? "" : "s"} left{t.isPaid ? "" : " · unpaid"}</span>
                </label>
              ))}
            </div>
            {errors.leaveTypeId && <p role="alert" className="mt-1.5 text-xs text-red-600">{errors.leaveTypeId.message}</p>}
          </Section>

          <Section step={2} title="Days" description="Tap every day you need — they don't have to be next to each other.">
            <div className="grid gap-4 md:grid-cols-[minmax(0,20rem)_1fr]">
              <DatesPicker value={picked} onChange={setDates} single={v.isHalfDay} daysOff={o.weekOffDays} holidays={o.holidays} today={o.today} error={errors.dates?.message} />
              <div className="space-y-3">
                <div className="rounded-xl border border-line p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xs text-muted">Leave days</p>
                    {picked.length > 1 && <button type="button" onClick={() => setDates([])} className="text-xs font-medium text-brand-700 hover:underline">Clear all</button>}
                  </div>
                  <p className={cn("text-2xl font-semibold tabular-nums", tooMany && "text-red-600")}>{days}</p>
                  {picked.length === 0
                    ? <p className="mt-1 text-sm text-muted">No days picked yet.</p>
                    : (
                      <ul aria-label="Picked days" className="mt-2 flex flex-wrap gap-1.5">
                        {picked.map((d) => (
                          <li key={d} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1 text-sm font-medium text-brand-700">
                            {formatDate(d, { weekday: "short", day: "numeric", month: "short" })}
                            <button type="button" onClick={() => setDates(picked.filter((x) => x !== d))} aria-label={`Remove ${formatDate(d, { day: "numeric", month: "long" })}`} className="grid size-6 place-items-center rounded-full hover:bg-brand-100"><X className="size-3.5" aria-hidden /></button>
                          </li>
                        ))}
                      </ul>
                    )}
                </div>
                {tooMany && <p role="alert" className="text-xs text-red-600">Only {type.remaining} day{type.remaining === 1 ? "" : "s"} of {type.name} left.</p>}
                <Checkbox label="Half day" hint="A single day, counted as 0.5" {...register("isHalfDay", { onChange: (e) => e.target.checked && picked.length > 1 && setDates(picked.slice(0, 1)) })} />
              </div>
            </div>
          </Section>

          <Section step={3} title="Who approves" description={o.approvers.length ? "Choose the person who will approve or reject this request." : undefined}>
            {o.approvers.length
              ? <PersonPicker people={keyed(o.approvers)} value={v.approverId} required personLabel="Approver" error={errors.approverId?.message} onChange={(id) => setValue("approverId", id, { shouldValidate: true })} />
              : <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-muted">Your request will go to your company to approve.</p>}
          </Section>

          <Section step={4} title="Reporting employee" description="The person you report to. They are told about this leave and its outcome; they don't decide it. Optional.">
            <PersonPicker people={keyed(o.colleagues)} value={v.reportingToId} personLabel="Employee" error={errors.reportingToId?.message} onChange={(id) => setValue("reportingToId", id, { shouldValidate: true })} />
          </Section>

          <Section step={5} title="Reason">
            <Textarea aria-label="Reason" placeholder="Optional" maxLength={500} error={errors.reason?.message} {...register("reason")} />
          </Section>

          <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t border-line bg-white/95 px-5 py-3 backdrop-blur max-sm:[&>*]:flex-1">
            <Button variant="secondary" onClick={close} disabled={apply.isPending}>Cancel</Button>
            <Button type="submit" loading={apply.isPending}>Send request</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
