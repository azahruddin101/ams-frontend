// Copies only the face-api models we use into /public/models (served same-origin, cached by the service worker).
import { cpSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const src = path.resolve("node_modules/@vladmandic/face-api/model");
const dest = path.resolve("public/models");
const needed = ["tiny_face_detector_model", "face_landmark_68_tiny_model", "face_recognition_model"];
if (!existsSync(src)) process.exit(0);
mkdirSync(dest, { recursive: true });
for (const name of needed) {
  for (const ext of ["-weights_manifest.json", ".bin"]) {
    const file = name + ext;
    cpSync(path.join(src, file), path.join(dest, file));
  }
}
console.log("face models copied to public/models");
