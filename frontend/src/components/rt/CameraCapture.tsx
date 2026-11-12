import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, RotateCcw, Check, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = "loading" | "live" | "captured" | "error";

/** Live camera capture via getUserMedia. Returns a compressed JPEG data URL. */
export function CameraCapture({ onUse }: { onUse: (dataUrl: string, at: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState("");
  const [shot, setShot] = useState<{ url: string; at: string } | null>(null);

  async function start() {
    setState("loading"); setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("unsupported"), { name: "NotSupportedError" });
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      stream.current = s;
      if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}); }
      setState("live");
    } catch (e) {
      const n = (e as Error).name;
      setError(n === "NotAllowedError" ? "Camera permission was denied. Allow camera access in your browser settings, then try again."
        : n === "NotFoundError" ? "No camera was found on this device."
        : n === "NotSupportedError" ? "This browser does not support live camera capture."
        : "The camera is unavailable. It may be in use by another app.");
      setState("error");
    }
  }
  function stop() { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; }

  useEffect(() => { start(); return stop; }, []);

  function compress(src: CanvasImageSource, w: number, h: number) {
    const max = 960, scale = Math.min(1, max / Math.max(w, h));
    const c = document.createElement("canvas");
    c.width = Math.round(w * scale); c.height = Math.round(h * scale);
    c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.68);
  }

  function capture() {
    const v = video.current; if (!v || !v.videoWidth) return;
    setShot({ url: compress(v, v.videoWidth, v.videoHeight), at: new Date().toISOString() });
    setState("captured"); stop();
  }

  function fromFile(f: File) {
    const img = new Image();
    img.onload = () => { setShot({ url: compress(img, img.naturalWidth, img.naturalHeight), at: new Date().toISOString() }); setState("captured"); stop(); };
    img.src = URL.createObjectURL(f);
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-foreground/95 sm:aspect-video">
        <video ref={video} playsInline muted className={state === "live" ? "h-full w-full object-cover" : "hidden"} />
        {state === "captured" && shot && <img src={shot.url} alt="Captured visit" className="h-full w-full object-cover" />}
        {state === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-background/80"><Loader2 className="h-7 w-7 animate-spin" /><span className="text-sm">Starting camera…</span></div>
        )}
        {state === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-background/90">
            <CameraOff className="h-8 w-8" /><p className="text-sm">{error}</p>
          </div>
        )}
        {state === "live" && <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-background/40" />}
      </div>
      {state === "live" && <Button size="lg" className="h-14 w-full text-base" onClick={capture}><Camera className="mr-2 h-5 w-5" />Capture Photo</Button>}
      {state === "captured" && shot && (
        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" variant="outline" className="h-14" onClick={() => { setShot(null); start(); }}><RotateCcw className="mr-2 h-4 w-4" />Retake</Button>
          <Button size="lg" className="h-14" onClick={() => onUse(shot.url, shot.at)}><Check className="mr-2 h-4 w-4" />Use Photo</Button>
        </div>
      )}
      {state === "error" && (
        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" variant="outline" className="h-14" onClick={start}>Try Again</Button>
          <label className="inline-flex h-14 cursor-pointer items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            <Upload className="mr-2 h-4 w-4" />Use Device Camera
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && fromFile(e.target.files[0])} />
          </label>
        </div>
      )}
    </div>
  );
}
