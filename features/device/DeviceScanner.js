"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CameraOff, CheckCircle2, Clock, Loader2, LogIn, LogOut, RefreshCw, UserX, WifiOff } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { attendanceService } from "@/services";
import { Button, ErrorState, LoadingState } from "@/components/ui";
import { analyzeFrame, extractEmbedding, FRAME_HINTS, loadFaceEngine } from "@/features/face/faceEngine";
import { useCamera } from "@/features/face/useCamera";
import { cameraMessage } from "@/features/face/cameraMessages";
import { useNow } from "@/hooks/useNow";
import { useOnline } from "@/hooks/useOnline";
import { useAuthStore } from "@/stores/authStore";
import { CompanyLogo } from "@/components/brand/CompanyLogo";
import { getErrorMessage } from "@/lib/errors";
import { cn, formatDuration, formatMinutes, formatTime } from "@/lib/utils";
import { getPosition } from "./geo";

const FRAME_INTERVAL_MS = 350;
const STABLE_FRAMES = 3; // ~1s of a well-framed face before we scan
const CLEAR_FRAMES = 4; // ~1.4s with nobody in view before the next person can scan
const RESULT_MS = 3500;
const RING = { ok: "stroke-emerald-400", none: "stroke-white/60", default: "stroke-amber-300" };

function resultView(r) {
  if (r.kind === "error") return { tone: "bg-red-700", icon: UserX, title: "Not recorded", sub: r.message };
  const d = r.data;
  const name = d.employee.firstName;
  const at = formatTime(d.timestamp, r.timezone);
  if (d.outcome === "CHECK_IN") return { tone: "bg-emerald-700", icon: LogIn, title: `Welcome, ${name}`, sub: `Checked in at ${at}`, note: d.isLate ? `Late by ${formatDuration(d.lateMinutes)}` : null };
  if (d.outcome === "CHECK_OUT") return { tone: "bg-sky-700", icon: LogOut, title: `Goodbye, ${name}`, sub: `Checked out at ${at} · worked ${formatMinutes(d.workedMinutes)}` };
  return { tone: "bg-slate-600", icon: Clock, title: `${name}, you're already recorded`, sub: `${d.previous === "CHECK_IN" ? "Check-in" : "Check-out"} at ${at}` };
}

function Scanner({ config }) {
  const { videoRef, state: cam, reason, start, stop } = useCamera();
  const isCompany = useAuthStore((s) => s.user?.role === "COMPANY");
  const company = useAuthStore((s) => s.user?.company);
  const online = useOnline();
  const now = useNow(1000);
  const [phase, setPhase] = useState("scanning"); // scanning | processing | result | waiting (only meaningful once ready)
  const [engine, setEngine] = useState("loading"); // loading | ready | failed
  const [attempt, setAttempt] = useState(0); // bump to retry startup
  const [frame, setFrame] = useState("none");
  const [result, setResult] = useState(null);
  const stable = useRef(0);
  const clear = useRef(0);
  const busy = useRef(false);
  const tz = config.timezone;
  const failed = engine === "failed" || cam === "denied" || cam === "unavailable";
  const ready = engine === "ready" && cam === "ready";

  const scan = useMutation({ mutationFn: ({ embedding, location }) => attendanceService.scan(embedding, location) });

  useEffect(() => {
    let cancelled = false;
    loadFaceEngine().then(() => !cancelled && setEngine("ready")).catch(() => !cancelled && setEngine("failed"));
    return () => { cancelled = true; };
  }, [attempt]);
  useEffect(() => {
    if (engine !== "ready") return;
    start();
    return stop;
  }, [engine, attempt, start, stop]);
  const retry = () => { setEngine("loading"); setAttempt((n) => n + 1); };

  // keep the screen awake while the device is in use
  useEffect(() => {
    let lock;
    const acquire = async () => { try { lock = await navigator.wakeLock?.request("screen"); } catch { /* unsupported or denied */ } };
    acquire();
    const onVis = () => document.visibilityState === "visible" && acquire();
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); lock?.release?.().catch(() => {}); };
  }, []);

  const handleCapture = useCallback(async () => {
    setPhase("processing");
    try {
      const embedding = await extractEmbedding(videoRef.current);
      if (!embedding) { stable.current = 0; return setPhase("scanning"); }
      const location = config.geofenceEnabled ? await getPosition() : undefined;
      const res = await scan.mutateAsync({ embedding, location });
      setResult({ kind: "ok", data: res.data, timezone: tz });
    } catch (err) {
      setResult({ kind: "error", message: getErrorMessage(err) });
    }
    clear.current = 0;
    setPhase("result");
    setTimeout(() => setPhase("waiting"), RESULT_MS);
  }, [videoRef, scan, config.geofenceEnabled, tz]);

  useEffect(() => {
    if (!ready || (phase !== "scanning" && phase !== "waiting")) return;
    const timer = setInterval(async () => {
      const video = videoRef.current;
      if (busy.current || !video || video.readyState < 2 || !navigator.onLine) return;
      busy.current = true;
      try {
        const { state } = await analyzeFrame(video);
        setFrame(state);
        if (phase === "waiting") {
          clear.current = state === "none" ? clear.current + 1 : 0;
          if (clear.current >= CLEAR_FRAMES) { stable.current = 0; setPhase("scanning"); }
        } else {
          stable.current = state === "ok" ? stable.current + 1 : 0;
          if (stable.current >= STABLE_FRAMES) { clearInterval(timer); await handleCapture(); }
        }
      } catch {
        setEngine("failed");
      } finally { busy.current = false; }
    }, FRAME_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [phase, ready, videoRef, handleCapture]);

  // camera/engine failure is derived, not stored: nothing to keep in sync
  const shown = failed ? "fatal" : !ready ? "loading" : phase;
  const view = result && phase === "result" ? resultView(result) : null;
  const ring = RING[frame] ?? RING.default;
  // Guidance only makes sense while the camera is actually running.
  const hint = !online ? "Offline — attendance needs a connection" : !ready ? "" : phase === "waiting" ? "Step away to let the next person scan" : FRAME_HINTS[frame];
  const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }).format(now);
  const date = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(now);

  return (
    <main id="main" className="safe-top safe-x flex min-h-dvh flex-col bg-slate-950 pb-[env(safe-area-inset-bottom)] text-white">
      <header className="flex items-center justify-between gap-3 px-4 pt-3 sm:px-5 sm:pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <CompanyLogo company={company} size="size-11" />
          <div>
            <p className="text-sm font-medium">{config.companyName}</p>
            <p className="truncate text-xs text-slate-400">{config.deviceName}{isCompany && <> · <Link href="/company" className="inline-flex min-h-8 items-center underline underline-offset-2 hover:text-white">Back to dashboard</Link></>}</p>
          </div>
        </div>
        <div className="shrink-0 text-right"><p className="text-2xl font-semibold tabular-nums sm:text-3xl">{time}</p><p className="text-xs text-slate-400">{date}</p></div>
      </header>

      {!online && <div role="alert" className="mx-5 mt-3 flex items-center gap-2 rounded-lg bg-amber-500/20 px-3 py-2 text-sm text-amber-200"><WifiOff className="size-4" aria-hidden />You&apos;re offline. Scans can&apos;t be recorded until the connection returns.</div>}

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-3 sm:px-5 sm:py-4">
        {/* Height-driven: the camera never pushes the hint text off-screen on short or landscape screens */}
        <div className="relative mx-auto aspect-[3/4] w-full max-w-[min(100%,calc(58dvh*0.75))] overflow-hidden rounded-3xl bg-slate-900">
          <video ref={videoRef} playsInline muted aria-label="Camera preview" className={cn("size-full -scale-x-100 object-cover", (shown === "loading" || shown === "fatal") && "invisible")} />
          {(shown === "scanning" || shown === "processing" || shown === "waiting") && (
            <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
              <defs><mask id="dmask"><rect width="300" height="400" fill="white" /><ellipse cx="150" cy="190" rx="98" ry="128" fill="black" /></mask></defs>
              <rect width="300" height="400" fill="rgb(2 6 23 / 0.6)" mask="url(#dmask)" />
              <ellipse cx="150" cy="190" rx="98" ry="128" fill="none" strokeWidth="4" strokeDasharray={shown === "scanning" ? "10 8" : "0"} className={shown === "waiting" ? "stroke-white/30" : ring} />
            </svg>
          )}
          {shown === "loading" && <div className="absolute inset-0 grid place-items-center"><div className="flex flex-col items-center gap-3"><Loader2 className="size-8 animate-spin" aria-hidden /><span className="text-sm">Starting camera…</span></div></div>}
          {shown === "processing" && <div className="absolute inset-x-0 bottom-4 flex justify-center"><span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-sm"><Loader2 className="size-4 animate-spin" aria-hidden />Checking…</span></div>}
          {shown === "fatal" && (
            <div className="absolute inset-0 grid place-items-center bg-slate-900 p-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <CameraOff className="size-10" aria-hidden />
                {cam === "denied" || cam === "unavailable" ? (
                  <><p className="font-medium">{cameraMessage(reason).title}</p><p className="text-sm text-slate-300">{cameraMessage(reason).detail}</p></>
                ) : <p className="text-sm">Face scanning couldn&apos;t start on this device.</p>}
                {reason !== "insecure" && reason !== "unsupported" && <Button variant="secondary" icon={RefreshCw} onClick={retry}>Try again</Button>}
              </div>
            </div>
          )}
          {view && (
            <div role="status" aria-live="assertive" className={cn("animate-pop absolute inset-0 grid place-items-center p-6 text-center", view.tone)}>
              <div className="flex flex-col items-center gap-3">
                <view.icon className="size-16" aria-hidden />
                <p className="text-2xl font-semibold">{view.title}</p>
                <p className="text-base text-white/90">{view.sub}</p>
                {view.note && <p className="rounded-full bg-black/25 px-3 py-1 text-sm">{view.note}</p>}
              </div>
            </div>
          )}
        </div>
        <p role="status" aria-live="polite" className="mt-5 flex items-center justify-center gap-2 text-center text-lg font-medium">
          {phase === "result" || phase === "processing" ? " " : hint}
          {ready && phase === "scanning" && frame === "ok" && <CheckCircle2 className="size-5 text-emerald-400" aria-hidden />}
        </p>
        <p className="mt-1 text-center text-xs text-slate-500">Photos are never stored — only an encrypted numeric template.</p>
      </div>
    </main>
  );
}

export function DeviceScanner() {
  const q = useQuery({ queryKey: ["scan-config"], queryFn: attendanceService.scanConfig });
  if (q.isLoading) return <LoadingState label="Starting…" className="min-h-dvh" />;
  if (q.isError) return <main className="grid min-h-dvh place-items-center"><ErrorState message={getErrorMessage(q.error)} onRetry={() => q.refetch()} /></main>;
  return <Scanner config={q.data.data} />;
}
