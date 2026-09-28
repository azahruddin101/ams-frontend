import { create } from "zustand";

/** Install/update state for the PWA. Populated by <PwaProvider/>; read by install buttons and the update banner. */
export const usePwaStore = create((set, get) => ({
  deferredPrompt: null, // the browser's beforeinstallprompt event (Chromium/Android/desktop)
  standalone: false, // already running as an installed app
  isIOS: false, // iOS Safari has no install prompt: we show "Add to Home Screen" instructions instead
  installed: false,
  updateRegistration: null, // a service-worker registration with a waiting (new) version
  set,
  async promptInstall() {
    const { deferredPrompt } = get();
    if (!deferredPrompt) return "unavailable";
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    set({ deferredPrompt: null });
    return outcome; // "accepted" | "dismissed"
  },
  applyUpdate() {
    const reg = get().updateRegistration;
    reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
  },
}));

export const selectCanInstall = (s) => !s.standalone && !s.installed && (Boolean(s.deferredPrompt) || s.isIOS);
