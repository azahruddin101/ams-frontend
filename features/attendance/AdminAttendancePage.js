"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { attendanceService, employeeService } from "@/services";
import { useAuthStore, hasPermission } from "@/stores/authStore";
import { Button, Card, DataTable, Input, Select, Modal, PageHeader, StatusBadge, Badge } from "@/components/ui";
import { ResourceForm } from "@/components/forms/ResourceForm";
import { useZodForm, applyServerError } from "@/hooks/useZodForm";
import { toast } from "@/stores/uiStore";
import { ATTENDANCE_STATUS_META, PAGE_SIZE, PENALTY_REASON_LABEL } from "@/constants";
import { formatDate, formatDuration, formatMinutes, formatTime, fullName, todayKey } from "@/lib/utils";
import { z } from "zod";

const manualSchema = z.object({
  employeeId: z.string().min(1, "Select an employee"),
  type: z.enum(["MANUAL_CHECK_IN", "MANUAL_CHECK_OUT"]),
  timestamp: z.string().min(1, "Pick date & time"),
  reason: z.string().trim().min(3, "Give a reason (min 3 chars)").max(300),
});

export function AdminAttendancePage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ from: todayKey(), to: todayKey(), status: "", late: "" });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const params = { ...filters, page, limit: PAGE_SIZE, sortBy: "date", sortOrder: "desc" };
  const list = useQuery({ queryKey: ["attendance", params], queryFn: () => attendanceService.list(params), placeholderData: keepPreviousData });
  const emps = useQuery({ queryKey: ["employees", "options"], queryFn: () => employeeService.list({ limit: 100 }), enabled: open });
  const form = useZodForm(manualSchema, { employeeId: "", type: "MANUAL_CHECK_IN", timestamp: "", reason: "" });
  const canEdit = hasPermission(user, "attendance.update");
  const set = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1); };

  const manual = useMutation({
    mutationFn: (v) => attendanceService.manual({ ...v, timestamp: new Date(v.timestamp).toISOString() }),
    onSuccess: (r) => { toast.success(r.message); setOpen(false); form.reset(); qc.invalidateQueries({ queryKey: ["attendance"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
    onError: (e) => applyServerError(form, e),
  });

  const columns = [
    { key: "date", header: "Date", render: (r) => formatDate(r.date) },
    { key: "employee", header: "Employee", render: (r) => <div><div className="font-medium">{fullName(r.employeeId)}</div><div className="text-xs text-muted">{r.employeeId?.employeeCode}</div></div> },
    { key: "in", header: "In", render: (r) => formatTime(r.firstCheckIn) },
    { key: "out", header: "Out", render: (r) => (r.isOpen ? <Badge tone="blue">Working</Badge> : formatTime(r.lastCheckOut)) },
    { key: "work", header: "Worked", render: (r) => formatMinutes(r.totalWorkingMinutes) },
    { key: "late", header: "Late", render: (r) => (r.lateMinutes ? formatDuration(r.lateMinutes) : "—") },
    { key: "ot", header: "Overtime", render: (r) => (r.overtimeMinutes ? formatMinutes(r.overtimeMinutes) : "—") },
    { key: "status", header: "Status", render: (r) => <div><StatusBadge meta={ATTENDANCE_STATUS_META} value={r.status} />{r.penaltyReason && <div className="mt-1 text-xs text-muted">{PENALTY_REASON_LABEL[r.penaltyReason]}</div>}</div> },
  ];
  const statusOptions = Object.entries(ATTENDANCE_STATUS_META).map(([value, m]) => ({ value, label: m.label }));

  return (
    <>
      <PageHeader title="Attendance" description="All times are calculated on the server using each employee's shift and your policy."
        actions={canEdit && <Button icon={Plus} onClick={() => setOpen(true)}>Manual entry</Button>} />
      <Card padded={false}>
        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="From" type="date" value={filters.from} onChange={set("from")} />
          <Input label="To" type="date" value={filters.to} onChange={set("to")} />
          <Select label="Status" value={filters.status} onChange={set("status")} options={statusOptions} placeholder="All" />
          <Select label="Late" value={filters.late} onChange={set("late")} options={[{ value: "true", label: "Late only" }]} placeholder="Any" />
        </div>
        <DataTable columns={columns} rows={list.data?.data} isLoading={list.isLoading} isError={list.isError} onRetry={list.refetch}
          pagination={list.data?.pagination} onPage={setPage} emptyTitle="No attendance records" emptyDescription="Try widening the date range." />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Manual attendance entry">
        <p className="mb-4 text-sm text-muted">Adds a new audited event. Existing events are never overwritten. Time is in your device&apos;s timezone.</p>
        <ResourceForm form={form} onSubmit={(v) => manual.mutate(v)} submitting={manual.isPending} onCancel={() => setOpen(false)} submitLabel="Add entry" fields={[
          { name: "employeeId", label: "Employee", type: "select", required: true, full: true, options: (emps.data?.data ?? []).map((e) => ({ value: e._id, label: `${e.employeeCode} · ${fullName(e)}` })) },
          { name: "type", label: "Type", type: "select", placeholder: undefined, options: [{ value: "MANUAL_CHECK_IN", label: "Check in" }, { value: "MANUAL_CHECK_OUT", label: "Check out" }] },
          { name: "timestamp", label: "Date & time", type: "datetime-local", required: true },
          { name: "reason", label: "Reason", type: "textarea", required: true },
        ]} />
      </Modal>
    </>
  );
}
