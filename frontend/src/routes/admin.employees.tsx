import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, MoreHorizontal, Pencil, Eye, UserX, UserCheck, Trash2, ArrowUpDown, Upload, EyeOff, Download, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, EmptyState, Field, KV, PageHeader, ToneBadge } from "@/components/rt/common";
import { useDB } from "@/hooks/useDB";
import { employeeService, type EmployeeInput } from "@/services/employeeService";
import { exportEmployeesCsv } from "@/services/reportService";
import { taskStats } from "@/services/taskService";
import { downloadEmployeeWorkHistory } from "@/lib/pdf";
import { fmtDate, fmtPhone, todayISO } from "@/lib/format";
import type { Employee } from "@/types";

export const Route = createFileRoute("/admin/employees")({
  head: () => ({ meta: [{ title: "Employees — Inspector Tracking System" }, { name: "description", content: "Manage field employees." }, { property: "og:title", content: "Employees — Inspector Tracking System" }, { property: "og:description", content: "Manage field employees." }] }),
  component: Employees,
});

const PAGE = 8;
const blank = (): EmployeeInput => ({ id: "", name: "", phone: "", email: "", department: "", designation: "", joiningDate: todayISO(), status: "active", password: "" });

function Employees() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<{ k: keyof Employee; dir: 1 | -1 }>({ k: "id", dir: 1 });
  const [page, setPage] = useState(0);
  const [form, setForm] = useState<{ mode: "add" | "edit"; data: EmployeeInput } | null>(null);
  const [view, setView] = useState<Employee | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "delete" | "status"; e: Employee } | null>(null);
  const [history, setHistory] = useState<Employee | null>(null);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.employees
      .filter((e) => !s || [e.name, e.id, e.phone, e.email, e.designation].some((v) => v.toLowerCase().includes(s)))
      .filter((e) => dept === "all" || e.department === dept)
      .filter((e) => status === "all" || e.status === status)
      .sort((a, b) => String(a[sort.k] ?? "").localeCompare(String(b[sort.k] ?? "")) * sort.dir);
  }, [db.employees, q, dept, status, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);
  const th = (k: keyof Employee, label: string) => (
    <th className="px-4 py-2.5 font-medium"><button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : 1 }))}>{label}<ArrowUpDown className="h-3 w-3" /></button></th>
  );

  return (
    <div>
      <PageHeader title="Employees" subtitle={`${db.employees.length} registered · ${db.employees.filter((e) => e.status === "active").length} active`} actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportEmployeesCsv(db, rows)} disabled={rows.length === 0}><Download className="mr-1.5 h-4 w-4" />Download CSV</Button>
          <Button onClick={() => setForm({ mode: "add", data: blank() })}><Plus className="mr-1.5 h-4 w-4" />Add Employee</Button>
        </div>
      } />
      <div className="rounded-lg border bg-card shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-2 border-b p-3 md:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search name, ID, phone, email…" className="pl-9" /></div>
          <Select value={dept} onValueChange={(v) => { setDept(v); setPage(0); }}><SelectTrigger className="md:w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All departments</SelectItem>{db.departments.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent></Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}><SelectTrigger className="md:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
        </div>
        {shown.length === 0 ? <EmptyState title="No employees match your filters" text="Try a different search or clear the filters." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr>{th("name", "Employee")}{th("id", "Employee ID")}{th("department", "Department")}<th className="px-4 py-2.5 font-medium">Phone</th>{th("joiningDate", "Joined")}{th("status", "Status")}<th /></tr></thead>
              <tbody>
                {shown.map((e) => (
                  <tr key={e.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2.5"><button onClick={() => setView(e)} className="flex items-center gap-3 text-left"><Avatar name={e.name} photo={e.photo} size={32} /><span><span className="block font-medium">{e.name}</span><span className="block text-xs text-muted-foreground">{e.designation}</span></span></button></td>
                    <td className="px-4 py-2.5 font-mono text-xs">{e.id}</td>
                    <td className="px-4 py-2.5">{e.department}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular">{fmtPhone(e.phone)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{fmtDate(e.joiningDate)}</td>
                    <td className="px-4 py-2.5"><ToneBadge tone={e.status === "active" ? "success" : "neutral"}>{e.status === "active" ? "Active" : "Inactive"}</ToneBadge></td>
                    <td className="px-2 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="rounded p-1.5 hover:bg-muted" aria-label="Actions"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setView(e)}><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setForm({ mode: "edit", data: { ...e, password: employeeService.passwordOf(e.id) } })}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setConfirm({ kind: "status", e })}>{e.status === "active" ? <><UserX className="mr-2 h-4 w-4" />Deactivate</> : <><UserCheck className="mr-2 h-4 w-4" />Reactivate</>}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setHistory(e)}><FileDown className="mr-2 h-4 w-4" />Download Work History</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-danger" onClick={() => setConfirm({ kind: "delete", e })}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t px-4 py-2.5 text-xs text-muted-foreground">
          <span>Showing {rows.length ? page * PAGE + 1 : 0}–{Math.min(rows.length, (page + 1) * PAGE)} of {rows.length}</span>
          <div className="flex gap-1"><Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</Button></div>
        </div>
      </div>

      {form && <EmployeeForm mode={form.mode} initial={form.data} onClose={() => setForm(null)} />}

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent>
          {view && (() => {
            const st = taskStats(db.tasks.filter((t) => t.employeeId === view.id));
            return (<>
              <DialogHeader><div className="flex items-center gap-3"><Avatar name={view.name} photo={view.photo} size={52} /><div><DialogTitle>{view.name}</DialogTitle><DialogDescription>{view.designation} · {view.department}</DialogDescription></div></div></DialogHeader>
              <div className="grid grid-cols-4 gap-2 text-center">{[["Visits", st.total], ["Verified", st.verified], ["Open", st.pending], ["Missed", st.missed + st.failed]].map(([k, v]) => <div key={k} className="rounded-md border p-2"><div className="text-lg font-semibold tabular">{v}</div><div className="text-[11px] text-muted-foreground">{k}</div></div>)}</div>
              <div className="divide-y"><KV k="Employee ID" v={view.id} mono /><KV k="Phone" v={fmtPhone(view.phone)} /><KV k="Email" v={view.email} /><KV k="Joining date" v={fmtDate(view.joiningDate)} /><KV k="Status" v={view.status === "active" ? "Active" : "Inactive"} /></div>
            </>);
          })()}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.kind === "delete" ? `Delete ${confirm.e.name}?` : confirm?.e.status === "active" ? `Deactivate ${confirm?.e.name}?` : `Reactivate ${confirm?.e.name}?`}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.kind === "delete" ? "The employee record and sign-in access will be permanently removed. Past visit records are retained." : confirm?.e.status === "active" ? "The employee will no longer be able to sign in or receive new visits." : "The employee will regain access and can be assigned visits."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className={confirm?.kind === "delete" ? "bg-destructive hover:bg-destructive/90" : ""} onClick={async () => {
              if (!confirm) return;
              try {
                if (confirm.kind === "delete") { await employeeService.remove(confirm.e.id); toast.success("Employee deleted."); }
                else { await employeeService.setStatus(confirm.e.id, confirm.e.status === "active" ? "inactive" : "active"); toast.success("Employee status updated."); }
              } catch (x) { toast.error((x as Error).message); }
            }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>

        </AlertDialogContent>
      </AlertDialog>

      {history && <WorkHistoryDialog employee={history} onClose={() => setHistory(null)} />}
    </div>
  );
}

function WorkHistoryDialog({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const db = useDB();
  const [mode, setMode] = useState<"all" | "range">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Download Work History</DialogTitle>
          <DialogDescription>Branded PDF work history for {employee.name} ({employee.id}).</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
          <button type="button" onClick={() => setMode("all")} className={`rounded-md py-1.5 text-sm ${mode === "all" ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>All Time</button>
          <button type="button" onClick={() => setMode("range")} className={`rounded-md py-1.5 text-sm ${mode === "range" ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>Date Range</button>
        </div>
        {mode === "range" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="From Date"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="To Date"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Every scheduled visit on record will be included.</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => { downloadEmployeeWorkHistory(db, employee, mode === "range" ? from : "", mode === "range" ? to : ""); onClose(); }}
            disabled={mode === "range" && (!from || !to)}
          >
            <FileDown className="mr-1.5 h-4 w-4" />Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmployeeForm({ mode, initial, onClose }: { mode: "add" | "edit"; initial: EmployeeInput; onClose: () => void }) {
  const db = useDB();
  const [d, setD] = useState(initial);
  const [err, setErr] = useState("");
  const [showPw, setShowPw] = useState(false);
  const set = <K extends keyof EmployeeInput>(k: K, v: EmployeeInput[K]) => setD((p) => ({ ...p, [k]: v }));
  function photo(f: File) {
    const img = new Image();
    img.onload = () => { const c = document.createElement("canvas"); c.width = c.height = 160; const s = Math.min(img.width, img.height); c.getContext("2d")!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 160, 160); set("photo", c.toDataURL("image/jpeg", 0.8)); };
    img.src = URL.createObjectURL(f);
  }
  async function save() {
    setErr("");
    try {
      if (mode === "add") await employeeService.create(d);
      else await employeeService.update(initial.id, d);
      toast.success(mode === "add" ? `${d.name} added. They can now sign in with the password you set.` : "Employee updated.");
      onClose();
    } catch (x) {
      setErr((x as Error).message);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{mode === "add" ? "Add Employee" : "Edit Employee"}</DialogTitle><DialogDescription>{mode === "add" ? "The employee signs in with this Employee ID and password." : `Editing ${initial.id} — change the password to reset their login.`}</DialogDescription></DialogHeader>
        <div className="flex items-center gap-4">
          <Avatar name={d.name || "?"} photo={d.photo} size={56} />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"><Upload className="h-4 w-4" />Profile photo<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && photo(e.target.files[0])} /></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name"><Input value={d.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Employee ID"><Input value={d.id} disabled={mode === "edit"} onChange={(e) => set("id", e.target.value.toUpperCase())} placeholder="EMP010" className="font-mono" /></Field>
          <Field label="Phone"><Input value={d.phone} onChange={(e) => set("phone", e.target.value)} placeholder="98XXXXXXXX" inputMode="tel" /></Field>
          <Field label="Email"><Input type="email" value={d.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Department"><Select value={d.department} onValueChange={(v) => set("department", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{db.departments.map((x) => <SelectItem key={x.id} value={x.name}>{x.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Designation"><Input value={d.designation} onChange={(e) => set("designation", e.target.value)} /></Field>
          <Field label="Joining Date"><Input type="date" value={d.joiningDate} onChange={(e) => set("joiningDate", e.target.value)} /></Field>
          <Field label="Login Password">
            <div className="relative">
              <Input type={showPw ? "text" : "password"} value={d.password ?? ""} onChange={(e) => set("password", e.target.value)} placeholder="Min. 6 characters" className="pr-10" autoComplete="new-password" />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted" aria-label={showPw ? "Hide password" : "Show password"}>{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
          </Field>
          <Field label="Status"><Select value={d.status} onValueChange={(v) => set("status", v as Employee["status"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></Field>
        </div>
        {err && <p className="rounded-md border border-danger/30 bg-danger/8 px-3 py-2 text-sm text-danger">{err}</p>}
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>{mode === "add" ? "Add Employee" : "Save Changes"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
