import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useDB } from "@/hooks/useDB";
import { playBeep, showSystemNotification, unlockAudio } from "@/lib/notify";

/** Beeps, toasts and shows a system notification whenever a new notification arrives. */
export function useNotificationAlerts(audience: string) {
  const db = useDB();
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (!audience) return;
    const mine = db.notifications.filter((n) => n.audience === audience);
    if (seen.current === null) {
      seen.current = new Set(mine.map((n) => n.id)); // don't alert for old ones
      return;
    }
    const fresh = mine.filter(
  (n) =>
    !seen.current!.has(n.id) &&
    !n.read &&
    Date.now() - new Date(n.createdAt).getTime() < 2 * 60 * 1000, // only truly new ones
);
    mine.forEach((n) => seen.current!.add(n.id));
    if (!fresh.length) return;

    playBeep();
    fresh.slice(0, 3).forEach((n) => {
      toast.info(n.title, { description: n.message });
      showSystemNotification(n.title, n.message, n.id);
    });
  }, [db.notifications, audience]);
}