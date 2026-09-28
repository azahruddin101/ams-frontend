/**
 * Company theming. A single brand colour is expanded into the palette the UI uses (`--color-brand-50…900`).
 * Tailwind utilities (`bg-brand-600`, `text-brand-700`, `fill-brand-500`…) read those CSS variables, so setting them on
 * <html> re-colours the whole interface instantly with no rebuild.
 */
export const DEFAULT_BRAND = "#4f46e5";
const SHADES = [50, 100, 200, 500, 600, 700, 800, 900];

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const isHex = (v) => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);

function hexToHsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}

function hslToHex({ h, s, l }) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * clamp(c, 0, 1)).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const channel = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
/** WCAG contrast ratio of white text on `hex`. */
export const contrastWithWhite = (hex) => 1.05 / (luminance(hex) + 0.05);

/** → { 50: "#…", …, 900: "#…" }. The 600 shade (buttons, active nav) is darkened until white text on it is readable (≥ 4.5:1). */
export function buildBrandPalette(input) {
  const base = hexToHsl(isHex(input) ? input : DEFAULT_BRAND);
  let l600 = base.l;
  while (contrastWithWhite(hslToHex({ ...base, l: l600 })) < 4.5 && l600 > 0.1) l600 -= 0.01;
  const s = clamp(base.s, 0.05, 0.9);
  const at = (l) => hslToHex({ h: base.h, s, l: clamp(l, 0.06, 0.97) });
  return {
    50: at(0.96), 100: at(0.92), 200: at(0.84),
    500: at(Math.min(l600 + 0.08, 0.7)), 600: at(l600),
    700: at(l600 - 0.07), 800: at(l600 - 0.14), 900: at(l600 - 0.2),
  };
}

/** Applies (or, with no colour, resets) the palette on <html>, and tints the browser/PWA chrome. */
export function applyBrand(color) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!isHex(color) || color.toLowerCase() === DEFAULT_BRAND) {
    SHADES.forEach((n) => root.style.removeProperty(`--color-brand-${n}`));
  } else {
    const palette = buildBrandPalette(color);
    SHADES.forEach((n) => root.style.setProperty(`--color-brand-${n}`, palette[n]));
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", buildBrandPalette(color)[600]);
}
