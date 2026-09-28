import { create } from "zustand";

/** Access token lives in memory only (never localStorage): a page reload re-bootstraps via the httpOnly refresh cookie. */
export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  status: "loading", // loading | authenticated | unauthenticated
  setSession: ({ user, accessToken }) => set({ user, accessToken, status: "authenticated" }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  clear: () => set({ user: null, accessToken: null, status: "unauthenticated" }),
}));

export const hasPermission = (user, permission) => Boolean(user?.permissions?.includes(permission));
