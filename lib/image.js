const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_EDGE = 160;
const MAX_CHARS = 55_000; // server limit is 60k; leave headroom

/**
 * Turns an uploaded image into a small square-bounded data URI, entirely in the browser.
 * SVG is refused on purpose (it can carry scripts). Output is WebP/PNG, shrunk until it fits the server limit.
 */
export async function fileToLogoDataUri(file) {
  if (!ACCEPTED.includes(file.type)) throw Object.assign(new Error("Use a PNG, JPEG or WebP image."), { userMessage: "Use a PNG, JPEG or WebP image." });
  if (file.size > MAX_INPUT_BYTES) throw Object.assign(new Error("Image is too large"), { userMessage: "Choose an image under 5 MB." });

  const bitmap = await createImageBitmap(file).catch(() => { throw Object.assign(new Error("unreadable"), { userMessage: "That image couldn't be read." }); });
  try {
    for (let edge = MAX_EDGE; edge >= 48; edge = Math.round(edge * 0.75)) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      // WebP keeps transparency and is small; fall back to PNG where the browser can't encode it.
      const uri = canvas.toDataURL("image/webp", 0.85);
      const out = uri.startsWith("data:image/webp") ? uri : canvas.toDataURL("image/png");
      if (out.length <= MAX_CHARS) return out;
    }
  } finally { bitmap.close?.(); }
  throw Object.assign(new Error("Too large"), { userMessage: "That image is too detailed. Try a simpler logo." });
}
