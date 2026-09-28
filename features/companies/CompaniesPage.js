"use client";
import Link from "next/link";
import { useState } from "react";
import { Plus, Eye } from "lucide-react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { companyService } from "@/services";
import { createCompanySchema } from "@/schemas";
import { useZodForm, applyServerError } from "@/hooks/useZodForm";
import { useDebounce } from "@/hooks/useDebounce";
import { Button, Card, DataTable, Input, Modal, PageHeader, Select, StatusBadge } from "@/components/ui";
import { ResourceForm } from "@/components/forms/ResourceForm";
import { toast } from "@/stores/uiStore";
import { COMPANY_STATUS_META, PAGE_SIZE } from "@/constants";
import { formatDate } from "@/lib/utils";
import { timezoneOptions } from "@/features/settings/SettingsPage";
import { BrandingFields } from "@/components/brand/BrandingFields";
import { DEFAULT_BRAND } from "@/lib/theme";

const DEFAULTS = { name: "", legalName: "", email: "", phone: "", timezone: "Asia/Kolkata", currency: "INR", logo: null, primaryColor: DEFAULT_BRAND, adminName: "", adminEmail: "", adminPassword: "" };
export const companyFields = [
  { name: "name", label: "Company name", required: true }, { name: "legalName", label: "Legal name" },
  { name: "email", label: "Company email", type: "email", required: true }, { name: "phone", label: "Phone", type: "tel" },
  { name: "timezone", label: "Timezone", type: "select", options: timezoneOptions(), required: true, placeholder: undefined }, { name: "currency", label: "Currency", required: true },
];

export function CompaniesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(search);
  const params = { page, limit: PAGE_SIZE, search: debounced || undefined, status: statusFilter || undefined };
  const q = useQuery({ queryKey: ["companies", params], queryFn: () => companyService.list(params), placeholderData: keepPreviousData });
  const form = useZodForm(createCompanySchema, DEFAULTS);
  const create = useMutation({
    mutationFn: ({ adminName, adminEmail, adminPassword, logo, primaryColor, ...c }) =>
      companyService.create({ ...c, ...(logo && { logo }), theme: { primaryColor }, admin: { name: adminName, email: adminEmail, password: adminPassword } }),
    onSuccess: (r) => { toast.success(r.message); setOpen(false); form.reset(DEFAULTS); qc.invalidateQueries({ queryKey: ["companies"] }); qc.invalidateQueries({ queryKey: ["platform"] }); },
    onError: (e) => applyServerError(form, e),
  });
  const columns = [
    { key: "name", header: "Company", render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted">{r.email}</div></div> },
    { key: "timezone", header: "Timezone", render: (r) => r.timezone },
    { key: "status", header: "Status", render: (r) => <StatusBadge meta={COMPANY_STATUS_META} value={r.status} /> },
    { key: "createdAt", header: "Created", render: (r) => formatDate(r.createdAt) },
    { key: "view", header: <span className="sr-only">View</span>, render: (r) => <Link href={`/super-admin/companies/${r._id}`} className="tap inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"><Eye className="size-4" aria-hidden />View</Link> },
  ];
  return (
    <>
      <PageHeader title="Companies" actions={<Button icon={Plus} onClick={() => setOpen(true)}>New company</Button>} />
      <Card padded={false}>
        <div className="grid gap-3 border-b border-line p-4 sm:max-w-2xl sm:grid-cols-[1fr_12rem]">
          <Input aria-label="Search companies" placeholder="Search…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <Select aria-label="Filter by status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} placeholder="All statuses" options={Object.entries(COMPANY_STATUS_META).map(([value, m]) => ({ value, label: m.label }))} />
        </div>
        <DataTable columns={columns} rows={q.data?.data} isLoading={q.isLoading} isError={q.isError} onRetry={q.refetch} pagination={q.data?.pagination} onPage={setPage} emptyTitle="No companies" emptyDescription="Create the first tenant." />
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Create company" size="lg">
        <ResourceForm form={form} onSubmit={(v) => create.mutate(v)} submitting={create.isPending} onCancel={() => setOpen(false)} submitLabel="Create company" fields={[
          ...companyFields,
          { name: "branding", type: "custom", render: ({ form: f }) => <BrandingFields form={f} companyName={f.watch("name") || "New company"} /> },
          { name: "adminName", label: "Company login — name", required: true }, { name: "adminEmail", label: "Company login — email", type: "email", required: true },
          { name: "adminPassword", label: "Company login — password", type: "password", required: true, full: true, autoComplete: "new-password" },
        ]} />
      </Modal>
    </>
  );
}
