export type Role = "admin" | "employee";

export interface User {
  id: string; // login ID e.g. ADMIN001 / EMP001
  name: string;
  role: Role;
  password: string;
  email: string;
  lastLogin?: string;
}

export type EmployeeStatus = "active" | "inactive";

export interface Employee {
  id: string; // employee ID
  name: string;
  phone: string;
  email: string;
  department: string;
  designation: string;
  joiningDate: string; // yyyy-mm-dd
  status: EmployeeStatus;
  photo?: string;
  createdAt: string;
}

/** Managed by admins under Admin → Location Types. */
export type LocationType = string;

export interface VisitLocation {
  id: string;
  name: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  type: LocationType;
  status: "active" | "inactive";
  /** Allowed GPS distance (metres) for check-in / check-out at this site. */
  verificationRadius: number;
  createdAt: string;
}

export type TaskStatus =
  | "assigned"
  | "in_progress"
  | "location_reached"
  | "checked_in"
  | "verified"
  | "pending"
  | "not_visited"
  | "verification_failed"
  | "expired";

export type Priority = "high" | "medium" | "low";

export interface GpsAttempt {
  at: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  distance: number;
  passed: boolean;
  demo: boolean;
}

export interface Task {
  id: string;
  employeeId: string;
  locationId: string;
  date: string; // yyyy-mm-dd
  startTime: string; // HH:mm or "" (any time)
  endTime: string; // HH:mm or "" (end of day)
  priority: Priority;
  instructions: string;
  status: TaskStatus;
  createdAt: string;
  createdBy: string;
  startedAt?: string;
  reachedAt?: string;
  verifiedAt?: string;
  employeeLatitude?: number;
  employeeLongitude?: number;
  gpsAccuracy?: number | null;
  distanceFromLocation?: number;
  photo?: string;
  photoTimestamp?: string;
  verificationStatus?: "verified" | "failed" | "none";
  gpsDemo?: boolean;
  attempts: GpsAttempt[];
  checkIn?: VisitStage;
  checkOut?: VisitStage;
  overriddenByAdmin?: boolean;
  adminOverrideReason?: string;
  adminOverrideTimestamp?: string;
  important?: boolean;
}

/** One verified stage of a visit (check-in or check-out). */
export interface VisitStage {
  at: string;
  lat?: number;
  lng?: number;
  accuracy?: number | null;
  distance?: number;
  photo?: string;
  photoTimestamp?: string;
  demo?: boolean;
  override?: { reason: string; at: string; by: string };
}

export interface TaskHistoryEntry {
  id: string;
  kind: "replaced" | "cancelled";
  task: Task;
  by: string;
  at: string;
  note: string;
}

export type NotificationType =
  | "task_assigned"
  | "visit_started"
  | "location_verified"
  | "verification_failed"
  | "visit_completed"
  | "deadline_passed";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  audience: "admin" | string; // "admin" or employee id
  taskId?: string;
  read: boolean;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
}

export interface LocationTypeItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  message: string;
  kind: "success" | "info" | "warning" | "danger";
  actor: string;
  createdAt: string;
}

export interface Settings {
  radius: number;
  notifyAssigned: boolean;
  notifyVerified: boolean;
  notifyFailed: boolean;
  notifyDeadline: boolean;
  sessionMinutes: number;
  gpsDemo: { enabled: boolean; mode: "at_location" | "near" | "far" };
}

export interface Session {
  userId: string;
  role: Role;
  name: string;
  createdAt: string;
  expiresAt: string;
  remember: boolean;
}

export interface DB {
  version: number;
  users: User[];
  employees: Employee[];
  departments: Department[];
  locations: VisitLocation[];
  locationTypes: LocationTypeItem[];
  tasks: Task[];
  notifications: AppNotification[];
  activities: Activity[];
  taskHistory: TaskHistoryEntry[];
  settings: Settings;
}
