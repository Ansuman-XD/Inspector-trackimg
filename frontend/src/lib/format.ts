const TZ = "Asia/Kolkata";

export function todayISO(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return parts; // yyyy-mm-dd
}

export function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = iso.length === 10 ? new Date(iso + "T00:00:00+05:30") : new Date(iso);
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function fmtLongDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
}

export function fmtTime(isoOrHHmm?: string) {
  if (!isoOrHHmm) return "—";
  if (/^\d{2}:\d{2}$/.test(isoOrHHmm)) {
    const [h, m] = isoOrHHmm.split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM";
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ap}`;
  }
  return new Intl.DateTimeFormat("en-IN", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(isoOrHHmm)).toUpperCase();
}

export function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  return `${fmtDate(iso)}, ${fmtTime(iso)}`;
}

export function relTime(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return fmtDate(iso);
}

export function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", hour12: false }).format(new Date()));
  return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
}

/** Task datetime in IST as a Date */
export function taskDateTime(date: string, hhmm: string) {
  return new Date(`${date}T${hhmm}:00+05:30`);
}

export function fmtDistance(m?: number) {
  if (m == null) return "—";
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

export function fmtCoord(n?: number) {
  return n == null ? "—" : n.toFixed(6);
}

export function fmtPhone(p: string) {
  const d = p.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : p;
}

export function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

/** Visit time window; empty times mean "any time that day". */
export function fmtWindow(t?: { startTime?: string; endTime?: string } | null) {
  if (!t) return "Any time";
  const start = t.startTime || "";
  const end = t.endTime || "";
  if (!start && !end) return "Any time";
  if (!end) return `From ${fmtTime(start)}`;
  if (!start) return `By ${fmtTime(end)}`;
  return `${fmtTime(start)} – ${fmtTime(end)}`;
}


/** Minutes since midnight in IST. */
export function istMinutes(d = new Date()) {
  const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d).split(":").map(Number);
  return (h % 24) * 60 + m;
}
