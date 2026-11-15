import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  User as UserIcon,
  MapPin,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Logo, ThemeToggle, ConnectionStatus } from "@/components/rt/common";
import { authService } from "@/services/authService";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";
import field from "@/assets/login-field.jpg";
import { OrgCorners, ORG } from "@/components/rt/OrgLogos";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign In — Inspector Tracking System" },
      { name: "description", content: "Sign in to Inspector Tracking System." },
      { property: "og:title", content: "Sign In — Inspector Tracking System" },
      {
        property: "og:description",
        content: "Secure access for administrators and field employees.",
      },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("admin");
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  useEffect(() => {
    const s = authService.current();
    if (s) navigate({ to: authService.homeFor(s.role), replace: true });
    const r = authService.rememberedId();
    if (r) {
      setId(r);
      setRemember(true);
      setRole(r.startsWith("ADMIN") ? "admin" : "employee");
    }
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!id.trim() || !pw) {
      setErr("Enter your User ID and password.");
      return;
    }
    setBusy(true);
    try {
      const s = await authService.login(id, pw, role, remember);
      toast.success(`Welcome, ${s.name}`);
      navigate({ to: authService.homeFor(s.role), replace: true });
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid h-screen overflow-hidden lg:grid-cols-[1.1fr_1fr]">
<aside className="relative hidden h-full overflow-hidden bg-sidebar lg:block">
          <img
          src={field}
          alt="Railway engineer inspecting track"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/70 to-sidebar/30" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Logo light />
          <div className="max-w-md">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-sidebar-primary">
              Field Operations
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-sidebar-accent-foreground">
              Inspector Tracking System
            </h1>
            <p className="mt-3 text-base text-sidebar-foreground/80">
              Employee Location Visit &amp; Task Monitoring
            </p>
            <ul className="mt-8 space-y-3 text-sm text-sidebar-foreground/85">
              {[
                [MapPin, "GPS proximity verification at every assigned site"],
                [Camera, "Photographic evidence with location record"],
                [ShieldCheck, "Complete audit trail for each visit"],
              ].map(([I, t], i) => {
                const Icon = I as typeof MapPin;
                return (
                  <li key={i} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-accent">
                      <Icon className="h-4 w-4 text-sidebar-primary" />
                    </span>
                    {t as string}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-sidebar-accent-foreground">{ORG.name}</p>
            <p className="text-xs text-sidebar-foreground/70">
              {ORG.branch}, {ORG.branchAddress}
            </p>
            <p className="text-[11px] text-sidebar-foreground/45">
              © {new Date().getFullYear()} {ORG.short} · {ORG.ministry}
            </p>
          </div>
        </div>
      </aside>

     
      <main className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
        <div className="px-4 pt-3 sm:px-6 sm:pt-6">
          <OrgCorners size={48} />
        </div>
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <Logo className="lg:invisible" />
          <div className="flex items-center gap-2">
            <ConnectionStatus compact />
            <ThemeToggle />
          </div>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-5 py-4">
          <div className="w-full max-w-[400px]">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use your Inspector Tracking System credentials to continue.
            </p>

            <div className="mt-6 grid grid-cols-2 rounded-lg border bg-muted p-1" role="tablist">
              {(["admin", "employee"] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={role === r}
                  onClick={() => setRole(r)}
                  className={cn(
                    "h-10 rounded-md text-sm font-medium transition",
                    role === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {r === "admin" ? "Admin" : "Employee"}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">
                  {role === "admin" ? "User ID" : "Employee ID"}
                </span>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder={role === "admin" ? "ADMIN001" : "EMP001"}
                    className="h-11 pl-9 uppercase placeholder:normal-case"
                    autoComplete="username"
                    autoCapitalize="characters"
                  />
                </div>
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Password</span>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type={show ? "text" : "password"}
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    className="h-11 px-9"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    aria-label="Show password"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => setForgot(true)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              {err && (
                <div
                  role="alert"
                  className="rounded-md border border-danger/30 bg-danger/8 px-3 py-2 text-sm text-danger"
                >
                  {err}
                </div>
              )}
              <Button type="submit" disabled={busy} className="h-11 w-full text-sm">
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-5 rounded-lg border bg-card p-3 text-xs text-muted-foreground">
              <p className="mb-2 font-semibold text-foreground">Presentation accounts</p>

              <div className="grid grid-cols-2 gap-y-1 font-mono">
                <button
                  type="button"
                  className="text-left hover:text-foreground"
                  onClick={() => {
                    setRole("admin");
                    setId("ADMIN001");
                    setPw("admin123");
                  }}
                >
                  ADMIN001 / admin123
                </button>
                <span>Administrator</span>
                <button
                  type="button"
                  className="text-left hover:text-foreground"
                  onClick={() => {
                    setRole("employee");
                    setId("EMP001");
                    setPw("employee123");
                  }}
                >
                  EMP001 / employee123
                </button>
                <span>Rajesh Kumar</span>
              </div>
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              {ORG.name}, {ORG.branch}
            </p>
          </div>
        </div>
      </main>

      <Dialog open={forgot} onOpenChange={setForgot}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password assistance</DialogTitle>
            <DialogDescription>
              Password resets are handled by your system administrator. Contact the Divisional IT
              cell or your Inspector Tracking System administrator with your Employee ID to have
              your password reset.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setForgot(false)}>Understood</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
