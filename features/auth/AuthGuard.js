"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { LoadingState } from "@/components/ui";
import { ROLE_HOME } from "@/constants";
import { useSessionBootstrap } from "./useAuth";

/** Client-side guard (UX). Renders children only for authenticated users holding one of `roles`. */
export function AuthGuard({ roles, children }) {
  const status = useSessionBootstrap();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (status === "authenticated" && !roles.includes(user.role)) router.replace(ROLE_HOME[user.role]);
  }, [status, user, roles, router, pathname]);

  if (status !== "authenticated" || !roles.includes(user?.role)) return <LoadingState label="Checking your session…" className="min-h-dvh" />;
  return children;
}
