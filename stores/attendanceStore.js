import { create } from "zustand";

/** Ephemeral attendance-camera state. Server data (today's record etc.) belongs to TanStack Query. */
export const useAttendanceStore = create((set) => ({
  action: null, // "CHECK_IN" | "CHECK_OUT" | null — what the camera flow is for
  phase: "idle", // idle | loading-models | starting-camera | positioning | verifying | submitting | success | error
  hint: "Center your face",
  errorCode: null,
  lastFaceToken: null,
  open: (action) => set({ action, phase: "loading-models", hint: "Loading…", errorCode: null, lastFaceToken: null }),
  setPhase: (phase, hint) => set((s) => ({ phase, hint: hint ?? s.hint })),
  setHint: (hint) => set({ hint }),
  fail: (errorCode, hint) => set({ phase: "error", errorCode, hint }),
  reset: () => set({ action: null, phase: "idle", hint: "Center your face", errorCode: null, lastFaceToken: null }),
}));
