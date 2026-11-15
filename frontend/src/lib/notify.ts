let ctx: AudioContext | null = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

/** Browsers block sound until the user taps once. Call this on first tap. */
export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

/** Two-tone "bip-bip" plus vibration on phones. */
export function playBeep() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const now = c.currentTime;
  [0, 0.22].forEach((offset, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = i === 0 ? 880 : 1175;
    g.gain.setValueAtTime(0.0001, now + offset);
    g.gain.exponentialRampToValueAtTime(0.4, now + offset + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
    o.connect(g);
    g.connect(c.destination);
    o.start(now + offset);
    o.stop(now + offset + 0.2);
  });
  try { navigator.vibrate?.([120, 60, 120]); } catch {}
}

export type PermState = NotificationPermission | "unsupported";

export function getPermission(): PermState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function askPermission(): Promise<PermState> {
  if (getPermission() === "unsupported") return "unsupported";
  unlockAudio();
  return Notification.requestPermission();
}

export async function showSystemNotification(title: string, body: string, tag?: string) {
  if (getPermission() !== "granted") return;
  const opts: NotificationOptions = { body, tag, icon: "/icon-192.png", badge: "/icon-192.png" };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) { await reg.showNotification(title, opts); return; } // works in installed PWA / Android
  } catch {}
  try { new Notification(title, opts); } catch {}
}