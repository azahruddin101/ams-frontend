"use client";
import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { meService } from "@/services";
import { useAuthStore } from "@/stores/authStore";
import { Badge, Card, DataTable, Input, PageHeader, StatusBadge } from "@/components/ui";
import { ATTENDANCE_STATUS_META, PAGE_SIZE, PENALTY_REASON_LABEL } from "@/constants";
import { formatDate, formatDuration, formatMinutes, formatTime, todayKey } from "@/lib/utils";

export function MyAttendancePage() {
  const tz = useAuthStore((s) => s.user?.company?.timezone);
  const [f, setF] = useState({ from: `${todayKey().slice(0, 8)}01`, to: todayKey() });
  const [page, setPage] = useState(1);
  const params = { ...f, page, limit: PAGE_SIZE, sortBy: "date", sortOrder: "desc" };
  const q = useQuery({ queryKey: ["me", "attendance", params], queryFn: () => meService.attendance(params), placeholderData: keepPreviousData });
  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setPage(1); };

  const columns = [
    { key: "date", header: "Date", render: (r) => formatDate(r.date, { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) },
    { key: "in", header: "In", render: (r) => formatTime(r.firstCheckIn, tz) },
    { key: "out", header: "Out", render: (r) => (r.isOpen ? <Badge tone="blue">Working</Badge> : formatTime(r.lastCheckOut, tz)) },
    { key: "work", header: "Worked", render: (r) => formatMinutes(r.totalWorkingMinutes) },
    { key: "late", header: "Late", render: (r) => (r.lateMinutes ? formatDuration(r.lateMinutes) : "—") },
    { key: "ot", header: "Overtime", render: (r) => (r.overtimeMinutes ? formatMinutes(r.overtimeMinutes) : "—") },
    { key: "status", header: "Status", render: (r) => <div><StatusBadge meta={ATTENDANCE_STATUS_META} value={r.status} />{r.penaltyReason && <div className="mt-1 text-xs text-muted">{PENALTY_REASON_LABEL[r.penaltyReason]}</div>}</div> },
  ];
  return (
    <>
      <PageHeader title="My attendance" description="Your days as recorded by the attendance device. If something looks wrong, ask your company to correct it." />
      <Card padded={false}>
        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="From" type="date" value={f.from} onChange={set("from")} />
          <Input label="To" type="date" value={f.to} onChange={set("to")} />
        </div>
        <DataTable columns={columns} rows={q.data?.data} isLoading={q.isLoading} isError={q.isError} onRetry={q.refetch} pagination={q.data?.pagination} onPage={setPage}
          emptyTitle="No attendance in this period" emptyDescription="Try widening the date range." />
      </Card>
    </>
  );
}
