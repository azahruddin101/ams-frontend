"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Trash2, UserPlus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { companyService } from "@/services";
import { companyAdminSchema, brandingSchema } from "@/schemas";
import { BrandingFields } from "@/components/brand/BrandingFields";
import { CompanyLogo } from "@/components/brand/CompanyLogo";
import { DEFAULT_BRAND } from "@/lib/theme";
import { useMemo } from "react";
import { z } from "zod";
import { useZodForm, applyServerError } from "@/hooks/useZodForm";
import { Badge, Button, Card, ConfirmDialog, Input, Modal, PageHeader, QueryBoundary, Select, StatusBadge } from "@/components/ui";
import { ResourceForm } from "@/components/forms/ResourceForm";
import { toast } from "@/stores/uiStore";
import { getErrorMessage } from "@/lib/errors";
import { COMPANY_STATUS_META } from "@/constants";
import { formatDate } from "@/lib/utils";

/** Irreversible: the user must type the company's exact name, and the button stays disabled until it matches. */
function DeleteCompany({ company }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const schema = useMemo(() => z.object({ confirmName: z.string().refine((v) => v === company.name, "The name doesn't match") }), [company.name]);
  const form = useZodForm(schema, { confirmName: "" });
  const typed = form.watch("confirmName");
  const remove = useMutation({
    mutationFn: () => companyService.remove(company._id, form.getValues("confirmName")),
    onSuccess: (r) => { toast.success(r.message); qc.invalidateQueries({ queryKey: ["companies"] }); qc.invalidateQueries({ queryKey: ["platform"] }); router.replace("/super-admin/companies"); },
    onError: (e) => applyServerError(form, e),
  });
  const close = () => { setOpen(false); form.reset(); };
  return (
    <>
      <Card title="Danger zone" className="border-red-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">Delete this company</p>
            <p className="text-muted">Permanently removes the company and everything it owns. To only block access temporarily, use <b>Change status → Suspended</b> instead.</p>
          </div>
          <Button variant="danger" icon={Trash2} onClick={() => setOpen(true)} className="max-sm:w-full">Delete company</Button>
        </div>
      </Card>
      <Modal open={open} onClose={close} title={`Delete ${company.name}?`} size="sm">
        <form method="post" noValidate onSubmit={form.handleSubmit(() => remove.mutate())} className="space-y-4">
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-medium">This cannot be undone.</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              <li>All {company.employeeCount} employee record(s), including their face templates</li>
              <li>All attendance, leave and audit history</li>
              <li>Every login and attendance device of this company</li>
            </ul>
          </div>
          <Input label={`Type “${company.name}” to confirm`} autoComplete="off" spellCheck={false} error={form.formState.errors.confirmName?.message && typed ? form.formState.errors.confirmName.message : form.formState.errors.root?.server?.message} {...form.register("confirmName")} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close} disabled={remove.isPending}>Cancel</Button>
            <Button type="submit" variant="danger" icon={Trash2} loading={remove.isPending} disabled={typed !== company.name}>Delete permanently</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function BrandingCard({ company }) {
  const qc = useQueryClient();
  const form = useZodForm(brandingSchema, { logo: company.logo ?? null, primaryColor: company.theme?.primaryColor ?? DEFAULT_BRAND });
  const save = useMutation({
    mutationFn: (v) => companyService.update(company._id, { logo: v.logo ?? null, theme: { primaryColor: v.primaryColor } }),
    onSuccess: (r) => { toast.success(r.message); form.reset(form.getValues()); qc.invalidateQueries({ queryKey: ["companies"] }); },
    onError: (e) => applyServerError(form, e),
  });
  return (
    <Card title="Branding">
      <form method="post" noValidate onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-4">
        <BrandingFields form={form} companyName={company.name} />
        <div className="flex justify-end"><Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty}>Save branding</Button></div>
      </form>
    </Card>
  );
}

/** What each status does, shown in the picker and in the confirmation. */
const STATUS_INFO = {
  TRIAL: { label: "Trial", tone: "primary", effect: "Marks the company as on a trial. Everyone can still sign in and scan — nothing is restricted." },
  ACTIVE: { label: "Active", tone: "success", effect: "Normal, paying company. Everyone can sign in and scan." },
  SUSPENDED: { label: "Suspended", tone: "danger", effect: "Temporary lock-out: every login and attendance device of this company is signed out immediately and can't sign in. Nothing is deleted; set it back to Active to restore access." },
  CANCELLED: { label: "Cancelled", tone: "danger", effect: "Access is blocked exactly like a suspension (all logins and devices are locked out at once). No data is deleted; you can still set it back to Active." },
};

export function CompanyDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [adminOpen, setAdminOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const q = useQuery({ queryKey: ["companies", id], queryFn: () => companyService.get(id) });
  const form = useZodForm(companyAdminSchema, { name: "", email: "", password: "" });
  const refresh = (r) => { toast.success(r.message); qc.invalidateQueries({ queryKey: ["companies"] }); qc.invalidateQueries({ queryKey: ["platform"] }); };
  const status = useMutation({ mutationFn: (s) => companyService.setStatus(id, s), onSuccess: (r) => { refresh(r); setConfirm(null); }, onError: (e) => { toast.error(getErrorMessage(e)); setConfirm(null); } });
  const admin = useMutation({ mutationFn: (v) => companyService.createAdmin(id, v), onSuccess: (r) => { refresh(r); setAdminOpen(false); form.reset(); }, onError: (e) => applyServerError(form, e) });

  return (
    <QueryBoundary query={q}>
      {({ data: c }) => (
        <>
          <Link href="/super-admin/companies" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" aria-hidden />All companies</Link>
          <div className="mb-4 flex items-center gap-3"><CompanyLogo company={c} size="size-14" className="border border-line" /></div>
          <PageHeader title={c.name} description={c.email} actions={<>
            <StatusBadge meta={COMPANY_STATUS_META} value={c.status} />
            <div className="min-w-44 max-sm:w-full">
              <Select label="Change status" value={c.status} onChange={(e) => e.target.value !== c.status && setConfirm(e.target.value)}
                options={Object.entries(STATUS_INFO).map(([value, i]) => ({ value, label: i.label }))} hint={STATUS_INFO[c.status].effect} />
            </div>
          </>} />
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Details">
              <dl className="grid grid-cols-2 gap-y-3 text-sm">
                {[["Legal name", c.legalName ?? "—"], ["Phone", c.phone ?? "—"], ["Timezone", c.timezone], ["Currency", c.currency], ["Employees", c.employeeCount], ["Created", formatDate(c.createdAt)]].map(([k, v]) => (
                  <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>
                ))}
              </dl>
            </Card>
            <Card title="Company logins" action={<Button size="sm" variant="secondary" icon={UserPlus} onClick={() => setAdminOpen(true)}>Add login</Button>}>
              <ul className="divide-y divide-line">
                {c.admins.map((a) => (
                  <li key={a._id} className="flex items-center justify-between py-2.5 text-sm">
                    <div><p className="font-medium">{a.name}</p><p className="text-xs text-muted">{a.email}</p></div>
                    <Badge tone={a.isActive ? "green" : "gray"}>{a.isActive ? "Active" : "Disabled"}</Badge>
                  </li>
                ))}
                {!c.admins.length && <li className="py-4 text-center text-sm text-muted">No logins yet — add one so the company can sign in.</li>}
              </ul>
            </Card>
          </div>
          <div className="mt-6"><BrandingCard company={c} /></div>
          <div className="mt-6"><DeleteCompany company={c} /></div>
          <Modal open={adminOpen} onClose={() => setAdminOpen(false)} title="Add company login" size="sm">
            <ResourceForm form={form} onSubmit={(v) => admin.mutate(v)} submitting={admin.isPending} onCancel={() => setAdminOpen(false)} submitLabel="Add login" fields={[
              { name: "name", label: "Name", required: true, full: true }, { name: "email", label: "Email", type: "email", required: true, full: true },
              { name: "password", label: "Password", type: "password", required: true, full: true, autoComplete: "new-password" },
            ]} />
          </Modal>
          <ConfirmDialog open={Boolean(confirm)} onClose={() => setConfirm(null)} loading={status.isPending} onConfirm={() => status.mutate(confirm)}
            tone={STATUS_INFO[confirm]?.tone ?? "primary"} confirmLabel={`Set to ${STATUS_INFO[confirm]?.label ?? ""}`}
            title={`Change status to ${STATUS_INFO[confirm]?.label ?? ""}?`} message={STATUS_INFO[confirm]?.effect} />
        </>
      )}
    </QueryBoundary>
  );
}
