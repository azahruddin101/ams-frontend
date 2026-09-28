/**
 * Client-side face pipeline (provider: @vladmandic/face-api, 128-d descriptors).
 * Chosen because inference runs in the browser: raw images never leave the device, only a 128-float
 * embedding is sent. Cost: ~6.7 MB of models (fetched once, then cached by the service worker) and a lazy-loaded
 * TF.js bundle. It has NO liveness/anti-spoofing: a photo of the employee can match. See SECURITY.md.
 * Everything is behind this module so the model can be swapped without touching the UI.
 */
const MODEL_URL = "/models";
const DETECTOR = { inputSize: 224, scoreThreshold: 0.5 };
const LIMITS = { tooFar: 0.22, tooClose: 0.62, maxOffCenter: 0.16 };

let enginePromise = null;

export function loadFaceEngine() {
  enginePromise ??= (async () => {
    const faceapi = await import("@vladmandic/face-api");
    try { await faceapi.tf.setBackend("webgl"); } catch { await faceapi.tf.setBackend("cpu"); }
    await faceapi.tf.ready();
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    return faceapi;
  })().catch((err) => { enginePromise = null; throw err; });
  return enginePromise;
}

/** → { state: "none"|"multiple"|"too-far"|"too-close"|"off-center"|"ok", box? } */
export async function analyzeFrame(video) {
  const faceapi = await loadFaceEngine();
  const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions(DETECTOR));
  if (detections.length === 0) return { state: "none" };
  if (detections.length > 1) return { state: "multiple" };
  const { box } = detections[0];
  const ratio = box.width / video.videoWidth;
  if (ratio < LIMITS.tooFar) return { state: "too-far", box };
  if (ratio > LIMITS.tooClose) return { state: "too-close", box };
  const offX = Math.abs(box.x + box.width / 2 - video.videoWidth / 2) / video.videoWidth;
  const offY = Math.abs(box.y + box.height / 2 - video.videoHeight / 2) / video.videoHeight;
  if (offX > LIMITS.maxOffCenter || offY > LIMITS.maxOffCenter) return { state: "off-center", box };
  return { state: "ok", box };
}

/** Computes the 128-d embedding for the single face in view. Returns null when no usable face. */
export async function extractEmbedding(video) {
  const faceapi = await loadFaceEngine();
  const result = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions(DETECTOR)).withFaceLandmarks(true).withFaceDescriptor();
  return result ? Array.from(result.descriptor) : null;
}

export const FRAME_HINTS = {
  none: "No face detected",
  multiple: "Only one person, please",
  "too-far": "Move closer",
  "too-close": "Move back a little",
  "off-center": "Center your face",
  ok: "Face detected — hold still",
};
