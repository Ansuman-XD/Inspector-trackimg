import type { Activity, AppNotification, DB, Department, Employee, LocationTypeItem, Priority, Task, TaskStatus, User, VisitLocation } from "@/types";
import { addDaysISO, taskDateTime, todayISO } from "@/lib/format";
import { haversine } from "./verificationService";

export const DEFAULT_SETTINGS: DB["settings"] = {
  radius: 100,
  notifyAssigned: true,
  notifyVerified: true,
  notifyFailed: true,
  notifyDeadline: true,
  sessionMinutes: 30,
  gpsDemo: { enabled: false, mode: "at_location" },
};

const EMP: [string, string, string, string, string, string][] = [
  ["EMP001", "Rajesh Kumar", "9437012845", "Civil Engineering", "Section Engineer (P.Way)", "2016-07-11"],
  ["EMP002", "Amit Das", "9861234570", "Signal & Telecom", "Junior Engineer (Signal)", "2018-03-02"],
  ["EMP003", "Suresh Pradhan", "9938456120", "Civil Engineering", "Track Inspector", "2014-11-24"],
  ["EMP004", "Priyanka Mohanty", "7008123456", "Operating", "Station Inspector", "2019-06-17"],
  ["EMP005", "Anil Kumar Sahoo", "9777345612", "Mechanical", "Senior Section Engineer (C&W)", "2012-01-09"],
  ["EMP006", "Sasmita Behera", "8249016734", "Electrical", "Junior Engineer (TRD)", "2020-09-01"],
  ["EMP007", "Debasis Nayak", "9124578803", "Safety", "Safety Counsellor", "2015-04-20"],
  ["EMP008", "Manoj Kumar Swain", "9658210047", "Civil Engineering", "Permanent Way Supervisor", "2017-12-05"],
  ["EMP009", "Lipika Rout", "7894561230", "Operating", "Commercial Inspector", "2021-02-15"],
];

const LOC: [string, VisitLocation["type"], number, number, string, string][] = [
  ["Bhubaneswar Railway Station", "Junction Station", 20.266876, 85.843484, "Station Square, Master Canteen, Bhubaneswar, Odisha 751001", "Platform 1–6 amenities, FOB and passenger circulation area inspection."],
  ["Cuttack Railway Station", "Junction Station", 20.468611, 85.899444, "Station Road, Chandni Chowk, Cuttack, Odisha 753003", "Main concourse, booking office and platform surface inspection."],
  ["Khurda Road Junction", "Junction Station", 20.182594, 85.617310, "Jatni, Khurda District, Odisha 752050", "Divisional junction — yard lines, signalling cabin and platform checks."],
  ["Puri Railway Station", "Terminal Station", 19.813210, 85.831512, "Station Road, Puri, Odisha 752001", "Terminal station — pit lines, washing line and passenger amenities."],
  ["Mancheswar Carriage Repair Workshop", "Depot", 20.312730, 85.855620, "Mancheswar Industrial Estate, Bhubaneswar, Odisha 751010", "Coach POH shed, wheel shop and material stores audit."],
  ["East Coast Railway Headquarters", "Other", 20.326310, 85.817540, "Rail Sadan, Chandrasekharpur, Bhubaneswar, Odisha 751017", "Zonal HQ — records and review meeting attendance."],
  ["Divisional Engineering Office, Khurda Road", "Other", 20.179880, 85.614920, "DRM Office Complex, Jatni, Odisha 752050", "Engineering branch — track records and register verification."],
  ["Track Inspection Point KM 432/6", "Track Section", 20.165120, 85.707340, "Near Jatni Outer, Khurda–Bhubaneswar Section, Odisha", "Rail joint, fish plate and ballast profile inspection."],
  ["Level Crossing LC-17 Vani Vihar", "Level Crossing", 20.297850, 85.841260, "Vani Vihar, Bhubaneswar, Odisha 751004", "Manned LC — gate operation, lifting barrier and signage check."],
  ["Khurda Road Diesel Loco Shed", "Depot", 20.187610, 85.624870, "Loco Colony, Jatni, Odisha 752050", "Locomotive maintenance depot — fuel point and safety equipment."],
  ["Barang Junction", "Junction Station", 20.405790, 85.834560, "Barang, Cuttack District, Odisha 754005", "Junction station — point & crossing and relay room inspection."],
  ["Naraj Marthapur Bridge Inspection Point", "Bridge/Culvert", 20.463980, 85.778120, "Naraj, Cuttack District, Odisha 754006", "Mahanadi bridge approach — girder bearings and guard rail check."],
  ["Sakhigopal Railway Station", "Terminal Station", 19.964720, 85.821430, "Sakhigopal, Puri District, Odisha 752014", "Halt station — platform lighting and shelter condition."],
];

const DEPT_SEED: [string, string, string][] = [
  ["Civil Engineering", "CEN", "Track, bridges, works and P.Way maintenance."],
  ["Signal & Telecom", "S&T", "Signalling, telecom and interlocking systems."],
  ["Operating", "OPR", "Station working, commercial and operating branches."],
  ["Electrical", "ELE", "Traction distribution, general services and lighting."],
  ["Security/RPF", "RPF", "Railway Protection Force and security operations."],
  ["Mechanical", "MEC", "Coaching stock, freight and workshop maintenance."],
  ["Safety", "SAF", "Safety counselling, inspections and accident prevention."],
];

const LOCTYPE_SEED: [string, string, string][] = [
  ["Junction Station", "JST", "Major station where multiple routes meet."],
  ["Terminal Station", "TER", "Terminus with pit lines and washing lines."],
  ["Goods Yard", "GDY", "Freight handling, parcels and siding area."],
  ["Signal Cabin", "SGL", "Signal cabin or interlocking installation."],
  ["Bridge/Culvert", "BRG", "Major and minor bridges, culverts and approaches."],
  ["Level Crossing", "LCS", "Manned and unmanned level crossings."],
  ["Track Section", "TRK", "Track inspection stretches and kilometre marks."],
  ["Depot", "DEP", "Loco, carriage and wagon depots or workshops."],
  ["Other", "OTH", "Any other location requiring inspection."],
];

export function buildDepartments(now = new Date()): Department[] {
  return DEPT_SEED.map(([name, code, description]) => ({
    id: `DEP-${code.replace(/\W/g, "")}`, name, code, description,
    createdAt: new Date(now.getTime() - 120 * 864e5).toISOString(),
  }));
}

export function buildLocationTypes(now = new Date()): LocationTypeItem[] {
  return LOCTYPE_SEED.map(([name, code, description]) => ({
    id: `LTP-${code.replace(/\W/g, "")}`, name, code, description,
    createdAt: new Date(now.getTime() - 120 * 864e5).toISOString(),
  }));
}

const INSTR = [
  "Inspect platform surface, coping stones and tactile paving. Report any damage with photograph.",
  "Verify signal aspect visibility and check relay room log book entries.",
  "Check rail joints, fish plates and ballast profile along the marked stretch.",
  "Audit fire extinguishers, first-aid box and emergency contact display.",
  "Verify gate operation, lifting barrier and whistle board condition.",
  "Inspect passenger amenities — drinking water, waiting hall and toilets.",
  "Check overhead equipment clearance and earthing at the marked location.",
  "Review maintenance register and confirm pending work orders on site.",
];

function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSeed(): DB {
  const now = new Date();
  const today = todayISO(now);
  const rand = mulberry(20260927);
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];

  const employees: Employee[] = EMP.map(([id, name, phone, department, designation, joiningDate], i) => ({
    id, name, phone, department, designation, joiningDate,
    email: name.toLowerCase().replace(/[^a-z ]/g, "").split(" ").filter(Boolean).slice(0, 2).join(".") + "@ecor.railnet.gov.in",
    status: i === 8 ? "inactive" : "active",
    createdAt: new Date(joiningDate).toISOString(),
  }));

  const locations: VisitLocation[] = LOC.map(([name, type, lat, lng, address, description], i) => ({
    id: `LOC-${String(i + 1).padStart(3, "0")}`, name, type, lat, lng, address, description,
    status: "active", verificationRadius: i === 7 || i === 11 ? 200 : 100, createdAt: new Date(now.getTime() - 90 * 864e5).toISOString(),
  }));

  const users: User[] = [
    { id: "ADMIN001", name: "Admin User", role: "admin", password: "admin123", email: "admin.ops@ecor.railnet.gov.in" },
    ...employees.map((e) => ({ id: e.id, name: e.name, role: "employee" as const, password: "employee123", email: e.email })),
  ];

  const slots: [string, string][] = [["09:00", "11:00"], ["10:30", "12:30"], ["12:00", "14:00"], ["14:30", "16:30"], ["16:00", "18:00"]];
  const tasks: Task[] = [];
  const active = employees.filter((e) => e.status === "active");
  let n = 1;
  for (let day = -6; day <= 1; day++) {
    const date = addDaysISO(today, day);
    const count = day === 0 ? 9 : day === 1 ? 4 : 3 + Math.floor(rand() * 2);
    for (let k = 0; k < count; k++) {
      const emp = day === 0 && k < 3 ? employees[0] : active[(k + day + 7) % active.length];
      let loc = pick(locations);
      for (let g = 0; g < locations.length && tasks.some((x) => x.date === date && x.locationId === loc.id); g++) loc = locations[(locations.indexOf(loc) + 1) % locations.length];
      const [startTime, endTime] = slots[k % slots.length];
      const end = taskDateTime(date, endTime);
      const start = taskDateTime(date, startTime);
      let status: TaskStatus;
      if (day < 0) {
        const r = rand();
        status = r < 0.66 ? "verified" : r < 0.8 ? "not_visited" : r < 0.9 ? "verification_failed" : "expired";
      } else if (day === 0) {
        if (end < now) status = rand() < 0.7 ? "verified" : "not_visited";
        else if (start < now) status = pick(["in_progress", "pending", "verified"] as TaskStatus[]);
        else status = "assigned";
        if (emp.id === "EMP001" && k === 2) status = "assigned";
      } else status = "assigned";
      const priority: Priority = pick(["high", "medium", "medium", "low"] as Priority[]);
      const t: Task = {
        id: `VST-${String(n++).padStart(4, "0")}`,
        employeeId: emp.id, locationId: loc.id, date, startTime, endTime, priority,
        instructions: pick(INSTR), status,
        createdAt: new Date(start.getTime() - 20 * 3600e3).toISOString(),
        createdBy: "ADMIN001", attempts: [], verificationStatus: "none",
      };
      if (["verified", "in_progress", "verification_failed", "location_reached"].includes(status)) {
        t.startedAt = new Date(start.getTime() + (10 + rand() * 30) * 60e3).toISOString();
      }
      if (status === "verified" || status === "verification_failed") {
        const far = status === "verification_failed";
        const off = far ? 0.002 + rand() * 0.003 : 0.0001 + rand() * 0.0005;
        const lat = loc.lat + off * (rand() > 0.5 ? 1 : -1);
        const lng = loc.lng + off * 0.6 * (rand() > 0.5 ? 1 : -1);
        const distance = haversine(loc.lat, loc.lng, lat, lng);
        const at = new Date(new Date(t.startedAt!).getTime() + (8 + rand() * 25) * 60e3).toISOString();
        const accuracy = Math.round(6 + rand() * 18);
        t.attempts.push({ at, lat, lng, accuracy, distance, passed: !far, demo: false });
        t.employeeLatitude = lat; t.employeeLongitude = lng; t.gpsAccuracy = accuracy; t.distanceFromLocation = distance;
        t.verificationStatus = far ? "failed" : "verified";
        if (!far) {
          t.reachedAt = at; t.photoTimestamp = at;
          t.checkIn = { at, lat, lng, accuracy, distance, photoTimestamp: at };
          const outAt = new Date(new Date(at).getTime() + (30 + rand() * 40) * 60e3).toISOString();
          t.checkOut = { at: outAt, lat, lng, accuracy, distance, photoTimestamp: outAt };
          t.verifiedAt = outAt;
        }
      }
      tasks.push(t);
    }
  }

  const empName = (id: string) => employees.find((e) => e.id === id)?.name ?? id;
  const locName = (id: string) => locations.find((l) => l.id === id)?.name ?? id;
  const activities: Activity[] = [];
  const notifications: AppNotification[] = [];
  for (const t of tasks) {
    if (t.status === "verified" && t.verifiedAt) {
      activities.push({ id: `ACT-${t.id}`, kind: "success", actor: t.employeeId, createdAt: t.verifiedAt, message: `${empName(t.employeeId)} completed a visit at ${locName(t.locationId)}.` });
    } else if (t.status === "verification_failed") {
      const at = t.attempts[0]?.at ?? t.createdAt;
      activities.push({ id: `ACT-${t.id}`, kind: "danger", actor: t.employeeId, createdAt: at, message: `${empName(t.employeeId)}'s location verification failed at ${locName(t.locationId)}.` });
    } else if (t.status === "not_visited" || t.status === "expired") {
      const at = taskDateTime(t.date, t.endTime).toISOString();
      activities.push({ id: `ACT-${t.id}`, kind: "warning", actor: "system", createdAt: at, message: `Visit deadline expired for ${empName(t.employeeId)} at ${locName(t.locationId)}.` });
    } else if (t.date >= today) {
      activities.push({ id: `ACT-${t.id}`, kind: "info", actor: "ADMIN001", createdAt: t.createdAt, message: `A new task was assigned to ${empName(t.employeeId)} — ${locName(t.locationId)}.` });
      notifications.push({ id: `NTF-${t.id}`, type: "task_assigned", title: "New visit assigned", message: `${locName(t.locationId)} on ${t.date} at ${t.startTime}`, audience: t.employeeId, taskId: t.id, read: false, createdAt: t.createdAt });
    }
  }
  for (const a of activities.filter((a) => a.kind !== "info").slice(-8)) {
    notifications.push({ id: `NTF-${a.id}`, type: a.kind === "success" ? "visit_completed" : a.kind === "danger" ? "verification_failed" : "deadline_passed", title: a.kind === "success" ? "Visit completed" : a.kind === "danger" ? "Verification failed" : "Deadline passed", message: a.message, audience: "admin", read: false, createdAt: a.createdAt });
  }

  return {
    version: 3, taskHistory: [], users, employees, departments: buildDepartments(now),
    locations, locationTypes: buildLocationTypes(now), tasks, notifications, activities, settings: DEFAULT_SETTINGS,
  };
}
