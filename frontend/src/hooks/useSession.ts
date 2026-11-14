import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { taskService } from "@/services/taskService";
import type { Role, Session } from "@/types";

/**
 * Guards a role area: redirects if not signed in / wrong role, slides the idle
 * timeout on activity, warns before expiry, and runs the task status clock.
 */
export function useRoleGuard(role: Role) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [warn, setWarn] = useState(false);

    useEffect(() => {
    const s = authService.current();
    if (!s) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (s.role !== role) {
      toast.error("You don't have access to that area.");
      navigate({ to: authService.homeFor(s.role), replace: true });
      return;
    }
    setSession(s);
    taskService.tick();

    let last = 0;
    const onAct = () => {
      if (Date.now() - last > 20000) {
        last = Date.now();
        authService.touch();
        setWarn(false);
      }
    };
    ["pointerdown", "keydown"].forEach((ev) => window.addEventListener(ev, onAct));

    const iv = setInterval(() => {
      taskService.tick();
      const cur = authService.current();
      // Also treat missing JWT as expired
      const hasToken =
        typeof localStorage !== "undefined" &&
        !!localStorage.getItem("railtrack.access_token");
      if (!cur || !hasToken) {
        setSession(null);
        toast.info("Your session has expired. Please sign in again.");
        navigate({ to: "/login", replace: true });
        return;
      }
      setWarn(new Date(cur.expiresAt).getTime() - Date.now() < 2 * 60e3);
    }, 15000);

    // Instant logout when API says session is dead
    const onExpired = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message?: string } | undefined;
      setSession(null);
      toast.info(detail?.message || "Your session has expired. Please sign in again.");
      navigate({ to: "/login", replace: true });
    };
    window.addEventListener("railtrack:session-expired", onExpired);

    return () => {
      clearInterval(iv);
      ["pointerdown", "keydown"].forEach((ev) => window.removeEventListener(ev, onAct));
      window.removeEventListener("railtrack:session-expired", onExpired);
    };
  }, [role, navigate]);

  const logout = async () => {
    setSession(null);
    await authService.logout();
    navigate({ to: "/login", replace: true });
    toast.success("You have been signed out.");
  };
  const stay = () => { authService.touch(); setWarn(false); };
  return { session, logout, warn, stay };
}
