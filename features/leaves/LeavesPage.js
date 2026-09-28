"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { employeeService, leaveService, leaveTypeService } from "@/services";
import { leaveRequestSchema } from "@/schemas";
import { useZodForm, applyServerError } from "@/hooks/useZodForm";
import { Button, Card, ConfirmDialog, DataTable, Modal, PageHeader, Select, StatusBadge } from "@/components/ui";
import { DecideLeaveDialog } from "@/features/employee/DecideLeaveDialog";
import { ResourceForm } from "@/components/forms/ResourceForm";
import { toast } from "@/stores/uiStore";
import { getErrorMessage } from "@/lib/errors";
import { LEAVE_STATUS_META, PAGE_SIZE } from "@/constants";
import { formatDate, fullName, formatLeaveDates } from "@/lib/utils";

const DEFAULTS = { employeeId: "", leaveTypeId: "", fromDate: "", toDate: "", isHalfDay: false, reason: "" };

export function LeavesPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [deciding, setDeciding] = useState(null); // { row, approve }
  const params = { status, page, limit: PAGE_SIZE };
  const list = useQuery({ queryKey: ["leaves", params], queryFn: () => leaveService.list(params), placeholderData: keepPreviousData });
  const emps = useQuery({ queryKey: ["employees", "options"], queryFn: () => employeeService.list({ limit: 100, status: "ACTIVE" }), enabled: open });
  const types = useQuery({ queryKey: ["leave-types", "options"], queryFn: () => leaveTypeService.list({ limit: 100 }), enabled: open });
  const form = useZodForm(leaveRequestSchema, DEFAULTS);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["leaves"] }); qc.invalidateQueries({ queryKey: ["attendance"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); };

  const create = useMutation({
    mutationFn: (v) => leaveService.create({ ...v, reason: v.reason || undefined }),
    onSuccess: (r) => { toast.success(r.message); setOpen(false); form.reset(DEFAULTS); refresh(); },
    onError: (e) => applyServerError(form, e),
  });
  const cancel = useMutation({
    mutationFn: leaveService.cancel,
    onSuccess: (r) => { toast.success(r.message); setCancelling(null); refresh(); },
    onError: (e) => { toast.error(getErrorMessage(e)); setCancelling(null); },
  });

  const decide = useMutation({
    mutationFn: ({ row, approve, note }) => (approve ? leaveService.approve(row._id, note) : leaveService.reject(row._id, note)),
    onSuccess: (r) => { toast.success(r.message); setDeciding(null); refresh(); },
    onError: (e) => { toast.error(getErrorMessage(e)); setDeciding(null); },
  });

  const columns = [
    { key: "emp", header: "Employee", render: (r) => <div><div className="font-medium">{fullName(r.employeeId)}</div><div className="text-xs text-muted">{r.employeeId?.employeeCode}</div></div> },
    { key: "type", header: "Type", render: (r) => r.leaveTypeId?.name },
    { key: "dates", header: "Dates", render: (r) => <span className="block max-w-72 whitespace-normal">{formatLeaveDates(r)}</span> },
    { key: "days", header: "Days", render: (r) => r.days },
    { key: "reports", header: "Reports to", render: (r) => (r.reportingToId ? <div><div>{fullName(r.reportingToId)}</div><div className="text-xs text-muted">{r.reportingToId.departmentId?.name}</div></div> : "—") },
    { key: "reason", header: "Reason", render: (r) => <span className="block max-w-64 truncate" title={r.reason}>{r.reason || "—"}</span> },
    { key: "approver", header: "Asked", render: (r) => (r.approverId ? fullName(r.approverId) : r.appliedBy ? "Company" : "—") },
    { key: "status", header: "Status", render: (r) => <StatusBadge meta={LEAVE_STATUS_META} value={r.status} /> },
    { key: "actions", header: <span className="sr-only">Actions</span>, render: (r) => (
      r.status === "APPROVED" ? <Button size="sm" variant="ghost" onClick={() => setCancelling(r)}>Cancel</Button>
        : r.status === "PENDING" ? <span className="flex justify-end gap-2"><Button size="sm" variant="success" onClick={() => setDeciding({ row: r, approve: true })}>Approve</Button><Button size="sm" variant="secondary" onClick={() => setDeciding({ row: r, approve: false })}>Reject</Button></span>
          : null
    ) },
  ];

  return (
    <>
      <PageHeader title="Leaves" description="Leave you record counts immediately. Requests from employees wait as Pending for the person they asked; you can approve or reject any of them."
        actions={<Button icon={Plus} onClick={() => setOpen(true)}>Record leave</Button>} />
      <Card padded={false}>
        <div className="max-w-xs border-b border-line p-4">
          <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder="All"
            options={Object.entries(LEAVE_STATUS_META).map(([value, m]) => ({ value, label: m.label }))} />
        </div>
        <DataTable columns={columns} rows={list.data?.data} isLoading={list.isLoading} isError={list.isError} onRetry={list.refetch} pagination={list.data?.pagination} onPage={setPage}
          emptyTitle="No leave recorded" emptyDescription="Use “Record leave” to add one." />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Record leave">
        <ResourceForm form={form} onSubmit={(v) => create.mutate(v)} submitting={create.isPending} onCancel={() => setOpen(false)} submitLabel="Record leave" fields={[
          { name: "employeeId", label: "Employee", type: "select", required: true, full: true, options: (emps.data?.data ?? []).map((e) => ({ value: e._id, label: `${e.employeeCode} · ${fullName(e)}` })) },
          { name: "leaveTypeId", label: "Leave type", type: "select", required: true, full: true, options: (types.data?.data ?? []).filter((t) => t.isActive).map((t) => ({ value: t._id, label: `${t.name}${t.isPaid ? "" : " (unpaid)"}` })) },
          { name: "fromDate", label: "From", type: "date", required: true }, { name: "toDate", label: "To", type: "date", required: true },
          { name: "isHalfDay", label: "Half day", type: "checkbox", hint: "Single day only" }, { name: "reason", label: "Reason", type: "textarea" },
        ]} />
      </Modal>
      <DecideLeaveDialog deciding={deciding} onClose={() => setDeciding(null)} loading={decide.isPending} onConfirm={(note) => decide.mutate({ ...deciding, note })} />
      <ConfirmDialog open={Boolean(cancelling)} onClose={() => setCancelling(null)} loading={cancel.isPending} onConfirm={() => cancel.mutate(cancelling._id)}
        title="Cancel this leave?" message="The balance is restored and attendance for those days is recalculated." confirmLabel="Cancel leave" />
    </>
  );
}
