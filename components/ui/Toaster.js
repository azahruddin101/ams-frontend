"use client";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { useToastStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:items-end lg:pb-4">
      {toasts.map((t) => (
        <div key={t.id} role={t.tone === "error" ? "alert" : "status"}
          className={cn("animate-pop pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white p-3 shadow-lg", t.tone === "error" ? "border-red-200" : "border-emerald-200")}>
          {t.tone === "error" ? <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />}
          <p className="flex-1 text-sm">{t.message}</p>
          <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-700"><X className="size-4" aria-hidden /></button>
        </div>
      ))}
    </div>
  );
}
