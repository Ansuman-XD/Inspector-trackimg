import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, MapPin, ClipboardPlus, MonitorCheck, Map as MapIcon, FileBarChart, LogOut, Menu, Clock, ShieldCheck, Share2,
  Building2, Tags,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ConnectionStatus, Logo, ThemeToggle } from "@/components/rt/common";
import { TaskDrawer, PhotoLightbox } from "@/components/rt/TaskDrawer";
import { TaskDrawerContext } from "@/components/rt/drawerContext";
import { ShareAppDialog } from "@/components/rt/ShareAppDialog";
import { useRoleGuard } from "@/hooks/useSession";
import { useDB } from "@/hooks/useDB";
import { OPEN } from "@/services/taskService";
import { todayISO } from "@/lib/format";
import { RdsoLogo, IrLogo, ORG, OrgCorners } from "@/components/rt/OrgLogos";
import { syncService } from "@/services/syncService";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminLayout,
});


const NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
  { to: "/admin/employees", label: "Employees", icon: Users, section: "Master Data" },
  { to: "/admin/departments", label: "Departments", icon: Building2, section: "Master Data" },
  { to: "/admin/locations", label: "Locations", icon: MapPin, section: "Master Data" },
  { to: "/admin/location-types", label: "Location Types", icon: Tags, section: "Master Data" },
  { to: "/admin/tasks", label: "Assign Visit", icon: ClipboardPlus, section: "Operations" },
  { to: "/admin/monitoring", label: "Visit Monitoring", icon: MonitorCheck, section: "Operations" },
  { to: "/admin/map", label: "Visit Map", icon: MapIcon, section: "Operations" },
  { to: "/admin/reports", label: "Reports", icon: FileBarChart, section: "Operations" },
] as const;


function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const db = useDB();
  const openToday = db.tasks.filter((t) => t.date === todayISO() && OPEN.includes(t.status)).length;
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-5"><Logo light /></div>
      <nav className="flex-1 space-y-0.5 px-3">
        <p className="px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">Overview</p>
        {NAV.map((n, i) => {
          const prev = NAV[i - 1];
          const sectionChanged = !!prev && prev.section !== n.section;
          return (
            <div key={n.to}>
              {sectionChanged && <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">{n.section}</p>}
              <Link
                to={n.to}
                onClick={onNavigate}
                className="group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeProps={{ className: "!bg-sidebar-accent !text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--sidebar-primary)]" }}
              >
                <n.icon className="h-4 w-4" />
                <span className="flex-1">{n.label}</span>
                {n.to === "/admin/monitoring" && openToday > 0 && <span className="rounded bg-sidebar-primary/90 px-1.5 text-[11px] font-semibold text-sidebar-primary-foreground tabular">{openToday}</span>}
              </Link>
            </div>
          );
        })}
      </nav>
      <div className="m-3 rounded-md border border-sidebar-border p-3 text-xs text-sidebar-foreground/60">
        <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Asia/Kolkata (IST)</div>
        <div className="mt-1">Radius is set per location</div>
      </div>
    </div>
  );
}

function AdminLayout() {
  const { session, logout, warn, stay } = useRoleGuard("admin");
  const [mobileNav, setMobileNav] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (session) {
      syncService.startAutoSync(6000);
      return () => syncService.stopAutoSync();
    }
  }, [session]);

  if (!session) return <div className="min-h-screen bg-background" />;


  return (
    <TaskDrawerContext.Provider value={{ open: setTaskId, photo: setPhotoId }}>
      <div className="min-h-screen bg-background lg:pl-[250px]">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] lg:block no-print"><SideNav /></aside>
        <Sheet open={mobileNav} onOpenChange={setMobileNav}>
          <SheetContent side="left" className="w-[260px] border-0 p-0"><SheetTitle className="sr-only">Navigation</SheetTitle><SideNav onNavigate={() => setMobileNav(false)} /></SheetContent>
        </Sheet>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur sm:px-6 no-print">
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu className="h-4 w-4" /></button>
<div className="hidden items-center gap-3 sm:flex">
  <RdsoLogo size={34} />
  <div className="hidden leading-tight xl:block">
    <p className="text-xs font-semibold">{ORG.name}</p>
    <p className="text-[11px] text-muted-foreground">{ORG.branch} · {ORG.ministry}</p>
  </div>
</div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} title="Share the app install link"><Share2 className="mr-1.5 h-4 w-4" />Share App</Button>
            <ConnectionStatus />
            <ThemeToggle />
            <span className="hidden items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium sm:inline-flex"><ShieldCheck className="h-3.5 w-3.5 text-primary" />Admin · {session.name}</span>
            <Button variant="outline" size="sm" onClick={() => setConfirmOut(true)}><LogOut className="mr-1.5 h-4 w-4" />Logout</Button>
            <span className="mx-1 hidden h-8 w-px bg-border sm:block" aria-hidden />
<IrLogo size={34} className="hidden sm:block" />
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] p-4 sm:p-6 print-area"><Outlet /></main>
      </div>
      <TaskDrawer taskId={taskId} onClose={() => setTaskId(null)} />
      <ShareAppDialog open={shareOpen} onOpenChange={setShareOpen} />
      <PhotoLightbox taskId={photoId} onClose={() => setPhotoId(null)} />
      <AlertDialog open={confirmOut} onOpenChange={setConfirmOut}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Sign out of Inspector Tracking System?</AlertDialogTitle><AlertDialogDescription>Your session will end on this device.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={logout}>Sign out</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={warn}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Session about to expire</AlertDialogTitle><AlertDialogDescription>You've been inactive for a while. For security, you'll be signed out in under 2 minutes.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={logout}>Sign out</AlertDialogCancel><AlertDialogAction onClick={stay}>Stay signed in</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TaskDrawerContext.Provider>
  );
}
