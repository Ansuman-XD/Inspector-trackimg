
import rdsoLogo from "@/assets/rdso-logo.webp";
import irLogo from "@/assets/indian-railways-logo.webp";
import { cn } from "@/lib/utils";

export const ORG = {
  name: "Research Designs & Standards Organisation",
  short: "RDSO",
  ministry: "Ministry of Railways · Government of India",
  branch: "Kolkata Branch Office",
  branchAddress: "Koilaghat Street, Kolkata – 700 001",
  hq: "Head Office: Manak Nagar, Lucknow – 226 011",
};



export function RdsoLogo({ size = 52, className }: { size?: number; className?: string }) {
  return (
    <img
      src={rdsoLogo}
      alt="RDSO"
      style={{ height: size }}
      className={cn("w-auto object-contain", className)}
    />
  );
}

export function IrLogo({ size = 52, className }: { size?: number; className?: string }) {
  return (
    <img
      src={irLogo}
      alt="Indian Railways"
      style={{ height: size }}
      className={cn("w-auto object-contain", className)}
    />
  );
}

/** RDSO (left) + Indian Railways (right), side by side, no box. */
export function OrgLogos({ size = 52, className }: { size?: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <RdsoLogo size={size} />
      <span className="h-10 w-px bg-border" aria-hidden />
      <IrLogo size={size} />
    </div>
  );
}

/** RDSO at the far left, Indian Railways at the far right of the row. */
export function OrgCorners({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <div className={cn("flex w-full items-center justify-between", className)}>
      <RdsoLogo size={size} />
      <IrLogo size={size} />
    </div>
  );
}

/** Slim top strip for the employee mobile app: RDSO left, name centre, Railways right. */
export function OrgStrip() {
  return (
    <div className="flex items-center justify-between gap-2 border-b bg-card px-4 py-2">
      <RdsoLogo size={30} />
      <div className="min-w-0 text-center leading-tight">
        <p className="truncate text-[11px] font-semibold">{ORG.name}</p>
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{ORG.branch}</p>
      </div>
      <IrLogo size={36} />
    </div>
  );
}