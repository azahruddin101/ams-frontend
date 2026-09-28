"use client";
import { useEffect } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui";

/** Shown by the service worker when a page can't be loaded. Attendance is verified on the server, so it needs a connection. */
export default function OfflinePage() {
  useEffect(() => {
    const back = () => window.location.replace("/");
    window.addEventListener("online", back); // recover on its own the moment the connection returns
    return () => window.removeEventListener("online", back);
  }, []);
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-center">
      <div className="max-w-sm space-y-4">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-slate-100 text-slate-600"><WifiOff className="size-8" aria-hidden /></div>
        <h1 className="text-xl font-semibold">You&apos;re offline</h1>
        <p className="text-sm text-muted">Attendance is verified on our servers, so scanning and saving need an internet connection. We&apos;ll reconnect automatically.</p>
        <Button size="lg" icon={RefreshCw} onClick={() => window.location.reload()} className="w-full">Try again</Button>
      </div>
    </main>
  );
}
