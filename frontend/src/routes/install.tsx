/** Public install landing page: native install prompt on Android/desktop, iOS step guide, Cancel blanks the page. */
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Apple, ChevronRight, Download, MonitorSmartphone, Share as ShareIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import applogoUrl from "@/assets/applogo.avif";


export const Route = createFileRoute("/install")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Install Inspector Tracking System" },
      { name: "description", content: "Install the Inspector Tracking System app on your phone or desktop and sign in to get started." },
      { property: "og:title", content: "Install Inspector Tracking System" },
      { property: "og:description", content: "Install the Inspector Tracking System app on your phone or desktop." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InstallPage,
});

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as { standalone?: boolean }).standalone === true;
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios|edgiOS/i.test(navigator.userAgent);
}

function InstallPage() {
  const navigate = useNavigate();
  const [bip, setBip] = useState<BIPEvent | null>(null);
  const [iosGuide, setIosGuide] = useState(false);
  const [blanked, setBlanked] = useState(false);

  // Already installed → go straight to login.
  useEffect(() => {
    if (isStandalone()) navigate({ to: "/login", replace: true });
  }, [navigate]);

  // Capture the native install prompt where the browser offers one.
  useEffect(() => {
    const onBip = (e: Event) => { e.preventDefault(); setBip(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (blanked) return <div aria-hidden className="fixed inset-0 z-50 bg-white" />;

  const cancel = () => setBlanked(true);

  const install = async () => {
    if (bip) {
      await bip.prompt();
      const { outcome } = await bip.userChoice;
      if (outcome === "accepted") {
        toast.success("App installed! Opening sign-in…");
        navigate({ to: "/login" });
      } else {
        toast.info("You can install any time from this page.");
      }
      setBip(null);
    } else if (isIOS()) {
      setIosGuide(true);
    } else {
      // Browser without a programmatic prompt (e.g. Firefox, Safari desktop): show manual steps.
      setIosGuide(true);
    }
  };

  const platformNote = bip
    ? "Your browser supports one-tap installation."
    : isIOS()
      ? "On iPhone, installation uses Safari's Add to Home Screen."
      : "Use your browser menu → Install app if the prompt does not appear.";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm text-center">
       <img src={applogoUrl} alt="Inspector Tracking System" className="mx-auto h-16 w-16 rounded-xl object-contain" />
        <h1 className="mt-4 text-xl font-semibold tracking-tight">Inspector Tracking System</h1>
        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">Field Visit Management</p>
        <p className="mt-3 text-sm text-muted-foreground">Official Railway Field Inspection &amp; Visit Management System. Install the app, then sign in with your employee or admin account.</p>

        <div className="mt-7 space-y-3">
          <Button size="lg" className="h-12 w-full text-base" onClick={install}>
            <Download className="mr-2 h-5 w-5" />Install App
          </Button>
          <Button size="lg" variant="outline" className="h-12 w-full text-base" onClick={cancel}>
            <X className="mr-2 h-5 w-5" />Cancel
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{platformNote}</p>

        {iosGuide && (
          <div className="mt-6 space-y-2.5 rounded-lg border bg-card p-4 text-left shadow-[var(--shadow-card)]">
            <p className="flex items-center gap-2 text-sm font-semibold"><Apple className="h-4 w-4" />Add to Home Screen</p>
            {[
              { icon: <ShareIcon className="h-4 w-4" />, text: "Tap the Share icon (square with the upward arrow) at the bottom of Safari." },
              { icon: <MonitorSmartphone className="h-4 w-4" />, text: "Scroll down and tap \"Add to Home Screen\"." },
              { icon: <Download className="h-4 w-4" />, text: "Tap \"Add\" at the top right. The app icon appears on your home screen." },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">{s.icon}</span>
                <span>{s.text}</span>
              </div>
            ))}
            <p className="flex items-center gap-1 pt-1 text-xs text-muted-foreground"><ChevronRight className="h-3 w-3" />After installing, open the app icon and sign in.</p>
            <Button variant="ghost" size="sm" className={cn("w-full")} onClick={() => setIosGuide(false)}>Close</Button>
          </div>
        )}
      </div>
    </div>
  );
}
