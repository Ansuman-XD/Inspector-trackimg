/** Branding constants and print helpers for the Inspector Tracking System. */
import type { DB } from "@/types";
import type { ReportFilterFlags } from "./branding-types";

export const BRAND = "Inspector Tracking System";
export const BRAND_SHORT = "Inspector Track";

/** Human-readable summary of the active report filters, used on printed output. */
export function printFilterSummary(f: ReportFilterFlags, db: DB): string {
  const parts: string[] = [];
  if (f.from || f.to) parts.push(`Dates ${f.from || "any"} – ${f.to || "any"}`);
  if (f.planning) parts.push(f.planning === "self" ? "Self-planned" : "Admin-assigned");
  if (f.checkInBy) parts.push(f.checkInBy === "admin" ? "Check-in: Admin Override" : "Check-in: Employee");
  if (f.checkOutBy) parts.push(f.checkOutBy === "admin" ? "Check-out: Admin Override" : "Check-out: Employee");
  if (f.employeeId) parts.push(`Employee: ${db.employees.find((e) => e.id === f.employeeId)?.name ?? f.employeeId}`);
  if (f.department) parts.push(`Department: ${f.department}`);
  if (f.locationId) parts.push(`Location: ${db.locations.find((l) => l.id === f.locationId)?.name ?? f.locationId}`);
  if (f.status) parts.push(`Status: ${f.status}`);
  return parts.length ? parts.join(" · ") : "No filters applied — all records";
}
