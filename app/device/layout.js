"use client";
import { AuthGuard } from "@/features/auth/AuthGuard";
import { ROLES } from "@/constants";

/** Full-screen, no navigation: attendance devices see nothing but the scanner. Company users may use it too. */
export default function Layout({ children }) {
  return <AuthGuard roles={[ROLES.ATTENDANCE_DEVICE, ROLES.COMPANY]}>{children}</AuthGuard>;
}
