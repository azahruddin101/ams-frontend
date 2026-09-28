"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, CalendarX, CheckCircle2, Clock, ClipboardCheck, Timer, UserX, CalendarOff } from "lucide-react";
import { meService } from "@/services";
import { useAuthStore, hasPermission } from "@/stores/authStore";
import { Badge, Button, Card, QueryBoundary, StatCard, StatusBadge } from "@/components/ui";
import { ATTENDANCE_STATUS_META, LEAVE_STATUS_META, PENALTY_REASON_LABEL, TIMING_MODE_LABEL } from "@/constants";
import { formatDate, formatDuration, formatMinutes, formatMoney, formatTime, fullName, formatLeaveDates } from "@/lib/utils";
import { ApplyLeaveModal } from "./ApplyLeaveModal";

const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

function Today({ today, rules, tz }) {
  const expected = rules.timingMode === "FIXED" ? `${rules.expectedCheckInTime} – ${rules.expectedCheckOutTime}` : rules.timingMode === "FLEXIBLE" ? `Any time · ${formatDuration(rules.fullDayMinutes)} a day` : "No set hours";
  return (
    <Card title="Today" action={today ? <StatusBadge meta={ATTENDANCE_STATUS_META} value={today.status} /> : <Badge>Not marked yet</Badge>}>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[["Check-in", formatTime(today?.firstCheckIn, tz)], ["Check-out", today?.isOpen ? "Working" : formatTime(today?.lastCheckOut, tz)], ["Worked", formatMinutes(today?.totalWorkingMinutes)], ["Late by", today?.lateMinutes ? formatDuration(today.lateMinutes) : "—"]].map(([k, v]) => (
          <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="text-lg font-semibold tabular-nums">{v}</dd></div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-muted">{TIMING_MODE_LABEL[rules.timingMode]} · {expected}. Attendance is marked by scanning your face at the attendance device.</p>
      {today?.penaltyReason && <p className="mt-1 text-sm text-amber-800">{PENALTY_REASON_LABEL[today.penaltyReason]}</p>}
    </Card>
  );
}

export function EmployeeDashboard() {
  const user = useAuthStore((s) => s.user);
  const [applying, setApplying] = useState(false);
  const q = useQuery({ queryKey: ["me", "profile"], queryFn: meService.profile });
  const balance = useQuery({ queryKey: ["me", "leave-balance"], queryFn: meService.leaveBalance });
  const leaves = useQuery({ queryKey: ["me", "leaves", "recent"], queryFn: () => meService.leaves({ limit: 5 }) });
  const canApprove = hasPermission(user, "leave.approve");
  const waiting = useQuery({ queryKey: ["me", "approvals", "count"], queryFn: () => meService.approvals({ status: "PENDING", limit: 1 }), enabled: canApprove });
  const tz = user?.company?.timezone;

  return (
    <QueryBoundary query={q}>
      {({ data: { employee: e, today, month, rules } }) => (
        <div className="space-y-6">
          <section className="flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-brand-600 p-5 text-white sm:p-6">
            <div className="min-w-0">
              <p className="text-sm text-white/80">{greeting()}</p>
              <h1 className="truncate text-2xl font-semibold tracking-tight">{fullName(e)}</h1>
              <p className="mt-1 text-sm text-white/80">{[e.designation, e.departmentId?.name, e.employeeCode].filter(Boolean).join(" · ")}</p>
            </div>
            <Button variant="secondary" icon={CalendarPlus} onClick={() => setApplying(true)}>Apply for leave</Button>
          </section>

          {canApprove && (waiting.data?.pagination?.total ?? 0) > 0 && (
            <Link href="/employee/approvals" className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 hover:bg-amber-100">
              <span className="flex items-center gap-2 font-medium"><ClipboardCheck className="size-5" aria-hidden />{waiting.data.pagination.total} leave request{waiting.data.pagination.total === 1 ? "" : "s"} waiting for you</span>
              <span className="font-medium underline">Review</span>
            </Link>
          )}

          <Today today={today} rules={rules} tz={tz} />

          <section aria-label="This month">
            <h2 className="mb-3 text-sm font-semibold text-muted">This month · {formatDate(month.from, { month: "long", year: "numeric" })}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="Present" value={month.present} icon={CheckCircle2} tone="green" />
              <StatCard label="Late" value={month.late} icon={Clock} tone="amber" />
              <StatCard label="Half days" value={month.halfDay} icon={CalendarX} tone="amber" />
              <StatCard label="Absent" value={month.absent} icon={UserX} tone="red" />
              <StatCard label="On leave" value={month.onLeave} icon={CalendarOff} tone="blue" />
              <StatCard label="Worked" value={formatMinutes(month.workingMinutes)} icon={Timer} />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="About me">
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                {[
                  ["Employee code", e.employeeCode], ["Email", e.email], ["Phone", e.phone || "—"], ["Joined", formatDate(e.dateOfJoining)],
                  ["Department", e.departmentId?.name ?? "—"], ["Designation", e.designation || "—"], ["Employment", e.employmentType?.replace("_", " ").toLowerCase()],
                  ["Shift", e.shiftId ? `${e.shiftId.name} (${e.shiftId.startTime} – ${e.shiftId.endTime})` : "Company default"],
                  ["Monthly salary", formatMoney(e.monthlySalary, user?.company?.currency)],
                  ["Face", e.faceRegistered ? "Registered" : "Not registered — ask your company"],
                ].map(([k, v]) => <div key={k} className="min-w-0"><dt className="text-xs text-muted">{k}</dt><dd className="truncate font-medium" title={typeof v === "string" ? v : undefined}>{v}</dd></div>)}
              </dl>
            </Card>

            <Card title="Leave balance" action={<Link href="/employee/leaves" className="text-sm font-medium text-brand-700 hover:underline">All my leave</Link>}>
              <QueryBoundary query={balance}>
                {({ data }) => (
                  <ul className="divide-y divide-line">
                    {data.map((b) => (
                      <li key={b.leaveTypeId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <span className="min-w-0"><span className="font-medium">{b.name}</span>{!b.isPaid && <span className="text-muted"> · unpaid</span>}<span className="block text-xs text-muted">{b.used} used{b.pending ? ` · ${b.pending} waiting` : ""} of {b.quota}</span></span>
                        <span className="text-lg font-semibold tabular-nums">{b.remaining}<span className="text-xs font-normal text-muted"> left</span></span>
                      </li>
                    ))}
                    {data.length === 0 && <li className="py-2.5 text-sm text-muted">No leave types yet.</li>}
                  </ul>
                )}
              </QueryBoundary>
              {(leaves.data?.data ?? []).length > 0 && (
                <div className="mt-4 border-t border-line pt-3">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Recent requests</h3>
                  <ul className="space-y-2">
                    {leaves.data.data.map((l) => (
                      <li key={l._id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate">{l.leaveTypeId?.name} · {formatLeaveDates(l)}</span>
                        <StatusBadge meta={LEAVE_STATUS_META} value={l.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>
          <ApplyLeaveModal open={applying} onClose={() => setApplying(false)} />
        </div>
      )}
    </QueryBoundary>
  );
}
