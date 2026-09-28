import { leaveTypeService } from "@/services";
import { leaveTypeSchema } from "@/schemas";
import { Badge } from "@/components/ui";

export const leaveTypesConfig = {
  title: "Leave types", singular: "Leave type", description: "Quotas apply per calendar year.", queryKey: "leave-types",
  service: leaveTypeService, schema: leaveTypeSchema, defaults: { name: "", code: "", annualQuota: 12, isPaid: true },
  perms: { create: "leave_type.manage", update: "leave_type.manage", delete: "leave_type.manage" },
  columns: [
    { key: "name", header: "Name", sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "code", header: "Code", render: (r) => <Badge>{r.code}</Badge> },
    { key: "annualQuota", header: "Annual quota", render: (r) => `${r.annualQuota} days` },
    { key: "isPaid", header: "Paid", render: (r) => (r.isPaid ? <Badge tone="green">Paid</Badge> : <Badge tone="amber">Unpaid</Badge>) },
  ],
  fields: [
    { name: "name", label: "Name", required: true }, { name: "code", label: "Code", required: true },
    { name: "annualQuota", label: "Annual quota (days)", type: "number" }, { name: "isPaid", label: "Paid leave", type: "checkbox" },
  ],
};
