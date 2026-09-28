"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CameraOff, CheckCircle2, Loader2, RefreshCw, ScanFace, WifiOff } from "lucide-react";
import { Button } from "@/components/ui";
import { useAttendanceStore } from "@/stores/attendanceStore";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { analyzeFrame, extractEmbedding, FRAME_HINTS, loadFaceEngine } from "./faceEngine";
import { useCamera } from "./useCamera";
import { cameraMessage } from "./cameraMessages";

const FRAME_INTERVAL_MS = 350;
const STABLE_FRAMES = 3;

const RING = { ok: "stroke-emerald-400", none: "stroke-white/70", default: "stroke-amber-300" };

/**
 * Camera + guide + verification loop.
 * `onCapture(embedding)` performs the server call (register/verify) and resolves on success, throws on failure.
 * `successLabel` is shown when it resolves, e.g. "Attendance marked".
 */
export function FaceCapture({ onCapture, onDone, successLabel = "Done", verifyingLabel = "Verifying…" }) {
  const { phase, hint, errorCode, setPhase, setHint, fail } = useAttendanceStore();
  const { videoRef, state: cam, reason, start, stop } = useCamera();
  const stable = useRef(0);
  const busy = useRef(false);
  const [frame, setFrame] = useState("none");

  const run = useCallback(async () => {
    stable.current = 0;
    busy.current = false;
    if (!navigator.onLine) return fail("network", "You are offline. Attendance needs an internet connection.");
    setPhase("loading-models", "Preparing face verification…");
    try { await loadFaceEngine(); } catch { return fail("engine", "Face verification couldn't start on this device."); }
    setPhase("starting-camera", "Starting camera…");
    if (!(await start())) return; // camera state effect below reports the reason
    setPhase("positioning", FRAME_HINTS.none);
  }, [fail, setPhase, start]);

  useEffect(() => { run(); return stop; }, [run, stop]);

  useEffect(() => {
    if (cam === "denied") fail("camera-denied", cameraMessage("denied").title);
    if (cam === "unavailable") fail("camera-unavailable", cameraMessage(reason).title);
  }, [cam, reason, fail]);

  useEffect(() => {
    if (phase !== "positioning") return;
    const timer = setInterval(async () => {
      if (busy.current || !videoRef.current || videoRef.current.readyState < 2) return;
      busy.current = true;
      try {
        const { state } = await analyzeFrame(videoRef.current);
        setFrame(state);
        setHint(FRAME_HINTS[state]);
        stable.current = state === "ok" ? stable.current + 1 : 0;
        if (stable.current >= STABLE_FRAMES) {
          clearInterval(timer);
          setPhase("verifying", verifyingLabel);
          const embedding = await extractEmbedding(videoRef.current);
          if (!embedding) { fail("no-face", "We couldn't read your face. Try again."); return; }
          try {
            await onCapture(embedding);
            stop();
            setPhase("success", successLabel);
            setTimeout(() => onDone?.(true), 900);
          } catch (err) {
            fail(err?.response?.data?.code ?? (err?.response ? "rejected" : "network"), getErrorMessage(err));
          }
        }
      } catch {
        fail("engine", "Face verification hit a problem. Please retry.");
      } finally {
        busy.current = false;
      }
    }, FRAME_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [phase, videoRef, setHint, setPhase, fail, onCapture, onDone, stop, successLabel, verifyingLabel]);

  const showVideo = ["positioning", "verifying", "success"].includes(phase) || cam === "ready";
  const ring = phase === "success" ? RING.ok : RING[frame] ?? RING.default;

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-slate-900">
        <video ref={videoRef} playsInline muted aria-label="Camera preview" className={cn("size-full -scale-x-100 object-cover", !showVideo && "invisible")} />
        {phase === "positioning" || phase === "verifying" || phase === "success" ? (
          <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
            <defs><mask id="hole"><rect width="300" height="400" fill="white" /><ellipse cx="150" cy="190" rx="98" ry="128" fill="black" /></mask></defs>
            <rect width="300" height="400" fill="rgb(15 23 42 / 0.55)" mask="url(#hole)" />
            <ellipse cx="150" cy="190" rx="98" ry="128" fill="none" strokeWidth="4" strokeDasharray={phase === "positioning" ? "10 8" : "0"} className={ring} />
          </svg>
        ) : null}

        {(phase === "loading-models" || phase === "starting-camera") && (
          <div className="absolute inset-0 grid place-items-center text-white"><div className="flex flex-col items-center gap-3"><Loader2 className="size-8 animate-spin" aria-hidden /><span className="text-sm">{hint}</span></div></div>
        )}
        {phase === "verifying" && <div className="absolute inset-x-0 bottom-4 flex justify-center"><span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-sm text-white"><Loader2 className="size-4 animate-spin" aria-hidden />{hint}</span></div>}
        {phase === "success" && <div className="absolute inset-0 grid place-items-center bg-emerald-600/80 text-white"><div className="flex flex-col items-center gap-2"><CheckCircle2 className="size-14" aria-hidden /><span className="text-lg font-semibold">{successLabel}</span></div></div>}
        {phase === "error" && (
          <div className="absolute inset-0 grid place-items-center bg-slate-900/90 p-6 text-center text-white">
            <div className="flex flex-col items-center gap-3">
              {errorCode === "camera-denied" || errorCode === "camera-unavailable" ? <CameraOff className="size-10" aria-hidden /> : errorCode === "network" ? <WifiOff className="size-10" aria-hidden /> : <ScanFace className="size-10" aria-hidden />}
              <p className="text-sm">{hint}</p>
              {(errorCode === "camera-denied" || errorCode === "camera-unavailable") && <p className="text-xs text-slate-300">{cameraMessage(reason).detail}</p>}
              {reason !== "insecure" && reason !== "unsupported" && errorCode !== "engine" ? <Button variant="secondary" icon={RefreshCw} onClick={run}>Try again</Button> : null}
            </div>
          </div>
        )}
      </div>
      <p role="status" aria-live="polite" className="mt-4 text-center text-base font-medium">{phase === "positioning" ? hint : phase === "verifying" ? verifyingLabel : phase === "success" ? successLabel : " "}</p>
      <p className="mt-1 text-center text-xs text-muted">Your image never leaves this device — only a numeric face template is sent.</p>
    </div>
  );
}
