"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { reportService, departmentService } from "@/services";
import { Button, Card, DataTable, Input, PageHeader, Select, StatusBadge } from "@/components/ui";
import { toast } from "@/stores/uiStore";
import { getErrorMessage } from "@/lib/errors";
import { ATTENDANCE_STATUS_META, LEAVE_STATUS_META, PAGE_SIZE } from "@/constants";
import { downloadBlob, formatDate, formatLeaveDates, formatDuration, formatMinutes, formatMoney, formatTime, fullName, todayKey } from "@/lib/utils";

const emp = { key: "employee", header: "Employee", render: (r) => (r.employeeId?.firstName ? fullName(r.employeeId) : r.name) };
const date = { key: "date", header: "Date", render: (r) => formatDate(r.date) };
const cash = (key, header) => ({ key, header, render: (r) => formatMoney(r[key], r.currency) });
const REPORTS = {
  daily: { label: "Daily attendance", columns: [date, emp, { key: "in", header: "In", render: (r) => formatTime(r.firstCheckIn) }, { key: "out", header: "Out", render: (r) => formatTime(r.lastCheckOut) }, { key: "w", header: "Worked", render: (r) => formatMinutes(r.totalWorkingMinutes) }, { key: "s", header: "Status", render: (r) => <StatusBadge meta={ATTENDANCE_STATUS_META} value={r.status} /> }] },
  monthly: { label: "Monthly attendance", columns: [{ key: "employeeCode", header: "Code" }, { key: "name", header: "Employee" }, { key: "present", header: "Present" }, { key: "absent", header: "Absent" }, { key: "halfDay", header: "Half days" }, { key: "late", header: "Late" }, { key: "onLeave", header: "Leave" }, { key: "incomplete", header: "Incomplete" }, { key: "w", header: "Worked", render: (r) => formatMinutes(r.workingMinutes) }, { key: "ot", header: "Overtime", render: (r) => formatMinutes(r.overtimeMinutes) }], rowKey: (r) => r.employeeId },
  employee: { label: "Employee attendance", needsEmployee: false, columns: [date, emp, { key: "w", header: "Worked", render: (r) => formatMinutes(r.totalWorkingMinutes) }, { key: "s", header: "Status", render: (r) => <StatusBadge meta={ATTENDANCE_STATUS_META} value={r.status} /> }] },
  late: { label: "Late arrivals", columns: [date, emp, { key: "in", header: "Check-in", render: (r) => formatTime(r.firstCheckIn) }, { key: "l", header: "Late by", render: (r) => formatDuration(r.lateMinutes) }] },
  overtime: { label: "Overtime", columns: [date, emp, { key: "w", header: "Worked", render: (r) => formatMinutes(r.totalWorkingMinutes) }, { key: "o", header: "Overtime", render: (r) => formatMinutes(r.overtimeMinutes) }] },
  salary: {
    label: "Salary", byMonth: true, rowKey: (r) => r.employeeId,
    columns: [{ key: "employeeCode", header: "Code" }, { key: "name", header: "Employee" }, { key: "department", header: "Department", render: (r) => r.department || "—" }, cash("monthlySalary", "Salary"), { key: "present", header: "Present" }, { key: "late", header: "Late" }, { key: "halfDay", header: "Half days" }, { key: "absent", header: "Absent" }, { key: "unpaidLeave", header: "Unpaid leave" }, { key: "deductionDays", header: "Days deducted" }, cash("deductionAmount", "Deduction"), cash("netSalary", "Net salary")],
  },
  leave: { label: "Leave", columns: [emp, { key: "t", header: "Type", render: (r) => r.leaveTypeId?.name }, { key: "f", header: "Dates", render: (r) => <span className="block max-w-72 whitespace-normal">{formatLeaveDates(r)}</span> }, { key: "d", header: "Days", render: (r) => r.days }, { key: "s", header: "Status", render: (r) => <StatusBadge meta={LEAVE_STATUS_META} value={r.status} /> }] },
};

export function ReportsPage() {
  const monthStart = `${todayKey().slice(0, 8)}01`;
  const [type, setType] = useState("daily");
  const [f, setF] = useState({ from: monthStart, to: todayKey(), department: "" });
  const [month, setMonth] = useState(todayKey().slice(0, 7));
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const cfg = REPORTS[type];
  const filters = cfg.byMonth ? { month, department: f.department } : f;
  const params = cfg.byMonth ? filters : { ...f, page, limit: PAGE_SIZE };
  const depts = useQuery({ queryKey: ["departments", "options"], queryFn: () => departmentService.list({ limit: 100 }) });
  const q = useQuery({ queryKey: ["report", type, params], queryFn: () => reportService.get(type, params), placeholderData: keepPreviousData, enabled: cfg.byMonth ? Boolean(month) : f.from <= f.to });
  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setPage(1); };

  async function exportCsv() {
    setExporting(true);
    try { downloadBlob(await reportService.csv(type, cfg.byMonth ? filters : { ...f, limit: 100 }), cfg.byMonth ? `${type}-${month}.csv` : `${type}-${f.from}_${f.to}.csv`); }
    catch (e) { toast.error(getErrorMessage(e)); }
    finally { setExporting(false); }
  }

  return (
    <>
      <PageHeader title="Reports" description="Filter by date range and department, then export to CSV. The Salary report shows each employee's deductions and net salary for a month." actions={<Button variant="secondary" icon={Download} loading={exporting} onClick={exportCsv}>Export CSV</Button>} />
      <Card padded={false}>
        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Report" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} options={Object.entries(REPORTS).map(([value, r]) => ({ value, label: r.label }))} />
          {cfg.byMonth
            ? <Input label="Month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} hint="Deductions follow each department's rules" />
            : <>
              <Input label="From" type="date" value={f.from} onChange={set("from")} error={f.from > f.to ? "Must be before 'To'" : undefined} />
              <Input label="To" type="date" value={f.to} onChange={set("to")} />
            </>}
          <Select label="Department" value={f.department} onChange={set("department")} placeholder="All" options={(depts.data?.data ?? []).map((d) => ({ value: d._id, label: d.name }))} />
        </div>
        <DataTable columns={cfg.columns} rowKey={cfg.rowKey} rows={q.data?.data} isLoading={q.isLoading} isError={q.isError} onRetry={q.refetch} pagination={type === "monthly" || cfg.byMonth ? undefined : q.data?.pagination} onPage={setPage}
          emptyTitle="No data for this range" emptyDescription="Adjust the filters and try again." />
      </Card>
    </>
  );
}
