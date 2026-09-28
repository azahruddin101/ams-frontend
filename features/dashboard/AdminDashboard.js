"use client";
import { useQuery } from "@tanstack/react-query";
import { CalendarHeart, Globe2 } from "lucide-react";
import { Users, UserCheck, UserX, Clock, CalendarOff, AlertTriangle, Timer, Hourglass } from "lucide-react";
import { dashboardService, holidayService } from "@/services";
import { Card, StatCard, QueryBoundary } from "@/components/ui";
import { CompanyLogo } from "@/components/brand/CompanyLogo";
import { useAuthStore } from "@/stores/authStore";
import { useNow } from "@/hooks/useNow";
import { formatMinutes, formatDate } from "@/lib/utils";
import { SetupCard } from "./SetupCard";
import { RunJobsButton } from "@/features/jobs/RunJobs";
import { InstallBanner } from "@/features/pwa/InstallApp";

/** Minimal accessible SVG bars: present vs late per day. */
function TrendChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.present));
  return (
    <figure>
      <svg viewBox={`0 0 ${data.length * 56} 140`} role="img" aria-label="Attendance trend for the last 7 days" className="h-44 w-full">
        {data.map((d, i) => {
          const h = (d.present / max) * 100;
          const lh = (d.late / max) * 100;
          return (
            <g key={d.date} transform={`translate(${i * 56 + 8},0)`}>
              <rect y={110 - h} width="40" height={h} rx="4" className="fill-brand-500" />
              <rect y={110 - lh} width="40" height={lh} rx="4" className="fill-amber-400" />
              <text x="20" y={104 - h} textAnchor="middle" className="fill-slate-700 text-[10px]">{d.present}</text>
              <text x="20" y="128" textAnchor="middle" className="fill-slate-500 text-[10px]">{formatDate(d.date, { day: "2-digit", month: "short" })}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-brand-500" />Present</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-amber-400" />Late (of present)</span>
      </figcaption>
    </figure>
  );
}

/** Next few holidays from a date key; yearly-recurring ones are projected onto this/next year. */
function upcomingHolidays(list, todayKey, count = 3) {
  const year = Number(todayKey.slice(0, 4));
  return list
    .flatMap((h) => (h.recurring ? [year, year + 1].map((y) => ({ ...h, date: `${y}${h.date.slice(4)}` })) : [h]))
    .filter((h) => h.date >= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, count);
}

const greeting = (hour) => (hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");

/** Company-branded header: their logo, colour, name, local time and what's coming up. */
function Hero({ company, todayKey, present, total }) {
  const now = useNow(1000); // live clock: ticks every second
  const holidays = useQuery({ queryKey: ["holidays", "upcoming"], queryFn: () => holidayService.list({ limit: 100 }) });
  const tz = company.timezone;
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz }).format(now)) % 24;
  // 12-hour clock with seconds, in the COMPANY's timezone (not the viewer's), e.g. 12 : 28 : 05 PM
  const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true, timeZone: tz }).formatToParts(now);
  const part = (t) => parts.find((p) => p.type === t)?.value ?? "";
  const clock = `${part("hour")}:${part("minute")}:${part("second")}`;
  const period = part("dayPeriod").toUpperCase();
  const date = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(now);
  const next = upcomingHolidays(holidays.data?.data ?? [], todayKey);

  return (
    <section aria-label={`${company.name} overview`} className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-900 text-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-5 p-5 sm:p-8">
        <div className="flex min-w-0 items-center gap-4">
          <CompanyLogo company={company} size="size-14 sm:size-20" className="ring-4 ring-white/25" />
          <div className="min-w-0">
            <p className="text-sm text-white/80">{greeting(hour)}</p>
            <h1 className="text-xl font-semibold leading-tight tracking-tight sm:truncate sm:text-3xl">{company.name}</h1>
            <p className="mt-1 min-h-5 text-sm text-white/80">{total === null ? "" : total ? `${present} of ${total} employees are in today` : "Add your first employees to get started"}</p>
          </div>
        </div>
        <div className="w-full border-t border-white/15 pt-4 sm:w-auto sm:border-0 sm:pt-0 sm:text-right">
          <p className="text-3xl font-semibold tabular-nums sm:text-4xl" role="timer" aria-label={`${clock} ${period}`}>{clock}<span className="ml-1.5 text-xl font-medium text-white/80">{period}</span></p>
          <p className="text-sm text-white/80">{date}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-white/70"><Globe2 className="size-3.5" aria-hidden />{tz}</p>
        </div>
      </div>
      {next.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/15 bg-black/10 px-5 py-3 text-sm sm:px-8">
          <span className="inline-flex items-center gap-1.5 font-medium"><CalendarHeart className="size-4" aria-hidden />Upcoming holidays</span>
          {next.map((h) => (
            <span key={h.date + h.name} className="rounded-full bg-white/15 px-3 py-1">{h.name} · {formatDate(h.date, { day: "numeric", month: "short" })}</span>
          ))}
        </div>
      )}
    </section>
  );
}

export function AdminDashboard() {
  const company = useAuthStore((s) => s.user?.company);
  const q = useQuery({ queryKey: ["dashboard", "company"], queryFn: dashboardService.company, refetchInterval: 60_000 });
  return (
    <>
      <InstallBanner className="mb-4 sm:hidden" />
      {company && q.data && <Hero company={company} todayKey={q.data.data.date} present={q.data.data.presentToday} total={q.data.data.totalEmployees} />}
      {company && !q.data && <Hero company={company} todayKey={new Date().toISOString().slice(0, 10)} present={0} total={null} />}
      <div className="mb-6"><SetupCard /></div>
      <div className="mb-4 flex justify-end"><RunJobsButton /></div>
      <QueryBoundary query={q}>
        {({ data: d }) => (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
              <StatCard label="Total employees" value={d.totalEmployees} icon={Users} />
              <StatCard label="Present today" value={d.presentToday} icon={UserCheck} tone="green" />
              <StatCard label="Not in yet / absent" value={d.absentToday} icon={UserX} tone="red" />
              <StatCard label="Late today" value={d.lateToday} icon={Clock} tone="amber" />
              <StatCard label="On leave" value={d.onLeave} icon={CalendarOff} tone="blue" />
              <StatCard label="Incomplete attendance" value={d.incompleteAttendance} icon={AlertTriangle} tone="red" />
              <StatCard label="Total working hours" value={formatMinutes(d.totalWorkingMinutes)} icon={Timer} />
              <StatCard label="Overtime" value={formatMinutes(d.overtimeMinutes)} icon={Hourglass} tone="amber" />
            </div>
            <Card title="Last 7 days">{d.trend.length ? <TrendChart data={d.trend} /> : <p className="py-8 text-center text-sm text-muted">No attendance recorded yet.</p>}</Card>
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
