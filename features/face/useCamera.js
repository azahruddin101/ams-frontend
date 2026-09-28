"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Maps a getUserMedia failure (or a missing API) to a reason we can explain to the user. */
function classify(err) {
  switch (err?.name) {
    case "NotAllowedError": case "SecurityError": case "PermissionDeniedError": return "denied";
    case "NotFoundError": case "DevicesNotFoundError": return "not-found";
    case "NotReadableError": case "TrackStartError": case "AbortError": return "in-use";
    default: return "unknown";
  }
}

/** getUserMedia lifecycle. Always stops tracks on unmount so the camera light turns off. */
export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [state, setState] = useState("idle"); // idle | starting | ready | denied | unavailable
  const [reason, setReason] = useState(null); // insecure | unsupported | not-found | in-use | unknown | denied

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(async () => {
    // Browsers expose no camera at all on insecure origins (plain http on anything except localhost).
    if (!window.isSecureContext) { setReason("insecure"); setState("unavailable"); return false; }
    if (!navigator.mediaDevices?.getUserMedia) { setReason("unsupported"); setState("unavailable"); return false; }
    setState("starting");
    setReason(null);
    const open = async (video) => navigator.mediaDevices.getUserMedia({ video, audio: false });
    try {
      let stream;
      try {
        stream = await open({ facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } });
      } catch (err) {
        if (err?.name !== "OverconstrainedError") throw err;
        stream = await open(true); // device can't satisfy our preferences: take whatever camera it has
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) { stop(); return false; }
      video.srcObject = stream;
      await video.play();
      setState("ready");
      return true;
    } catch (err) {
      stop();
      const r = classify(err);
      setReason(r);
      setState(r === "denied" ? "denied" : "unavailable");
      return false;
    }
  }, [stop]);

  useEffect(() => stop, [stop]);
  return { videoRef, state, reason, start, stop };
}
