"use client";
import Link from "next/link";
import { CheckCircle2, Circle, ScanFace } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { deviceService, employeeService } from "@/services";
import { Card } from "@/components/ui";

function Step({ done, title, detail, href, cta }) {
  const Icon = done ? CheckCircle2 : Circle;
  return (
    <li className="flex items-start gap-3 py-3">
      <Icon className={done ? "mt-0.5 size-5 shrink-0 text-emerald-600" : "mt-0.5 size-5 shrink-0 text-slate-300"} aria-hidden />
      <div className="min-w-0 flex-1"><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted">{detail}</p></div>
      <Link href={href} className="tap text-sm font-medium text-brand-700 hover:underline">{cta}</Link>
    </li>
  );
}

/** Guides a company from "no faces yet" to "employees are scanning", and is the obvious way into the scanner. */
export function SetupCard() {
  const emps = useQuery({ queryKey: ["employees", "setup"], queryFn: () => employeeService.list({ limit: 100, status: "ACTIVE" }) });
  const devices = useQuery({ queryKey: ["devices", "setup"], queryFn: () => deviceService.list({ limit: 50 }) });
  const loading = emps.isLoading || devices.isLoading;
  const list = emps.data?.data ?? [];
  const total = emps.data?.pagination?.total ?? list.length;
  const enrolled = list.filter((e) => e.faceRegistered).length;
  const activeDevices = (devices.data?.data ?? []).filter((d) => d.isActive).length;

  return (
    <Card title="Face attendance" action={<Link href="/device" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 text-base font-medium text-white transition-[background-color,transform] hover:bg-brand-700 active:scale-[0.98] sm:w-auto"><ScanFace className="size-5" aria-hidden />Scan attendance now</Link>}>
      <p className="mb-1 text-sm text-muted">Employees have no accounts. They scan their face at an attendance device, and the server records their time.</p>
      {loading ? <div role="status" className="h-40 animate-pulse rounded-lg bg-slate-50"><span className="sr-only">Loading</span></div> : (
      <ul className="divide-y divide-line">
        <Step done={total > 0} title="Add employees" detail={`${total} active employee${total === 1 ? "" : "s"}`} href="/company/employees" cta="Employees" />
        <Step done={total > 0 && enrolled === list.length} title="Register their faces" detail={`${enrolled} of ${list.length} registered — use “Register face” in the employee's row menu`} href="/company/employees" cta="Register" />
        <Step done={activeDevices > 0} title="Add an attendance device (optional)" detail={activeDevices ? `${activeDevices} device${activeDevices === 1 ? "" : "s"} set up` : "Or just scan from this account on this phone"} href="/company/devices" cta="Devices" />
      </ul>
      )}
    </Card>
  );
}
