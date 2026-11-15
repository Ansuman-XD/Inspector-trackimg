import { Bell, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDB } from "@/hooks/useDB";
import { notificationService, pruneNotifications } from "@/services/notificationService";
import { relTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@/types";

const dot: Record<NotificationType, string> = {
  task_assigned: "bg-info", visit_started: "bg-info", location_verified: "bg-success",
  visit_completed: "bg-success", verification_failed: "bg-danger", deadline_passed: "bg-warning",
};

export function NotificationBell({ audience, onOpenTask }: { audience: string; onOpenTask?: (id: string) => void }) {
  const db = useDB();
const list = pruneNotifications(notificationService.forAudience(db, audience));
  const unread = list.filter((n) => !n.read).length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button aria-label={`Notifications, ${unread} unread`} className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border bg-card text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
          {unread > 0 && <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-[18px] text-primary-foreground tabular">{unread > 99 ? "99+" : unread}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          <button disabled={!unread} onClick={() => notificationService.markAllRead(audience)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"><CheckCheck className="h-3.5 w-3.5" />Mark all read</button>
        </div>
        <div className="max-h-[380px] overflow-y-auto">
          {list.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up.</p>}
          {list.slice(0, 40).map((n) => (
            <button key={n.id} onClick={() => { notificationService.markRead(n.id); if (n.taskId) onOpenTask?.(n.taskId); }} className={cn("flex w-full gap-3 border-b px-4 py-3 text-left last:border-0 hover:bg-muted/60", !n.read && "bg-accent/40")}>
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dot[n.type], n.read && "opacity-30")} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{n.title}</span>
                <span className="block text-xs text-muted-foreground">{n.message}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground/80">{relTime(n.createdAt)}</span>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
