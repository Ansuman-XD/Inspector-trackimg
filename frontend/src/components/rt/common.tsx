import { useEffect, useState, type ReactNode } from "react";
import { Moon, Sun, Wifi, WifiOff, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_META, type Tone } from "@/lib/status";
import type { Priority, TaskStatus } from "@/types";
import { prefs } from "@/services/storageService";
// import applogoUrl from "@/assets/applogo.avif";

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
     {/* <img src={applogoUrl} alt="Inspector Tracking System" className="h-13 w-13 shrink-0 rounded-md object-contain" /> */}
      <div className="leading-tight">
        <div className={cn("text-[15px] font-semibold tracking-tight", light ? "text-sidebar-accent-foreground" : "text-foreground")}>Inspector Tracking System</div>
        <div className={cn("text-[10px] uppercase tracking-[0.14em]", light ? "text-sidebar-foreground/60" : "text-muted-foreground")}>Field Visit Management</div>
      </div>
    </div>
  );
}

const toneCls: Record<Tone, string> = {
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/15 text-warning-foreground dark:text-warning border-warning/30",
  danger: "bg-danger/10 text-danger border-danger/25",
  info: "bg-info/10 text-info border-info/25",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function ToneBadge({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", toneCls[tone], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const m = STATUS_META[status] || { label: status || "Assigned", tone: "info" };
  return <ToneBadge tone={m.tone} className={className}>{m.label}</ToneBadge>;
}


export function PriorityTag({ p }: { p: Priority }) {
  const cls = p === "high" ? "text-danger" : p === "medium" ? "text-warning-foreground dark:text-warning" : "text-muted-foreground";
  return <span className={cn("text-xs font-semibold uppercase tracking-wide", cls)}>{p}</span>;
}

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    setTheme(prefs.get<"light" | "dark">("railtrack.theme", "light"));
    const h = () => setTheme(prefs.get<"light" | "dark">("railtrack.theme", "light"));
    window.addEventListener("rt-theme", h);
    return () => window.removeEventListener("rt-theme", h);
  }, []);
  const set = (t: "light" | "dark") => {
    prefs.set("railtrack.theme", t);
    document.documentElement.classList.toggle("dark", t === "dark");
    window.dispatchEvent(new Event("rt-theme"));
  };
  return { theme, setTheme: set, toggle: () => set(theme === "dark" ? "light" : "dark") };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} aria-label="Toggle theme" className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md border bg-card text-muted-foreground hover:text-foreground", className)}>
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function useOnline() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(navigator.onLine);
    const a = () => setOn(true), b = () => setOn(false);
    window.addEventListener("online", a); window.addEventListener("offline", b);
    return () => { window.removeEventListener("online", a); window.removeEventListener("offline", b); };
  }, []);
  return on;
}

export function ConnectionStatus({ compact }: { compact?: boolean }) {
  const on = useOnline();
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", on ? "text-success border-success/25 bg-success/8" : "text-warning-foreground dark:text-warning border-warning/40 bg-warning/15")}>
      {on ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      {!compact && (on ? "Online" : "Offline")}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 no-print">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className, bodyClass }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn("rounded-lg border bg-card shadow-[var(--shadow-card)]", className)}>
      {title && (
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </header>
      )}
      <div className={cn("p-4", bodyClass)}>{children}</div>
    </section>
  );
}

export function EmptyState({ title, text, icon, action }: { title: string; text?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon ?? <Inbox className="h-5 w-5" />}</div>
      <p className="font-medium">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="block text-xs text-danger">{error}</span> : hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function Avatar({ name, photo, size = 36 }: { name: string; photo?: string; size?: number }) {
  return photo ? (
    <img src={photo} alt={name} style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />
  ) : (
    <span style={{ width: size, height: size, fontSize: size * 0.36 }} className="inline-flex shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground">
      {name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
    </span>
  );
}

export function KV({ k, v, mono }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className={cn("text-right font-medium", mono && "font-mono text-[13px]")}>{v}</span>
    </div>
  );
}
