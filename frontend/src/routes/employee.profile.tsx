// import { createFileRoute } from "@tanstack/react-router";
// import { LogOut } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Avatar, KV } from "@/components/rt/common";
// import { useEmployeeSession } from "@/components/rt/employeeContext";
// import { useDB } from "@/hooks/useDB";
// import { fmtDate, fmtPhone } from "@/lib/format";
// import { OrgCorners, ORG } from "@/components/rt/OrgLogos";


// export const Route = createFileRoute("/employee/profile")({
//   head: () => ({ meta: [{ title: "Profile — Inspector Tracking System" }, { name: "description", content: "Employee profile details." }] }),
//   component: Profile,
// });

// function Profile() {
//   const db = useDB();
//   const { session, logout } = useEmployeeSession();
//   const e = db.employees.find((x) => x.id === session.userId);
//   return (
//     <div className="space-y-4">
//       <div className="flex items-center gap-3 rounded-lg border bg-card p-4"><Avatar name={session.name} photo={e?.photo} size={56} /><div><p className="font-semibold">{session.name}</p><p className="text-sm text-muted-foreground">{e?.designation}</p></div></div>
//       {e && <div className="grid gap-3 rounded-lg border bg-card p-4">
//         <KV k="Employee ID" v={e.id} mono /><KV k="Department" v={e.department} /><KV k="Phone" v={fmtPhone(e.phone)} /><KV k="Email" v={e.email} /><KV k="Joined" v={fmtDate(e.joiningDate)} />
//       </div>}
//       <Button variant="outline" className="w-full" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
//      <div className="rounded-lg border bg-card p-4">
//   <OrgCorners size={38} />
//   <p className="mt-3 text-center text-xs text-muted-foreground">{ORG.name} · {ORG.branch}</p>
// </div>
//     </div>
    
//   );
// }

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LogOut, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, KV } from "@/components/rt/common";
import { useEmployeeSession } from "@/components/rt/employeeContext";
import { useDB } from "@/hooks/useDB";
import { fmtDate, fmtPhone } from "@/lib/format";
import { OrgCorners, ORG } from "@/components/rt/OrgLogos";
import { HelpDialog } from "@/components/rt/HelpDialog";

export const Route = createFileRoute("/employee/profile")({
  head: () => ({ meta: [{ title: "Profile — Inspector Tracking System" }, { name: "description", content: "Employee profile details." }] }),
  component: Profile,
});

function Profile() {
  const db = useDB();
  const { session, logout } = useEmployeeSession();
  const [helpOpen, setHelpOpen] = useState(false);
  const e = db.employees.find((x) => x.id === session.userId);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border bg-card p-4"><Avatar name={session.name} photo={e?.photo} size={56} /><div><p className="font-semibold">{session.name}</p><p className="text-sm text-muted-foreground">{e?.designation}</p></div></div>
      {e && <div className="grid gap-3 rounded-lg border bg-card p-4">
        <KV k="Employee ID" v={e.id} mono /><KV k="Department" v={e.department} /><KV k="Phone" v={fmtPhone(e.phone)} /><KV k="Email" v={e.email} /><KV k="Joined" v={fmtDate(e.joiningDate)} />
      </div>}
      <Button variant="outline" className="w-full" onClick={() => setHelpOpen(true)}>
        <HelpCircle className="mr-2 h-4 w-4" />Help
      </Button>
      <Button variant="outline" className="w-full" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
      <div className="rounded-lg border bg-card p-4">
        <OrgCorners size={38} />
        <p className="mt-3 text-center text-xs text-muted-foreground">{ORG.name} · {ORG.branch}</p>
      </div>
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} role="employee" />
    </div>
  );
}
