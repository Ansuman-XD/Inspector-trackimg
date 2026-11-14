import { ImageOff, LogIn, LogOut, ShieldAlert, ShieldCheck } from "lucide-react";
import { fmtCoord, fmtDateTime, fmtDistance } from "@/lib/format";
import type { VisitStage } from "@/types";
import { AuthenticatedImage } from "./AuthenticatedImage";

/** Evidence card for one stage (check-in or check-out) of a visit. */
export function StageCard({ kind, stage, onPhoto }: { kind: "checkin" | "checkout"; stage?: VisitStage; onPhoto?: (url: string) => void }) {
  const title = kind === "checkin" ? "Check-In" : "Check-Out";
  const Icon = kind === "checkin" ? LogIn : LogOut;
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold"><Icon className="h-4 w-4 text-primary" />{title}</span>
        {!stage ? <span className="text-xs text-muted-foreground">Not done</span>
          : stage.override ? <span className="inline-flex items-center gap-1 rounded bg-warning/15 px-1.5 py-0.5 text-[11px] font-semibold text-warning-foreground dark:text-warning"><ShieldAlert className="h-3.5 w-3.5" />ADMIN OVERRIDE</span>
          : <span className="inline-flex items-center gap-1 text-xs font-semibold text-success"><ShieldCheck className="h-3.5 w-3.5" />GPS VERIFIED</span>}
      </div>
      {stage && (
        <>
          {stage.photo ? (
  <AuthenticatedImage
    src={stage.photo}
    alt={`${title} photo`}
    className="aspect-video w-full object-cover"
    onClick={stage.photo ? () => onPhoto?.(stage.photo!) : undefined}
  />
) : !stage.override ? (
            <div className="flex aspect-[3/1] items-center justify-center gap-2 bg-muted text-xs text-muted-foreground"><ImageOff className="h-4 w-4" />Photo retained on the submitting device</div>
          ) : null}
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 px-3 py-2 text-xs">
            <div><dt className="text-muted-foreground">Time</dt><dd className="font-medium">{fmtDateTime(stage.at)}</dd></div>
            <div><dt className="text-muted-foreground">Distance</dt><dd className="font-medium">{fmtDistance(stage.distance)}{stage.accuracy != null && ` (±${stage.accuracy} m)`}</dd></div>
            <div className="col-span-2"><dt className="text-muted-foreground">GPS</dt><dd className="font-mono">{stage.lat != null ? `${fmtCoord(stage.lat)}, ${fmtCoord(stage.lng)}` : "—"}</dd></div>
            {stage.override && <div className="col-span-2 rounded-md bg-warning/10 p-2"><dt className="font-medium">Override reason</dt><dd>{stage.override.reason}</dd></div>}
          </dl>
        </>
      )}
    </div>
  );
}
