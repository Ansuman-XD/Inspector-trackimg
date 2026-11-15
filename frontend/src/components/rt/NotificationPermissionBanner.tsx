import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { askPermission, getPermission, playBeep, type PermState } from "@/lib/notify";

export function NotificationPermissionBanner() {
  const [perm, setPerm] = useState<PermState>("granted");
  const [hidden, setHidden] = useState(false);
  useEffect(() => setPerm(getPermission()), []);

  if (hidden || perm === "granted" || perm === "unsupported") return null;

  return (
    <div className="mb-3 flex items-start gap-3 rounded-lg border bg-accent/40 p-3 text-sm">
      <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="flex-1">
        {perm === "denied" ? (
          <p>Notifications are blocked. Enable them in your browser/site settings to get alerts.</p>
        ) : (
          <>
            <p className="font-medium">Get visit alerts with sound</p>
            <p className="text-xs text-muted-foreground">Allow notifications to be alerted when a new visit is assigned.</p>
            <Button size="sm" className="mt-2" onClick={async () => { const p = await askPermission(); setPerm(p); if (p === "granted") playBeep(); }}>
              Allow notifications
            </Button>
          </>
        )}
      </div>
      <button onClick={() => setHidden(true)} aria-label="Dismiss"><X className="h-4 w-4 text-muted-foreground" /></button>
    </div>
  );
}