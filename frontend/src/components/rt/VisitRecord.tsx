import { ShieldCheck, ImageOff } from "lucide-react";
import { fmtCoord, fmtDate, fmtDistance, fmtTime } from "@/lib/format";
import type { Task, VisitLocation, Employee } from "@/types";

/** Visual verification record associated with a visit photo (not embedded EXIF). */
export function VisitRecord({ task, location, employee, photo, photoAt, compact }: { task: Task; location: VisitLocation; employee?: Employee; photo?: string; photoAt?: string; compact?: boolean }) {
  const img = photo ?? task.photo;
  const at = photoAt ?? task.photoTimestamp ?? task.verifiedAt;
  const ok = task.verificationStatus === "verified";
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      {img ? (
        <img src={img} alt={`Visit at ${location.name}`} className={compact ? "aspect-video w-full object-cover" : "max-h-[60vh] w-full object-contain bg-foreground/90"} />
      ) : (
        <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-muted text-sm text-muted-foreground">
          <ImageOff className="h-6 w-6" />Photograph retained on the submitting device
        </div>
      )}
      <div className="border-t bg-secondary/60 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[11px] font-semibold tracking-[0.18em] text-primary">RAILTRACK FIELD VISIT</span>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${ok ? "text-success" : "text-danger"}`}><ShieldCheck className="h-3.5 w-3.5" />GPS {ok ? "VERIFIED" : "NOT VERIFIED"}</span>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div className="col-span-2"><dt className="text-muted-foreground">Location</dt><dd className="font-medium">{location.name}</dd></div>
          {employee && <div className="col-span-2"><dt className="text-muted-foreground">Employee</dt><dd className="font-medium">{employee.name} · {employee.id}</dd></div>}
          <div><dt className="text-muted-foreground">Date</dt><dd className="font-medium">{fmtDate(at)}</dd></div>
          <div><dt className="text-muted-foreground">Time (IST)</dt><dd className="font-medium">{fmtTime(at)}</dd></div>
          <div><dt className="text-muted-foreground">GPS</dt><dd className="font-mono">{fmtCoord(task.employeeLatitude)}, {fmtCoord(task.employeeLongitude)}</dd></div>
          <div><dt className="text-muted-foreground">Distance</dt><dd className="font-medium">{fmtDistance(task.distanceFromLocation)}{task.gpsAccuracy != null && ` (±${task.gpsAccuracy} m)`}</dd></div>
        </dl>
        {task.gpsDemo && <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-warning-foreground dark:text-warning">Recorded in GPS Demo Mode</p>}
      </div>
    </div>
  );
}
