import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { ADMIN_HELP, EMPLOYEE_HELP } from "@/lib/helpContent";

export function HelpDialog({ open, onOpenChange, role }: { open: boolean; onOpenChange: (v: boolean) => void; role: "admin" | "employee" }) {
  const [q, setQ] = useState("");
  useEffect(() => {
  document.body.classList.toggle("help-open", open);
  return () => document.body.classList.remove("help-open");
}, [open]);
  const sections = useMemo(() => {
    const all = role === "admin" ? ADMIN_HELP : EMPLOYEE_HELP;
    const s = q.trim().toLowerCase();
    if (!s) return all;
    return all
      .map((sec) => ({ ...sec, items: sec.items.filter((i) => (i.q + " " + i.a).toLowerCase().includes(s)) }))
      .filter((sec) => sec.items.length > 0);
  }, [role, q]);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setQ(""); }}>
      <DialogContent className="no-scrollbar max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role === "admin" ? "Admin Help" : "Employee Help"}</DialogTitle>
          <DialogDescription>Questions and answers for every part of this panel.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help…" className="pl-9" />
        </div>
        {sections.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No matching help topics.</p>}
        {sections.map((sec, si) => (
          <div key={sec.title}>
            <h3 className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{sec.title}</h3>
            <Accordion type="single" collapsible>
              {sec.items.map((it, qi) => (
                <AccordionItem key={qi} value={`${si}-${qi}`}>
                  <AccordionTrigger>{it.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{it.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
}