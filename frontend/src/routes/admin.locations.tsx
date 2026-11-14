import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Crosshair, Loader2, MapPin, Pencil, Download, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { EmptyState, Field, KV, PageHeader, StatusBadge, ToneBadge } from "@/components/rt/common";
import { MapView } from "@/components/rt/MapView";
import { PlaceSearch } from "@/components/rt/PlaceSearch";
import { useTaskDrawer } from "@/components/rt/drawerContext";
import { useDB } from "@/hooks/useDB";
import { locationService, type LocationInput } from "@/services/locationService";
import { exportLocationVisitsCsv, exportLocationsCsv } from "@/services/reportService";
import { getBestPosition } from "@/services/verificationService";
import { taskStats } from "@/services/taskService";
import { fmtCoord, fmtDate, fmtDateTime } from "@/lib/format";
import type { VisitLocation } from "@/types";
import { RADIUS_OPTIONS } from "@/lib/visitRules";

export const Route = createFileRoute("/admin/locations")({
  head: () => ({ meta: [{ title: "Locations — Inspector Tracking System" }, { name: "description", content: "Manage visit locations." }, { property: "og:title", content: "Locations — Inspector Tracking System" }, { property: "og:description", content: "Manage visit locations." }] }),
  component: Locations,
});

const blank = (): LocationInput => ({ name: "", description: "", address: "", lat: NaN, lng: NaN, type: "Junction Station", status: "active", verificationRadius: 100 });

function Locations() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [form, setForm] = useState<{ id?: string; data: LocationInput } | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const rows = useMemo(() => db.locations
    .filter((l) => !q || [l.name, l.address].some((v) => v.toLowerCase().includes(q.toLowerCase())))
    .filter((l) => type === "all" || l.type === type)
    .sort((a, b) => a.name.localeCompare(b.name)), [db.locations, q, type]);

  return (
    <div>
      <PageHeader title="Locations" subtitle={`${db.locations.length} visit locations`} actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportLocationsCsv(db, rows)} disabled={rows.length === 0}><Download className="mr-1.5 h-4 w-4" />Download CSV</Button>
          <Button onClick={() => setForm({ data: blank() })}><Plus className="mr-1.5 h-4 w-4" />Add Location</Button>
        </div>
      } />
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="rounded-lg border bg-card shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-2 border-b p-3 sm:flex-row">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search locations…" className="pl-9" /></div>
            <Select value={type} onValueChange={setType}><SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem>{db.locationTypes.map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent></Select>
          </div>
          {rows.length === 0 ? <EmptyState title="No locations found" /> : (
            <ul className="divide-y">
              {rows.map((l) => {
                const st = taskStats(db.tasks.filter((t) => t.locationId === l.id));
                return (
                  <li key={l.id}>
                    <button onClick={() => setDetail(l.id)} className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-muted/40">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground"><MapPin className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1"><span className="block font-medium">{l.name}</span><span className="block truncate text-xs text-muted-foreground">{l.type} · <span className="font-medium text-foreground/80">{l.verificationRadius ?? 100} m radius</span> · {l.address}</span></span>
                      <span className="hidden text-right text-xs text-muted-foreground sm:block"><span className="block font-mono">{fmtCoord(l.lat)}, {fmtCoord(l.lng)}</span><span>{st.total} visits · {st.verified} completed · radius {l.verificationRadius ?? 100} m</span></span>
                      <ToneBadge tone={l.status === "active" ? "success" : "neutral"}>{l.status === "active" ? "Active" : "Inactive"}</ToneBadge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="rounded-lg border bg-card p-2 shadow-[var(--shadow-card)]">
          <MapView className="h-[520px] w-full rounded-md" fitKey={String(rows.length)} markers={rows.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, color: "var(--primary)", label: l.name }))} onMarkerClick={setDetail} />
        </div>
      </div>
      {form && <LocationForm id={form.id} initial={form.data} onClose={() => setForm(null)} />}
      <LocationDetail id={detail} onClose={() => setDetail(null)} onEdit={(l) => { setDetail(null); setForm({ id: l.id, data: { ...l } }); }} />
    </div>
  );
}

function LocationDetail({ id, onClose, onEdit }: { id: string | null; onClose: () => void; onEdit: (l: VisitLocation) => void }) {
  const db = useDB();
  const drawer = useTaskDrawer();
  const l = db.locations.find((x) => x.id === id);
  const tasks = db.tasks.filter((t) => t.locationId === id).sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
  const st = taskStats(tasks);
  const last = tasks.find((t) => t.status === "verified");
  return (
    <Sheet open={!!l} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {l && (<>
          <SheetHeader className="text-left"><SheetTitle>{l.name}</SheetTitle><SheetDescription>{l.type}</SheetDescription></SheetHeader>
          <div className="mt-4 space-y-4">
            <MapView className="h-52 w-full rounded-md border" fitKey={l.id} zoom={15} markers={[{ id: l.id, lat: l.lat, lng: l.lng, color: "var(--primary)", label: l.name, radius: l.verificationRadius ?? 100 }]} />
            <div className="grid grid-cols-3 gap-2 text-center">{[["Assigned", st.total], ["Completed", st.verified], ["Pending", st.pending]].map(([k, v]) => <div key={k} className="rounded-md border p-2"><div className="text-lg font-semibold tabular">{v}</div><div className="text-[11px] text-muted-foreground">{k}</div></div>)}</div>
            <div className="divide-y">
              <KV k="Address" v={<span className="inline-block max-w-[260px]">{l.address}</span>} />
              <KV k="Coordinates" v={`${fmtCoord(l.lat)}, ${fmtCoord(l.lng)}`} mono />
              <KV k="Verification radius" v={`${l.verificationRadius ?? 100} m`} />
              <KV k="Last visit" v={last ? fmtDateTime(last.verifiedAt) : "—"} />
              <KV k="Last verified by" v={last ? db.employees.find((e) => e.id === last.employeeId)?.name ?? last.employeeId : "—"} />
            </div>
            {l.description && <p className="rounded-md bg-muted px-3 py-2 text-sm">{l.description}</p>}
            <Button variant="outline" onClick={() => onEdit(l)}><Pencil className="mr-2 h-4 w-4" />Edit Location</Button>
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visit history</h3>
                {tasks.length > 0 && <Button size="sm" variant="outline" onClick={() => exportLocationVisitsCsv(db, l)}><FileDown className="mr-1.5 h-3.5 w-3.5" />Download Visits History</Button>}
              </div>
              {tasks.length === 0 ? <p className="text-sm text-muted-foreground">No visits assigned yet.</p> : (
                <ul className="divide-y rounded-md border">{tasks.slice(0, 12).map((t) => (
                  <li key={t.id}><button onClick={() => drawer.open(t.id)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/40"><span><span className="block">{db.employees.find((e) => e.id === t.employeeId)?.name}</span><span className="text-xs text-muted-foreground">{fmtDate(t.date)}</span></span><StatusBadge status={t.status} /></button></li>
                ))}</ul>
              )}
            </div>
          </div>
        </>)}
      </SheetContent>
    </Sheet>
  );
}

function LocationForm({ id, initial, onClose }: { id?: string; initial: LocationInput; onClose: () => void }) {
  const db = useDB();
  const [d, setD] = useState(initial);
  const [err, setErr] = useState("");
  const [locating, setLocating] = useState(false);
    const [radiusMode, setRadiusMode] = useState<string>(
    RADIUS_OPTIONS.includes(initial.verificationRadius)
      ? String(initial.verificationRadius)
      : "custom"
  );
  const set = <K extends keyof LocationInput>(k: K, v: LocationInput[K]) => setD((p) => ({ ...p, [k]: v }));
  const hasPt = Number.isFinite(d.lat) && Number.isFinite(d.lng);
   async function useCurrent() {
    setLocating(true);
    try {
      const f = await getBestPosition({
        samples: 5,
        maxWaitMs: 20000,
        desiredAccuracyM: 25,
      });
      setD((p) => ({
        ...p,
        lat: +f.lat.toFixed(6),
        lng: +f.lng.toFixed(6),
      }));
      toast.success(
        `Location captured${f.accuracy != null ? ` (±${f.accuracy} m)` : ""}.`
      );
      if (f.accuracy != null && f.accuracy > 50) {
        toast.message(
          "GPS accuracy is still low. Stand outdoors and try again if the pin looks wrong."
        );
      }
    } catch (x) {
      toast.error((x as Error).message);
    } finally {
      setLocating(false);
    }
  }
  async function save() {
    setErr("");
    try {
      if (id) await locationService.update(id, d);
      else await locationService.create(d);
      toast.success(id ? "Location updated." : `${d.name} added.`);
      onClose();
    } catch (x) {
      setErr((x as Error).message);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{id ? "Edit Location" : "Add Location"}</DialogTitle><DialogDescription>Set coordinates by typing them, using your current position, or clicking on the map.</DialogDescription></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <Field label="Location Name"><Input value={d.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Location Type"><Select value={d.type} onValueChange={(v) => set("type", v as LocationInput["type"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{db.locationTypes.map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Address"><Input value={d.address} onChange={(e) => set("address", e.target.value)} /></Field>
            <Field label="Description"><Textarea rows={3} value={d.description} onChange={(e) => set("description", e.target.value)} /></Field>
                        <Field label="Verification Radius (meters)">
              <div className="flex gap-2">
                <Select
                  value={radiusMode}
                  onValueChange={(v) => {
                    setRadiusMode(v);
                    if (v !== "custom") {
                      set("verificationRadius", Number(v));
                    }
                  }}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RADIUS_OPTIONS.map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {r} m
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>

                {radiusMode === "custom" && (
                  <Input
                    type="number"
                    min={10}
                    max={2000}
                    value={Number.isFinite(d.verificationRadius) ? d.verificationRadius : ""}
                    onChange={(e) =>
                      set(
                        "verificationRadius",
                        e.target.value === "" ? NaN : Number(e.target.value)
                      )
                    }
                    className="w-28 font-mono"
                    aria-label="Custom radius in metres"
                    placeholder="e.g. 150"
                  />
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Employees must be within this distance of the pin to check in and check out.
                Choose Custom to enter any value between 10 and 2000 m.
              </p>
            </Field>
            <Field label="Status"><Select value={d.status} onValueChange={(v) => set("status", v as LocationInput["status"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></Field>
          </div>
          <div className="space-y-3">
            <PlaceSearch onSelect={(p) => setD((prev) => ({
              ...prev,
              lat: p.lat,
              lng: p.lng,
              name: prev.name.trim() ? prev.name : p.name,
              address: prev.address.trim() ? prev.address : p.address,
            }))} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Latitude"><Input inputMode="decimal" value={Number.isFinite(d.lat) ? d.lat : ""} onChange={(e) => set("lat", e.target.value === "" ? NaN : Number(e.target.value))} className="font-mono" /></Field>
              <Field label="Longitude"><Input inputMode="decimal" value={Number.isFinite(d.lng) ? d.lng : ""} onChange={(e) => set("lng", e.target.value === "" ? NaN : Number(e.target.value))} className="font-mono" /></Field>
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={useCurrent} disabled={locating}>{locating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crosshair className="mr-2 h-4 w-4" />}Use Current Location</Button>
            <MapView className="h-64 w-full rounded-md border" zoom={hasPt ? 16 : 11} fitKey={hasPt ? `pt-${d.lat}-${d.lng}` : "none"} markers={hasPt ? [{ id: "p", lat: d.lat, lng: d.lng, color: "var(--primary)", label: "Selected point" }] : []} onMapClick={(lat, lng) => setD((p) => ({ ...p, lat: +lat.toFixed(6), lng: +lng.toFixed(6) }))} />
            <p className="text-xs text-muted-foreground">Search for a place, click anywhere on the map, or use your current location to set the coordinates.</p>
          </div>
        </div>
        {err && <p className="rounded-md border border-danger/30 bg-danger/8 px-3 py-2 text-sm text-danger">{err}</p>}
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>{id ? "Save Changes" : "Add Location"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
