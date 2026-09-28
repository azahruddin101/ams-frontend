"use client";
import { useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { usePwaStore } from "./pwaStore";

const isProd = process.env.NODE_ENV === "production";

/**
 * Registers the service worker, captures the install prompt, detects iOS/standalone, and shows a
 * "new version" banner when an updated worker is waiting. Renders nothing otherwise.
 */
export function PwaProvider() {
  const update = usePwaStore((s) => s.updateRegistration);
  const applyUpdate = usePwaStore((s) => s.applyUpdate);
  const userRequestedUpdate = useRef(false);

  useEffect(() => {
    const { set } = usePwaStore.getState();
    const mq = window.matchMedia("(display-mode: standalone)");
    const standalone = () => set({ standalone: mq.matches || window.navigator.standalone === true });
    standalone();
    mq.addEventListener?.("change", standalone);
    const ua = window.navigator.userAgent;
    set({ isIOS: /iphone|ipad|ipod/i.test(ua) || (ua.includes("Mac") && "ontouchend" in document) });

    const onPrompt = (e) => { e.preventDefault(); set({ deferredPrompt: e }); };
    const onInstalled = () => set({ deferredPrompt: null, installed: true });
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    let onVisible;
    let onControllerChange;
    if ("serviceWorker" in navigator && isProd) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((reg) => {
        const flag = () => navigator.serviceWorker.controller && set({ updateRegistration: reg });
        if (reg.waiting) flag();
        reg.addEventListener("updatefound", () => {
          const w = reg.installing;
          w?.addEventListener("statechange", () => w.state === "installed" && flag());
        });
        // Installed apps can stay open for days: look for a new version whenever the app comes back to the foreground.
        onVisible = () => document.visibilityState === "visible" && reg.update().catch(() => {});
        document.addEventListener("visibilitychange", onVisible);
      }).catch(() => {});
      // Reload only when the USER asked for the update, never mid-scan on a first install (clients.claim also fires this).
      onControllerChange = () => { if (userRequestedUpdate.current) window.location.reload(); };
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    }
    return () => {
      mq.removeEventListener?.("change", standalone);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (onVisible) document.removeEventListener("visibilitychange", onVisible);
      if (onControllerChange) navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (!update) return null;
  return (
    <div role="status" className="animate-pop fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[110] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-white p-3 pl-4 shadow-lg">
      <p className="flex-1 text-sm"><span className="font-medium">A new version is ready.</span> Refresh to update.</p>
      <Button size="sm" icon={RefreshCw} onClick={() => { userRequestedUpdate.current = true; applyUpdate(); }}>Refresh</Button>
    </div>
  );
}
