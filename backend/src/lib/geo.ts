const TZ = "Asia/Kolkata";

/**
 * Server-side Haversine distance in metres (Earth radius R = 6,371,000 m).
 */
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Current date in Asia/Kolkata (IST) as YYYY-MM-DD.
 */
export function todayIST(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Minutes since midnight in Asia/Kolkata (IST).
 */
export function istMinutes(d = new Date()): number {
  const [h, m] = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .split(":")
    .map(Number);
  return (h % 24) * 60 + m;
}

export const CUTOFF_MINUTES = 9 * 60; // 9:00 AM IST

/**
 * True when the given date is today in IST and 9:00 AM has passed.
 */
export function isPastCutoff(date: string, now = new Date()): boolean {
  return date === todayIST(now) && istMinutes(now) >= CUTOFF_MINUTES;
}

/**
 * Was the task created before 9:00 AM IST on its visit date (or on an earlier day)?
 */
export function isPlannedBeforeCutoff(taskCreatedAt: Date, visitDate: string): boolean {
  const cDate = todayIST(taskCreatedAt);
  return cDate < visitDate || (cDate === visitDate && istMinutes(taskCreatedAt) < CUTOFF_MINUTES);
}

/**
 * Construct task datetime in IST as a Date.
 */
export function taskDateTimeIST(date: string, hhmm: string): Date {
  return new Date(`${date}T${hhmm}:00+05:30`);
}
