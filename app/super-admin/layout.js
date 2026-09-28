"use client";
import { AuthGuard } from "@/features/auth/AuthGuard";
import { AppShell } from "@/components/layout/AppShell";
import { SUPER_ADMIN_NAV } from "@/constants/nav";
import { ROLES } from "@/constants";

export default function Layout({ children }) {
  return <AuthGuard roles={[ROLES.SUPER_ADMIN]}><AppShell nav={SUPER_ADMIN_NAV} tabs={["/super-admin", "/super-admin/companies"]}>{children}</AppShell></AuthGuard>;
}
