"use client";
import { AuthGuard } from "@/features/auth/AuthGuard";
import { AppShell } from "@/components/layout/AppShell";
import { EMPLOYEE_NAV } from "@/constants/nav";
import { ROLES } from "@/constants";

export default function Layout({ children }) {
  return <AuthGuard roles={[ROLES.EMPLOYEE]}><AppShell nav={EMPLOYEE_NAV} tabs={["/employee", "/employee/attendance", "/employee/leaves", "/employee/approvals"]}>{children}</AppShell></AuthGuard>;
}
