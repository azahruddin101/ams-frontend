import { readFileSync } from "node:fs";
import path from "node:path";

// Rendered ONCE, at build time: the worker is stamped with that build, so each release ships a different /sw.js.
// (Cache headers for /sw.js are set in next.config.mjs.)
export const dynamic = "force-static";

const BUILD_ID = Date.now().toString(36);
const source = readFileSync(path.join(process.cwd(), "pwa/sw.js"), "utf8").replaceAll("__BUILD_ID__", BUILD_ID);

export function GET() {
  return new Response(source, { headers: { "Content-Type": "application/javascript; charset=utf-8" } });
}
