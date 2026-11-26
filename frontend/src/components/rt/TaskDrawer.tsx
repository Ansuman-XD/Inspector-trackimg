import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDB } from "@/hooks/useDB";
import { KV, PriorityTag, StatusBadge } from "./common";
import { MapView } from "./MapView";
import { VisitRecord } from "./VisitRecord";
import { StageCard } from "./StageCard";
import { taskService } from "@/services/taskService";
import { fmtCoord, fmtDate, fmtDateTime, fmtDistance, fmtPhone, fmtWindow } from "@/lib/format";
import { markerColor } from "@/lib/status";
import { isSelfPlanned, coVisitors } from "@/lib/visitRules";
import { Maximize2, ShieldAlert, Trash2, Star } from "lucide-react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b px-6 py-4 last:border-0">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function TaskDrawer({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const db = useDB();
  const [viewer, setViewer] = useState(false);
  const [overrideStage, setOverrideStage] = useState<"checkin" | "checkout" | null>(null);
  const [reason, setReason] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const t = db.tasks.find((x) => x.id === taskId);
  const e = t && db.employees.find((x) => x.id === t.employeeId);
  const l = t && db.locations.find((x) => x.id === t.locationId);

  // function doOverride() {
  //   if (!t || !overrideStage) return;
  //   try {
  //     taskService.override(t.id, overrideStage, reason);
  //     toast.success(overrideStage === "checkin" ? "Check-in marked verified by override." : "Check-out marked verified. Visit completed.");
  //     setOverrideStage(null); setReason("");
  //   } catch (x) { toast.error((x as Error).message); }
  // }
  async function doOverride() {
    if (!t || !overrideStage) return;
    try {
      await taskService.override(t.id, overrideStage, reason);
      toast.success(overrideStage === "checkin" ? "Check-in marked verified by override." : "Check-out marked verified. Visit completed.");
      setOverrideStage(null); setReason("");
    } catch (x) { toast.error((x as Error).message); }
  }

  async function doDelete() {
    if (!t) return;
    try {
      await taskService.remove(t.id);
      toast.success("Visit deleted. A copy is kept in history.");
      setConfirmDelete(false);
      onClose();
    } catch (x) {
      toast.error((x as Error).message);
    }
  }
async function toggleImportant() {
  if (!t) return;
  try {
    await taskService.setImportant(t.id, !t.important);
    toast.success(t.important ? "Unmarked. Photos follow the 7-day rule." : "Marked important. Photos kept for 30 days.");
  } catch (x) { toast.error((x as Error).message); }
}
  return (
    <Sheet open={!!taskId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl">
        {t && l ? (
          <>
            <SheetHeader className="border-b px-6 py-4 text-left">
              <div className="flex items-center gap-2"><span className="font-mono text-xs text-muted-foreground">{t.id}</span><StatusBadge status={t.status} />{isSelfPlanned(t) && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">Self-planned</span>}</div>
              <SheetTitle className="text-lg">{l.name}</SheetTitle>
              <SheetDescription>{fmtDate(t.date)} · {fmtWindow(t)}</SheetDescription>
            </SheetHeader>
            <Section title="Employee">
              <KV k="Name" v={e?.name ?? t.employeeId} />
              <KV k="Employee ID" v={t.employeeId} mono />
              <KV k="Department" v={e?.department ?? "—"} />
              <KV k="Phone" v={e ? fmtPhone(e.phone) : "—"} />
            </Section>
            <Section title="Assignment">
              {(() => {
  const others = coVisitors(db, t.locationId, t.date, t.id);
  return others.length > 0 ? (
    <div className="mt-2 rounded-md border p-2 text-xs">
      <p className="mb-1 font-medium">Also at this location on {fmtDate(t.date)}</p>
      {others.map(({ task, employee }) => (
        <div key={task.id} className="flex items-center justify-between py-0.5">
          <span>{employee?.name ?? task.employeeId}</span>
          <StatusBadge status={task.status} />
        </div>
      ))}
    </div>
  ) : null;
})()}
              <KV k="Location" v={l.name} />
              <KV k="Address" v={<span className="max-w-[260px] inline-block">{l.address}</span>} />
              <KV k="Window" v={`${fmtWindow(t)}`} />
              <KV k="Priority" v={<PriorityTag p={t.priority} />} />
              <KV k="Assigned by" v={isSelfPlanned(t) ? "Employee (self-planned)" : "Admin"} />
              <KV k="Started" v={fmtDateTime(t.startedAt)} />
              {t.instructions && <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm">{t.instructions}</p>}
            </Section>
            <Section title="Visit stages">
              <div className="grid gap-3 sm:grid-cols-2">
                <StageCard kind="checkin" stage={t.checkIn} onPhoto={() => setViewer(true)} />
                <StageCard kind="checkout" stage={t.checkOut} onPhoto={() => setViewer(true)} />
              </div>
              <KV k="Assigned coordinates" v={`${fmtCoord(l.lat)}, ${fmtCoord(l.lng)}`} mono />
              <KV k="GPS attempts" v={t.attempts.length} />
              <div className="mt-3">
                <MapView
                  className="h-56 w-full rounded-md border"
                  fitKey={t.id}
                  markers={[
                    { id: "loc", lat: l.lat, lng: l.lng, color: markerColor(t.status), label: l.name, radius: l.verificationRadius ?? 100 },
                    ...(t.employeeLatitude != null ? [{ id: "emp", lat: t.employeeLatitude, lng: t.employeeLongitude!, color: "var(--info)", label: "Employee position", kind: "employee" as const }] : []),
                  ]}
                  lines={t.employeeLatitude != null ? [{ from: [l.lat, l.lng], to: [t.employeeLatitude, t.employeeLongitude!], label: fmtDistance(t.distanceFromLocation) }] : []}
                />
              </div>
            </Section>
            <Section title="Evidence">
              {t.status === "verified" ? (
                <div className="relative">
                  <VisitRecord task={t} location={l} employee={e} compact />
                  {t.photo && (
                    <button onClick={() => setViewer(true)} className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs font-medium shadow"><Maximize2 className="h-3.5 w-3.5" />View</button>
                  )}
                </div>
              ) : <p className="text-sm text-muted-foreground">No evidence submitted yet.</p>}
            </Section>
            <Section title="Admin actions">
              <div className="flex flex-wrap gap-2">
                {!t.checkIn && t.status !== "verified" && (
                  <Button variant="outline" size="sm" onClick={() => { setOverrideStage("checkin"); setReason(""); }}><ShieldAlert className="mr-1.5 h-4 w-4" />Override Check-In</Button>
                )}
                {t.checkIn && !t.checkOut && (
                  <Button variant="outline" size="sm" onClick={() => { setOverrideStage("checkout"); setReason(""); }}><ShieldAlert className="mr-1.5 h-4 w-4" />Override Check-Out</Button>
                )}
                <Button variant="outline" size="sm" onClick={toggleImportant}>
  <Star className={`mr-1.5 h-4 w-4 ${t.important ? "fill-warning text-warning" : ""}`} />
  {t.important ? "Unmark Important" : "Mark Important"}
</Button>
                <Button variant="outline" size="sm" className="text-danger hover:text-danger" onClick={() => setConfirmDelete(true)}><Trash2 className="mr-1.5 h-4 w-4" />Delete Visit</Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Overrides mark a stage verified without GPS/photo and release the employee's sequential lock. Deleting keeps a copy in history.</p>
            </Section>
            <Dialog open={viewer} onOpenChange={setViewer}>
              <DialogContent className="max-w-4xl p-0">
                <DialogTitle className="sr-only">Visit photograph</DialogTitle>
                <VisitRecord task={t} location={l} employee={e} />
              </DialogContent>
            </Dialog>
            <Dialog open={!!overrideStage} onOpenChange={(o) => !o && setOverrideStage(null)}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Override {overrideStage === "checkin" ? "Check-In" : "Check-Out"}</DialogTitle>
                  <DialogDescription>Mark this stage verified without GPS or photo. The employee will be able to continue with their next visit.</DialogDescription>
                </DialogHeader>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">Reason / justification <span className="text-danger">*</span></span>
                  <Textarea rows={3} value={reason} onChange={(ev) => setReason(ev.target.value.slice(0, 300))} placeholder="e.g. GPS unavailable at site, verified by station master" />
                </label>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOverrideStage(null)}>Cancel</Button>
                  <Button onClick={doOverride} disabled={reason.trim().length < 10}>Confirm Override</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Delete this visit?</DialogTitle>
                  <DialogDescription>{l.name} — {e?.name ?? t.employeeId}, {fmtDate(t.date)}. The visit is removed from all lists; a copy is kept in history.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={doDelete}>Delete Visit</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : <div className="p-6 text-sm text-muted-foreground">Visit record not found.</div>}
      </SheetContent>
    </Sheet>
  );
}

export function PhotoLightbox({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const db = useDB();
  const t = db.tasks.find((x) => x.id === taskId);
  const l = t && db.locations.find((x) => x.id === t.locationId);
  const e = t && db.employees.find((x) => x.id === t.employeeId);
  return (
    <Dialog open={!!taskId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl p-0">
        <DialogTitle className="sr-only">Visit photograph</DialogTitle>
        {t && l && <VisitRecord task={t} location={l} employee={e} />}
      </DialogContent>
    </Dialog>
  );
}
