import { hash } from "@node-rs/argon2";
import { db } from "./index.js";
import { departments, locationTypes, locations, employees } from "./schema.js";
// Seed fixtures from frontend/src/services/seed.ts
const DEPT_SEED = [
    { id: "DEP-CEN", name: "Civil Engineering", code: "CEN", description: "Track, bridges, works and P.Way maintenance." },
    { id: "DEP-ST", name: "Signal & Telecom", code: "S&T", description: "Signalling, telecom and interlocking systems." },
    { id: "DEP-OPR", name: "Operating", code: "OPR", description: "Station working, commercial and operating branches." },
    { id: "DEP-ELE", name: "Electrical", code: "ELE", description: "Traction distribution, general services and lighting." },
    { id: "DEP-RPF", name: "Security/RPF", code: "RPF", description: "Railway Protection Force and security operations." },
    { id: "DEP-MEC", name: "Mechanical", code: "MEC", description: "Coaching stock, freight and workshop maintenance." },
    { id: "DEP-SAF", name: "Safety", code: "SAF", description: "Safety counselling, inspections and accident prevention." },
];
const LOCTYPE_SEED = [
    { id: "LTP-JST", name: "Junction Station", code: "JST", description: "Major station where multiple routes meet." },
    { id: "LTP-TER", name: "Terminal Station", code: "TER", description: "Terminus with pit lines and washing lines." },
    { id: "LTP-GDY", name: "Goods Yard", code: "GDY", description: "Freight handling, parcels and siding area." },
    { id: "LTP-SGL", name: "Signal Cabin", code: "SGL", description: "Signal cabin or interlocking installation." },
    { id: "LTP-BRG", name: "Bridge/Culvert", code: "BRG", description: "Major and minor bridges, culverts and approaches." },
    { id: "LTP-LCS", name: "Level Crossing", code: "LCS", description: "Manned and unmanned level crossings." },
    { id: "LTP-TRK", name: "Track Section", code: "TRK", description: "Track inspection stretches and kilometre marks." },
    { id: "LTP-DEP", name: "Depot", code: "DEP", description: "Loco, carriage and wagon depots or workshops." },
    { id: "LTP-OTH", name: "Other", code: "OTH", description: "Any other location requiring inspection." },
];
const LOC_SEED = [
    { id: "LOC-001", name: "Bhubaneswar Railway Station", typeId: "LTP-JST", type: "Junction Station", lat: 20.266876, lng: 85.843484, radius: 100, address: "Station Square, Master Canteen, Bhubaneswar, Odisha 751001", description: "Platform 1–6 amenities, FOB and passenger circulation area inspection." },
    { id: "LOC-002", name: "Cuttack Railway Station", typeId: "LTP-JST", type: "Junction Station", lat: 20.468611, lng: 85.899444, radius: 100, address: "Station Road, Chandni Chowk, Cuttack, Odisha 753003", description: "Main concourse, booking office and platform surface inspection." },
    { id: "LOC-003", name: "Khurda Road Junction", typeId: "LTP-JST", type: "Junction Station", lat: 20.182594, lng: 85.617310, radius: 100, address: "Jatni, Khurda District, Odisha 752050", description: "Divisional junction — yard lines, signalling cabin and platform checks." },
    { id: "LOC-004", name: "Puri Railway Station", typeId: "LTP-TER", type: "Terminal Station", lat: 19.813210, lng: 85.831512, radius: 100, address: "Station Road, Puri, Odisha 752001", description: "Terminal station — pit lines, washing line and passenger amenities." },
    { id: "LOC-005", name: "Mancheswar Carriage Repair Workshop", typeId: "LTP-DEP", type: "Depot", lat: 20.312730, lng: 85.855620, radius: 100, address: "Mancheswar Industrial Estate, Bhubaneswar, Odisha 751010", description: "Coach POH shed, wheel shop and material stores audit." },
    { id: "LOC-006", name: "East Coast Railway Headquarters", typeId: "LTP-OTH", type: "Other", lat: 20.326310, lng: 85.817540, radius: 100, address: "Rail Sadan, Chandrasekharpur, Bhubaneswar, Odisha 751017", description: "Zonal HQ — records and review meeting attendance." },
    { id: "LOC-007", name: "Divisional Engineering Office, Khurda Road", typeId: "LTP-OTH", type: "Other", lat: 20.179880, lng: 85.614920, radius: 100, address: "DRM Office Complex, Jatni, Odisha 752050", description: "Engineering branch — track records and register verification." },
    { id: "LOC-008", name: "Track Inspection Point KM 432/6", typeId: "LTP-TRK", type: "Track Section", lat: 20.165120, lng: 85.707340, radius: 200, address: "Near Jatni Outer, Khurda–Bhubaneswar Section, Odisha", description: "Rail joint, fish plate and ballast profile inspection." },
    { id: "LOC-009", name: "Level Crossing LC-17 Vani Vihar", typeId: "LTP-LCS", type: "Level Crossing", lat: 20.297850, lng: 85.841260, radius: 100, address: "Vani Vihar, Bhubaneswar, Odisha 751004", description: "Manned LC — gate operation, lifting barrier and signage check." },
    { id: "LOC-010", name: "Khurda Road Diesel Loco Shed", typeId: "LTP-DEP", type: "Depot", lat: 20.187610, lng: 85.624870, radius: 100, address: "Loco Colony, Jatni, Odisha 752050", description: "Locomotive maintenance depot — fuel point and safety equipment." },
    { id: "LOC-011", name: "Barang Junction", typeId: "LTP-JST", type: "Junction Station", lat: 20.405790, lng: 85.834560, radius: 100, address: "Barang, Cuttack District, Odisha 754005", description: "Junction station — point & crossing and relay room inspection." },
    { id: "LOC-012", name: "Naraj Marthapur Bridge Inspection Point", typeId: "LTP-BRG", type: "Bridge/Culvert", lat: 20.463980, lng: 85.778120, radius: 200, address: "Naraj, Cuttack District, Odisha 754006", description: "Mahanadi bridge approach — girder bearings and guard rail check." },
    { id: "LOC-013", name: "Sakhigopal Railway Station", typeId: "LTP-TER", type: "Terminal Station", lat: 19.964720, lng: 85.821430, radius: 100, address: "Sakhigopal, Puri District, Odisha 752014", description: "Halt station — platform lighting and shelter condition." },
];
const EMP_SEED = [
    { id: "EMP001", name: "Rajesh Kumar", phone: "9437012845", deptId: "DEP-CEN", dept: "Civil Engineering", designation: "Section Engineer (P.Way)", joiningDate: "2016-07-11", active: true },
    { id: "EMP002", name: "Amit Das", phone: "9861234570", deptId: "DEP-ST", dept: "Signal & Telecom", designation: "Junior Engineer (Signal)", joiningDate: "2018-03-02", active: true },
    { id: "EMP003", name: "Suresh Pradhan", phone: "9938456120", deptId: "DEP-CEN", dept: "Civil Engineering", designation: "Track Inspector", joiningDate: "2014-11-24", active: true },
    { id: "EMP004", name: "Priyanka Mohanty", phone: "7008123456", deptId: "DEP-OPR", dept: "Operating", designation: "Station Inspector", joiningDate: "2019-06-17", active: true },
    { id: "EMP005", name: "Anil Kumar Sahoo", phone: "9777345612", deptId: "DEP-MEC", dept: "Mechanical", designation: "Senior Section Engineer (C&W)", joiningDate: "2012-01-09", active: true },
    { id: "EMP006", name: "Sasmita Behera", phone: "8249016734", deptId: "DEP-ELE", dept: "Electrical", designation: "Junior Engineer (TRD)", joiningDate: "2020-09-01", active: true },
    { id: "EMP007", name: "Debasis Nayak", phone: "9124578803", deptId: "DEP-SAF", dept: "Safety", designation: "Safety Counsellor", joiningDate: "2015-04-20", active: true },
    { id: "EMP008", name: "Manoj Kumar Swain", phone: "9658210047", deptId: "DEP-CEN", dept: "Civil Engineering", designation: "Permanent Way Supervisor", joiningDate: "2017-12-05", active: true },
    { id: "EMP009", name: "Lipika Rout", phone: "7894561230", deptId: "DEP-OPR", dept: "Operating", designation: "Commercial Inspector", joiningDate: "2021-02-15", active: false },
];
export async function seedDatabase() {
    console.log("Starting database seed...");
    // 1. Seed Departments
    console.log("Seeding departments...");
    for (const d of DEPT_SEED) {
        await db
            .insert(departments)
            .values({
            id: d.id,
            name: d.name,
            code: d.code,
            description: d.description,
        })
            .onConflictDoUpdate({
            target: departments.id,
            set: { name: d.name, code: d.code, description: d.description },
        });
    }
    // 2. Seed Location Types
    console.log("Seeding location types...");
    for (const lt of LOCTYPE_SEED) {
        await db
            .insert(locationTypes)
            .values({
            id: lt.id,
            name: lt.name,
            code: lt.code,
            description: lt.description,
        })
            .onConflictDoUpdate({
            target: locationTypes.id,
            set: { name: lt.name, code: lt.code, description: lt.description },
        });
    }
    // 3. Seed Locations
    console.log("Seeding locations...");
    for (const l of LOC_SEED) {
        await db
            .insert(locations)
            .values({
            id: l.id,
            name: l.name,
            description: l.description,
            address: l.address,
            lat: l.lat,
            lng: l.lng,
            locationTypeId: l.typeId,
            type: l.type,
            verificationRadius: l.radius,
            status: "active",
        })
            .onConflictDoUpdate({
            target: locations.id,
            set: {
                name: l.name,
                description: l.description,
                address: l.address,
                lat: l.lat,
                lng: l.lng,
                locationTypeId: l.typeId,
                type: l.type,
                verificationRadius: l.radius,
            },
        });
    }
    // 4. Seed Admin User
    console.log("Seeding Admin user (ADMIN001)...");
    const adminPasswordHash = await hash("admin123");
    await db
        .insert(employees)
        .values({
        id: "ADMIN001",
        badgeId: "ADMIN001",
        name: "Admin User",
        phone: "9437000000",
        email: "admin.ops@ecor.railnet.gov.in",
        departmentId: "DEP-OPR",
        department: "Operating",
        designation: "Division Controller",
        role: "admin",
        passwordHash: adminPasswordHash,
        active: true,
        mustChangePw: false,
        joiningDate: "2010-01-01",
    })
        .onConflictDoUpdate({
        target: employees.id,
        set: {
            passwordHash: adminPasswordHash,
            role: "admin",
            active: true,
        },
    });
    // 5. Seed Employees / Inspectors (EMP001–EMP009)
    console.log("Seeding Employees (EMP001-EMP009)...");
    const employeePasswordHash = await hash("employee123");
    for (const emp of EMP_SEED) {
        const email = emp.name
            .toLowerCase()
            .replace(/[^a-z ]/g, "")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .join(".") + "@ecor.railnet.gov.in";
        await db
            .insert(employees)
            .values({
            id: emp.id,
            badgeId: emp.id,
            name: emp.name,
            phone: emp.phone,
            email,
            departmentId: emp.deptId,
            department: emp.dept,
            designation: emp.designation,
            role: "employee",
            passwordHash: employeePasswordHash,
            active: emp.active,
            mustChangePw: false,
            joiningDate: emp.joiningDate,
        })
            .onConflictDoUpdate({
            target: employees.id,
            set: {
                name: emp.name,
                phone: emp.phone,
                email,
                departmentId: emp.deptId,
                department: emp.dept,
                designation: emp.designation,
                role: "employee",
                active: emp.active,
                passwordHash: employeePasswordHash,
            },
        });
    }
    console.log("\n========================================================");
    console.log("SEED COMPLETED SUCCESSFULLY! DEV CREDENTIALS:");
    console.log("--------------------------------------------------------");
    console.log("Role: Admin");
    console.log("  Badge ID: ADMIN001");
    console.log("  Password: admin123");
    console.log("");
    console.log("Role: Employee / Inspector");
    console.log("  Badge ID: EMP001 (Rajesh Kumar)");
    console.log("  Password: employee123");
    console.log("  (Also seeded: EMP002 through EMP009 with password 'employee123')");
    console.log("========================================================\n");
}
// Run when executed directly
const isDirectExecution = process.argv[1]?.includes("seed.ts") ||
    process.argv[1]?.includes("seed.js") ||
    import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`;
if (isDirectExecution) {
    seedDatabase().catch((err) => {
        console.error("Seed error:", err);
        process.exit(1);
    });
}
