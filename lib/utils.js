export const cn = (...parts) => parts.flat().filter(Boolean).join(" ");

export function formatMinutes(total) {
  const m = Math.max(0, Math.round(total ?? 0));
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

/** Compact duration for labels: 10 → "10m", 480 → "8h", 95 → "1h 35m". */
export function formatDuration(total) {
  const m = Math.max(0, Math.round(total ?? 0));
  if (m < 60) return `${m}m`;
  return m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m / 60}h`;
}

export function formatTime(value, timeZone) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false, ...(timeZone && { timeZone }) }).format(new Date(value));
}

export function formatDate(value, opts = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!value) return "—";
  // date keys (YYYY-MM-DD) must not shift with the viewer's timezone
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(value);
  return new Intl.DateTimeFormat(undefined, { ...opts, ...(/^\d{4}-\d{2}-\d{2}$/.test(value) && { timeZone: "UTC" }) }).format(d);
}

export function formatMoney(amount, currency = "INR") {
  if (amount === null || amount === undefined) return "—";
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(amount); }
  catch { return `${currency} ${amount}`; } // a currency code Intl does not know
}

/** The days of a leave request: separate picked days ("28 May, 29 May, 3 Jun") or a range ("1 Jun → 5 Jun"). */
export function formatLeaveDates(leave) {
  if (!leave) return "—";
  const short = { day: "numeric", month: "short" };
  if (leave.dates?.length) {
    const years = new Set(leave.dates.map((d) => d.slice(0, 4)));
    return `${leave.dates.map((d) => formatDate(d, years.size > 1 ? { ...short, year: "numeric" } : short)).join(", ")}${years.size > 1 ? "" : ` ${leave.dates[0].slice(0, 4)}`}`;
  }
  return leave.fromDate === leave.toDate ? formatDate(leave.fromDate) : `${formatDate(leave.fromDate)} → ${formatDate(leave.toDate)}`;
}

export const fullName = (e) => (e ? `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() : "—");

export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const newIdempotencyKey = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
