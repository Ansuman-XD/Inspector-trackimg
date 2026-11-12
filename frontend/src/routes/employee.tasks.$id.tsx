import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Navigation, Loader2, MapPin, CheckCircle2, XCircle, Camera, Send, AlertTriangle, Lock, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { KV, PriorityTag, StatusBadge, ToneBadge } from "@/components/rt/common";
import { CameraCapture } from "@/components/rt/CameraCapture";
import { MapView } from "@/components/rt/MapView";
import { StageCard } from "@/components/rt/StageCard";
import { PlanVisitDialog } from "@/components/rt/PlanVisitDialog";
import { useEmployeeSession } from "@/components/rt/employeeContext";
import { useDB } from "@/hooks/useDB";
import { taskService } from "@/services/taskService";
import { demoPosition, getCurrentPosition, LOW_ACCURACY_THRESHOLD } from "@/services/verificationService";
import { fmtDate, fmtDateTime, fmtDistance, todayISO, fmtWindow } from "@/lib/format";
import { blockingVisit, currentStage, DEFAULT_RADIUS, isSelfPlanned, pastCutoff } from "@/lib/visitRules";

export const Route = createFileRoute("/employee/tasks/$id")({
  head: () => ({ meta: [{ title: "Visit — Inspector Tracking System" }, { name: "description", content: "Field visit check-in and check-out." }] }),
  component: VisitFlow,
});

function VisitFlow() {
  const { id } = Route.useParams();
  const db = useDB();
  const navigate = useNavigate();
  const { session } = useEmployeeSession();
  const task = db.tasks.find((t) => t.id === id && t.employeeId === session.userId);
  const loc = db.locations.find((l) => l.id === task?.locationId);
  const [busy, setBusy] = useState(false);
  const [gpsErr, setGpsErr] = useState("");
  const [shot, setShot] = useState<{ url: string; at: string } | null>(null);
  const [camera, setCamera] = useState(false);
  const [edit, setEdit] = useState(false);
  const [del, setDel] = useState(false);
  const [lastFix, setLastFix] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

  if (!task || !loc) return <div className="py-16 text-center"><p className="font-medium">Visit not found</p><Link to="/employee/tasks" className="text-sm text-primary">Back to tasks</Link></div>;

  const radius = loc.verificationRadius ?? DEFAULT_RADIUS;
  const stage = currentStage(task);
  const stageLabel = stage === "checkout" ? "Check-Out" : "Check-In";
  const isToday = task.date === todayISO();
  const missed = ["not_visited", "expired"].includes(task.status) && !task.checkIn;
  const notStarted = ["assigned", "pending"].includes(task.status) && !task.checkIn;
  const self = isSelfPlanned(task);
  const blocker = stage === "checkin" ? blockingVisit(db, task) : undefined;
  const blockerLoc = blocker && db.locations.find((l) => l.id === blocker.locationId);
  const needsGps = (task.status === "in_progress" || task.status === "verification_failed" || task.status === "checked_in" || (task.status === "expired" && !!task.checkIn && !task.checkOut));

  const back = <Link to="/employee/tasks" className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Tasks</Link>;

  const start = () => { try { taskService.start(task.id); toast.success("Visit started. Verify your location to check in."); } catch (e) { toast.error((e as Error).message); } };
  const verify = async () => {
    setBusy(true); setGpsErr("");
    try {
      const g = db.settings.gpsDemo;
      const fix = g.enabled ? (await new Promise((r) => setTimeout(r, 1200)), demoPosition(loc.lat, loc.lng, g.mode)) : await getCurrentPosition();
      setLastFix({ lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy });
      const r = taskService.recordGps(task.id, fix);
      if (r.passed) toast.success(`Location verified — ${Math.round(r.distance)} m from site.`);
      else toast.error(`You are ${fmtDistance(r.distance)} away. Move within ${r.radius} m and retry.`);
    } catch (e) { setGpsErr((e as Error).message); } finally { setBusy(false); }
  };
  const submit = async () => {
    if (!shot) return;
    setBusy(true);
    try {
      // 1. Try local optimistic update first for immediate response
      taskService.submitStage(task.id, shot.url, shot.at);

      // 2. Prepare binary Blob from data URL
      const res = await fetch(shot.url);
      const photoBlob = await res.blob();
      const idempotencyKey = `IDEMP-${task.id}-${stage}-${Date.now().toString(36)}`;

      // 3. Queue in IndexedDB offline queue
      const { offlineQueue } = await import("@/services/offlineQueue");
      const stageLat = lastFix?.lat ?? task.employeeLatitude ?? loc.lat;
      const stageLng = lastFix?.lng ?? task.employeeLongitude ?? loc.lng;
      const stageAcc = lastFix?.accuracy ?? task.gpsAccuracy ?? 10;

      await offlineQueue.queueSubmission({
        id: idempotencyKey,
        taskId: task.id,
        type: stage === "checkin" ? "check_in" : "check_out",
        lat: stageLat,
        lng: stageLng,
        accuracy: stageAcc,
        deviceTime: shot.at,
        photoBlob,
        status: "queued",
        createdAt: Date.now(),
      });

      if (navigator.onLine) {
        // Trigger background sync immediately to push stage to PostgreSQL
        await offlineQueue.syncAll();
      }

      toast.success(
        stage === "checkin"
          ? "Checked in. Remember to check out before leaving."
          : "Checked out. Visit completed."
      );
      setShot(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = () => {
    try {
      const r = taskService.deleteByEmployee(session.userId, task.id);
      toast.success(r === "archived" ? "Visit cancelled and kept in history." : "Visit deleted.");
      navigate({ to: "/employee/tasks" });
    } catch (e) { toast.error((e as Error).message); }
  };

  const markers = [
    { id: "loc", lat: loc.lat, lng: loc.lng, color: "var(--info)", label: loc.name, kind: "location" as const, radius },
    ...(task.employeeLatitude != null ? [{ id: "me", lat: task.employeeLatitude, lng: task.employeeLongitude!, color: "var(--primary)", label: "Your position", kind: "employee" as const }] : []),
  ];

  return (
    <div className="space-y-4">
      {back}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between gap-2"><div><h1 className="text-lg font-semibold">{loc.name}</h1><p className="text-xs text-muted-foreground">{loc.type} · {task.id}</p></div><StatusBadge status={task.status} /></div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <KV k="Date" v={fmtDate(task.date)} /><KV k="Window" v={fmtWindow(task)} />
          <KV k="Priority" v={<PriorityTag p={task.priority} />} /><KV k="Radius" v={`${radius} m`} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{self ? "Planned by you" : "Assigned by Admin"}</p>
        <p className="mt-2 text-sm text-muted-foreground">{loc.address}</p>
        {task.instructions && <p className="mt-2 rounded-md bg-muted p-2 text-sm">{task.instructions}</p>}
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-primary"><Navigation className="h-4 w-4" />Open directions</a>
        {notStarted && (
          self ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-11" onClick={() => setEdit(true)}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>
              <Button variant="outline" className="h-11 text-danger" onClick={() => setDel(true)}><Trash2 className="mr-1.5 h-4 w-4" />Delete</Button>
            </div>
          ) : <p className="mt-3 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />Assigned by Admin — only Admin can delete this visit.</p>
        )}
      </div>

      <MapView markers={markers} lines={task.employeeLatitude != null ? [{ from: [loc.lat, loc.lng], to: [task.employeeLatitude, task.employeeLongitude!], label: fmtDistance(task.distanceFromLocation) }] : []} fitKey={String(task.attempts.length)} zoom={16} className="h-52 w-full rounded-lg border" />

      <Steps task={task} hasPhoto={!!shot} />

      {task.overriddenByAdmin && <div className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm"><ShieldCheck className="h-4 w-4 shrink-0" /><span>Admin override applied: {task.adminOverrideReason}</span></div>}

      {(task.checkIn || task.checkOut) && (
        <div className="grid gap-2">
          <StageCard kind="checkin" stage={task.checkIn} />
          {(task.checkOut || task.status === "verified") && <StageCard kind="checkout" stage={task.checkOut} />}
        </div>
      )}

      {task.status === "verified" && (
        <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-success" /><p className="mt-2 font-semibold">Visit completed</p><p className="text-sm text-muted-foreground">Checked in and checked out. Your supervisor has been notified.</p>
          <Link to="/employee/tasks" className="mt-3 block"><Button className="w-full">Back to my visits</Button></Link>
        </div>
      )}

      {missed && <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm"><XCircle className="mb-1 h-5 w-5 text-danger" />This visit window has ended without check-in.</div>}

      {blocker && task.status !== "verified" && !missed && (
        <div role="alert" className="flex gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm">
          <Lock className="h-4 w-4 shrink-0 text-danger" />
          <span>Please complete Check-Out at <b>{blockerLoc?.name ?? "your previous visit"}</b> before starting this visit. <Link to="/employee/tasks/$id" params={{ id: blocker.id }} className="font-medium text-primary underline">Go to that visit</Link></span>
        </div>
      )}

      {!isToday && notStarted && <p className="rounded-lg border p-3 text-sm text-muted-foreground">This visit can be started on {fmtDate(task.date)}.</p>}

      {notStarted && isToday && <Button className="h-12 w-full text-base" onClick={start} disabled={!!blocker}>Start visit</Button>}

      {needsGps && !blocker && (
        <div className="space-y-2">
          {task.status === "checked_in" && <p className="rounded-lg border p-3 text-sm">You are checked in. When your work here is finished, verify your location again and take a photo to <b>check out</b>.</p>}
          {task.status === "verification_failed" && task.distanceFromLocation != null && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm"><b>{stageLabel} location not verified.</b> You are approximately <b>{fmtDistance(task.distanceFromLocation)}</b> from the site. Move within {radius} m and try again.</div>
          )}
          {gpsErr && <div className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm"><AlertTriangle className="h-4 w-4 shrink-0" />{gpsErr}</div>}
          {db.settings.gpsDemo.enabled && <ToneBadge tone="info">DEMO MODE · GPS</ToneBadge>}
          <Button className="h-12 w-full text-base" onClick={verify} disabled={busy}>{busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <MapPin className="mr-2 h-5 w-5" />}{busy ? "Checking your location…" : `Verify location for ${stageLabel}`}</Button>
        </div>
      )}

      {task.status === "location_reached" && (
        <div className="space-y-3">
          <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm">
            <CheckCircle2 className="mb-1 h-5 w-5 text-success" /><b>{stageLabel} location verified</b> · {fmtDistance(task.distanceFromLocation)} from site (within {radius} m)
            {task.gpsAccuracy != null && <p className="mt-1">GPS accuracy: ±{task.gpsAccuracy} m</p>}
            {task.gpsAccuracy != null && task.gpsAccuracy > LOW_ACCURACY_THRESHOLD && <p className="mt-1">GPS accuracy is currently low. Please wait or move to an open area.</p>}
          </div>
          {shot ? (
            <>
              <img src={shot.url} alt="Captured" className="aspect-video w-full rounded-lg border object-cover" />
              <p className="text-xs text-muted-foreground">Captured {fmtDateTime(shot.at)}</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-12" onClick={() => { setShot(null); setCamera(true); }}>Retake</Button>
                <Button className="h-12" onClick={submit} disabled={busy}><Send className="mr-1.5 h-4 w-4" />Submit {stageLabel}</Button>
              </div>
            </>
          ) : camera ? (
            <CameraCapture onUse={(url, at) => { setShot({ url, at }); setCamera(false); }} />
          ) : (
            <Button className="h-12 w-full text-base" onClick={() => setCamera(true)}><Camera className="mr-2 h-5 w-5" />Capture {stageLabel} photo</Button>
          )}
        </div>
      )}

      {edit && <PlanVisitDialog open employeeId={session.userId} task={task} onClose={() => setEdit(false)} onSaved={(nid) => nid !== task.id && navigate({ to: "/employee/tasks/$id", params: { id: nid } })} />}
      <AlertDialog open={del} onOpenChange={setDel}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this planned visit?</AlertDialogTitle><AlertDialogDescription>{pastCutoff(task.date) ? "It is past 9:00 AM today, so this visit will be marked as cancelled and kept in history." : "This visit will be removed."}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Keep</AlertDialogCancel><AlertDialogAction onClick={remove}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Steps({ task, hasPhoto }: { task: { status: string; checkIn?: unknown; checkOut?: unknown }; hasPhoto: boolean }) {
  const s = task.status;
  let idx: number;
  if (s === "verified") idx = 4;
  else if (task.checkIn) idx = s === "location_reached" ? (hasPhoto ? 3 : 3) : 2;
  else idx = s === "assigned" || s === "pending" ? 0 : s === "location_reached" ? 1 : 0;
  if (!task.checkIn && (s === "in_progress" || s === "verification_failed")) idx = 0.5;
  const labels = ["Start", "Check-In", "Working", "Check-Out"];
  return (
    <ol className="grid grid-cols-4 gap-1">
      {labels.map((l, i) => (
        <li key={l} className="text-center"><div className={`h-1.5 rounded-full ${i < idx ? "bg-success" : i === Math.ceil(idx) ? "bg-primary" : "bg-muted"}`} /><span className={`text-[11px] ${i === Math.ceil(idx) ? "font-semibold" : "text-muted-foreground"}`}>{l}</span></li>
      ))}
    </ol>
  );
}
