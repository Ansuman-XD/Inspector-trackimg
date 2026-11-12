import type { TaskStatus } from "@/types";

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

export const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  assigned: { label: "Assigned", tone: "info" },
  in_progress: { label: "In Progress", tone: "info" },
  location_reached: { label: "Location Reached", tone: "info" },
  checked_in: { label: "Checked In", tone: "info" },
  verified: { label: "Completed", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  not_visited: { label: "Not Visited", tone: "danger" },
  verification_failed: { label: "Verification Failed", tone: "danger" },
  expired: { label: "Expired", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const ALL_STATUSES = Object.keys(STATUS_META) as TaskStatus[];

export function markerColor(s: TaskStatus) {
  if (s === "verified") return "var(--success)";
  if (s === "pending" || s === "in_progress" || s === "location_reached" || s === "checked_in") return "var(--warning)";
  if (s === "not_visited" || s === "verification_failed" || s === "expired" || (s as any) === "cancelled") return "var(--danger)";
  return "var(--info)";
}

