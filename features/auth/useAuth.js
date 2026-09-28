"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { refreshSession } from "@/lib/axios";
import { authService } from "@/services";
import { ROLE_HOME, SESSION_HINT_COOKIE } from "@/constants";

const dropHint = () => { document.cookie = `${SESSION_HINT_COOKIE}=; Max-Age=0; path=/`; };

/** Restores the session from the httpOnly refresh cookie (access token is memory-only). */
export function useSessionBootstrap() {
  const status = useAuthStore((s) => s.status);
  useEffect(() => {
    if (status !== "loading") return;
    refreshSession().catch(() => { dropHint(); useAuthStore.getState().clear(); });
  }, [status]);
  return status;
}

export function useLogin() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: authService.login,
    onSuccess: ({ data }, _vars, _ctx) => {
      setSession(data);
      const next = new URLSearchParams(window.location.search).get("next");
      const home = ROLE_HOME[data.user.role];
      router.replace(next && next.startsWith(home) ? next : home);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      dropHint();
      useAuthStore.getState().clear();
      qc.clear();
      router.replace("/login");
    },
  });
}
