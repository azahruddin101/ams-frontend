import { LayoutDashboard, Users, Building2, Clock, CalendarCheck, FileBarChart, Settings, ShieldCheck, ScrollText, Layers, Sun, ScanFace, CalendarPlus, CalendarDays, Tablet, UserCog, ClipboardCheck } from "lucide-react";

/** `count`: which number from /dashboard/menu-counts to show beside the entry; `countLabel` says what it counts. */
export const SUPER_ADMIN_NAV = [
  { href: "/super-admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/super-admin/companies", count: "companies", countLabel: "companies", label: "Companies", icon: Building2 },
];

export const COMPANY_NAV = [
  { href: "/company", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/device", label: "Scan attendance", icon: ScanFace },
  { href: "/company/employees", count: "employees", countLabel: "employees", label: "Employees", icon: Users },
  { href: "/company/attendance", count: "attendance", countLabel: "present today", label: "Attendance", icon: CalendarCheck },
  { href: "/company/leaves", count: "leaves", countLabel: "waiting for approval", label: "Leaves", icon: CalendarPlus },
  { href: "/company/reports", label: "Reports", icon: FileBarChart },
  { href: "/company/departments", count: "departments", countLabel: "departments", label: "Departments", icon: Layers },
  { href: "/company/shifts", count: "shifts", countLabel: "shifts", label: "Shifts", icon: Clock },
  { href: "/company/holidays", count: "holidays", countLabel: "holidays", label: "Holidays", icon: Sun },
  { href: "/company/leave-types", count: "leaveTypes", countLabel: "leave types", label: "Leave types", icon: CalendarDays },
  { href: "/company/devices", count: "devices", countLabel: "devices", label: "Attendance devices", icon: Tablet },
  { href: "/company/policy", label: "Attendance rules", icon: ShieldCheck },
  // { href: "/company/audit", label: "Audit log", icon: ScrollText },
  { href: "/company/settings", label: "Settings", icon: Settings },
  { href: "/company/account", label: "Account", icon: UserCog },
];

/** Employee logins. Entries with a `permission` appear only when the employee's department has that authority. */
export const EMPLOYEE_NAV = [
  { href: "/employee", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/employee/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/employee/leaves", count: "myLeaves", countLabel: "waiting for approval", label: "Leaves", icon: CalendarPlus },
  { href: "/employee/approvals", count: "approvals", countLabel: "waiting for you", label: "Approvals", icon: ClipboardCheck, permission: "leave.approve" },
  { href: "/employee/employees", count: "employees", countLabel: "employees", label: "Employees", icon: Users, permission: "employee.create" },
  { href: "/employee/account", label: "Account", icon: UserCog },
];
