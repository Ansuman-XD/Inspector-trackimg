import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EmptyState, Field, PageHeader } from "@/components/rt/common";

export interface CatalogItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
}

export type CatalogInput = { name: string; code: string; description?: string };

interface Props {
  title: string;
  subtitle: string;
  items: CatalogItem[];
  usage: (item: CatalogItem) => number;
  usageLabel: string;
  save: (input: CatalogInput, id?: string) => Promise<void> | void;
  remove: (item: CatalogItem) => Promise<void> | void;
  searchPlaceholder: string;
}


const blank = (): CatalogInput => ({ name: "", code: "", description: "" });

export function CatalogManager({ title, subtitle, items, usage, usageLabel, save, remove, searchPlaceholder }: Props) {
  const [q, setQ] = useState("");
  const [form, setForm] = useState<{ id?: string; data: CatalogInput } | null>(null);
  const [confirm, setConfirm] = useState<CatalogItem | null>(null);
  const rows = items.filter((i) => !q || [i.name, i.code, i.description ?? ""].some((v) => v.toLowerCase().includes(q.toLowerCase())));

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={<Button onClick={() => setForm({ data: blank() })}><Plus className="mr-1.5 h-4 w-4" />Add</Button>}
      />
      <div className="rounded-lg border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b p-3">
          <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="pl-9" /></div>
        </div>
        {rows.length === 0 ? <EmptyState title="Nothing here yet" text="Add the first entry to get started." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr>{["Name", "Code", "Description", usageLabel, "Added", ""].map((h) => <th key={h} className="whitespace-nowrap px-4 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{i.name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{i.code}</td>
                    <td className="max-w-[320px] px-4 py-2.5 text-muted-foreground"><span className="block truncate">{i.description || "—"}</span></td>
                    <td className="px-4 py-2.5 tabular">{usage(i)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{new Date(i.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td className="px-2 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setForm({ id: i.id, data: { name: i.name, code: i.code, description: i.description ?? "" } })}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => setConfirm(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t px-4 py-2.5 text-xs text-muted-foreground">Showing {rows.length} of {items.length}</div>
      </div>

      {form && <CatalogForm title={form.id ? `Edit ${title.replace(/s$/, "")}` : `Add ${title.replace(/s$/, "")}`} initial={form.data} onClose={() => setForm(null)} onSave={async (d) => { try { await save(d, form.id); toast.success(form.id ? "Updated." : "Added."); setForm(null); } catch (x) { toast.error((x as Error).message); } }} />}

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{confirm?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>{confirm && usage(confirm) > 0 ? `${usage(confirm)} record(s) still use this. It cannot be deleted until they are moved.` : "This entry will be permanently removed."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={async () => { if (!confirm) return; try { await remove(confirm); toast.success("Deleted."); setConfirm(null); } catch (x) { toast.error((x as Error).message); } }}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CatalogForm({ title, initial, onClose, onSave }: { title: string; initial: CatalogInput; onClose: () => void; onSave: (d: CatalogInput) => void }) {
  const [d, setD] = useState(initial);
  const [err, setErr] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Name and code must be unique.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <Field label="Name"><Input value={d.name} onChange={(e) => setD((p) => ({ ...p, name: e.target.value }))} /></Field>
          <Field label="Code"><Input value={d.code} onChange={(e) => setD((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. CEN" className="font-mono" /></Field>
          <Field label="Description (optional)"><Textarea rows={2} value={d.description ?? ""} onChange={(e) => setD((p) => ({ ...p, description: e.target.value }))} /></Field>
          {err && <p className="rounded-md border border-danger/30 bg-danger/8 px-3 py-2 text-sm text-danger">{err}</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => { setErr(""); if (!d.name.trim() || !d.code.trim()) { setErr("Enter a name and code."); return; } onSave(d); }}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
