"use client";
import { useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2, FlaskConical, PauseCircle, Users, Activity } from "lucide-react";
import { companyService } from "@/services";
import { PageHeader, QueryBoundary, StatCard } from "@/components/ui";

export function SuperAdminDashboard() {
  const q = useQuery({ queryKey: ["platform", "stats"], queryFn: companyService.stats, refetchInterval: 60_000 });
  return (
    <>
      <PageHeader title="Platform overview" description="SaaS-level metrics across all tenants." />
      <QueryBoundary query={q}>
        {({ data: d }) => (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Total companies" value={d.totalCompanies} icon={Building2} />
            <StatCard label="Active" value={d.activeCompanies} icon={CheckCircle2} tone="green" />
            <StatCard label="Trial" value={d.trialCompanies} icon={FlaskConical} tone="blue" />
            <StatCard label="Suspended" value={d.suspendedCompanies} icon={PauseCircle} tone="red" />
            <StatCard label="Total employees" value={d.totalEmployees} icon={Users} />
            <StatCard label="Attendance events (24h)" value={d.attendanceEventsToday} icon={Activity} tone="amber" />
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
