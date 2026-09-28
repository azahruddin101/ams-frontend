"use client";
import { AuthGuard } from "@/features/auth/AuthGuard";
import { AppShell } from "@/components/layout/AppShell";
import { COMPANY_NAV } from "@/constants/nav";
import { ROLES } from "@/constants";

export default function Layout({ children }) {
  return <AuthGuard roles={[ROLES.COMPANY]}><AppShell nav={COMPANY_NAV} tabs={["/company", "/device", "/company/employees", "/company/attendance"]}>{children}</AppShell></AuthGuard>;
}
