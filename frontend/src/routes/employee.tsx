import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, ClipboardList, History, UserCircle } from "lucide-react";
import { ConnectionStatus, Logo, ThemeToggle } from "@/components/rt/common";
import { NotificationBell } from "@/components/rt/NotificationBell";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useRoleGuard } from "@/hooks/useSession";
import { useNavigate } from "@tanstack/react-router";
import { EmployeeSessionContext } from "@/components/rt/employeeContext";
import { syncService } from "@/services/syncService";
import { useNotificationAlerts } from "@/hooks/useNotificationAlerts";
import { NotificationPermissionBanner } from "@/components/rt/NotificationPermissionBanner";
import { OrgStrip } from "@/components/rt/OrgLogos";

export const Route = createFileRoute("/employee")({
  ssr: false,
  component: EmployeeLayout,
});

const NAV = [
  { to: "/employee/dashboard", label: "Home", icon: Home },
  { to: "/employee/tasks", label: "Tasks", icon: ClipboardList },
  { to: "/employee/visits", label: "My Visits", icon: History },
  { to: "/employee/profile", label: "Profile", icon: UserCircle },
] as const;

function EmployeeLayout() {
  const { session, logout, warn, stay } = useRoleGuard("employee");
  const navigate = useNavigate();
  const [, force] = useState(0);
useNotificationAlerts(session?.userId ?? "");

  useEffect(() => {
    if (session) {
      syncService.startAutoSync(6000);
      return () => syncService.stopAutoSync();
    }
  }, [session]);

  if (!session) return <div className="min-h-screen bg-background" />;

  return (
    <EmployeeSessionContext.Provider value={{ session, logout }}>
      <div className="mx-auto min-h-screen max-w-md bg-background pb-20">
        <div className="sticky top-0 z-20">
        <OrgStrip />
        <header className="flex h-14 items-center gap-2 border-b bg-card/95 px-4 backdrop-blur">
          <Logo className="scale-90 origin-left" />
          <div className="ml-auto flex items-center gap-1">
            <ConnectionStatus compact />
            <NotificationBell audience={session.userId} onOpenTask={(id) => { navigate({ to: "/employee/tasks/$id", params: { id } }); force((n) => n + 1); }} />
            <ThemeToggle />
          </div>
        </header>
      </div>
        <main className="p-4"><NotificationPermissionBanner /><Outlet /></main>
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto grid max-w-md grid-cols-4">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground" activeProps={{ className: "!text-primary font-semibold" }}>
                <n.icon className="h-5 w-5" />{n.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
      <AlertDialog open={warn}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Session about to expire</AlertDialogTitle><AlertDialogDescription>You'll be signed out in under 2 minutes due to inactivity.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={logout}>Sign out</AlertDialogCancel><AlertDialogAction onClick={stay}>Stay signed in</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </EmployeeSessionContext.Provider>
  );
}
