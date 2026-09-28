"use client";
import { useState } from "react";
import { Download, PlusSquare, Share, X } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { toast } from "@/stores/uiStore";
import { selectCanInstall, usePwaStore } from "./pwaStore";

const DISMISS_KEY = "ams-install-dismissed";
const safeStorage = {
  get: () => { try { return window.localStorage.getItem(DISMISS_KEY); } catch { return null; } },
  set: () => { try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* storage unavailable */ } },
};

/** Install behaviour shared by every entry point: native prompt where available, iOS instructions otherwise. */
export function useInstall() {
  const canInstall = usePwaStore(selectCanInstall);
  const isIOS = usePwaStore((s) => s.isIOS);
  const hasPrompt = usePwaStore((s) => Boolean(s.deferredPrompt));
  const promptInstall = usePwaStore((s) => s.promptInstall);
  const [help, setHelp] = useState(false);
  const install = async () => {
    if (hasPrompt) { if ((await promptInstall()) === "accepted") toast.success("App installed"); }
    else if (isIOS) setHelp(true);
  };
  return { canInstall, install, help, closeHelp: () => setHelp(false) };
}

export function IosInstallHelp({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Install on iPhone / iPad" size="sm">
      <ol className="space-y-4 text-sm">
        <li className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"><Share className="size-4" aria-hidden /></span><span>Tap the <b>Share</b> button in Safari&apos;s toolbar.</span></li>
        <li className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"><PlusSquare className="size-4" aria-hidden /></span><span>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</span></li>
      </ol>
      <p className="mt-4 text-xs text-muted">It opens full-screen like a normal app. This only works in Safari.</p>
      <div className="mt-5 flex justify-end"><Button onClick={onClose}>Got it</Button></div>
    </Modal>
  );
}

/** A dismissible "install" card for phones. Hidden once installed, when unsupported, or after being dismissed. */
export function InstallBanner({ className }) {
  const { canInstall, install, help, closeHelp } = useInstall();
  const [hidden, setHidden] = useState(() => typeof window !== "undefined" && Boolean(safeStorage.get()));
  if (!canInstall || hidden) return <IosInstallHelp open={help} onClose={closeHelp} />;
  return (
    <>
      <div className={`flex items-center gap-3 rounded-2xl border border-line bg-white p-3 pl-4 shadow-sm ${className ?? ""}`}>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Download className="size-5" aria-hidden /></span>
        <div className="min-w-0 flex-1"><p className="text-sm font-medium">Install the app</p><p className="text-xs text-muted">Faster, full-screen, and works from your home screen.</p></div>
        <Button size="sm" onClick={install}>Install</Button>
        <button type="button" aria-label="Dismiss" onClick={() => { safeStorage.set(); setHidden(true); }} className="grid size-11 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 sm:size-9"><X className="size-4" aria-hidden /></button>
      </div>
      <IosInstallHelp open={help} onClose={closeHelp} />
    </>
  );
}
