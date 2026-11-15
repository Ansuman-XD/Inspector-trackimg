import type { Employee } from "@/types";
import { storage } from "./storageService";
import { makeActivity } from "./notificationService";
import { apiClient } from "./apiClient";

export type EmployeeInput = Omit<Employee, "createdAt"> & { password?: string };

function validate(e: EmployeeInput) {
  if (!/^[A-Z0-9]{3,12}$/.test(e.id)) throw new Error("Employee ID must be 3–12 letters/digits (e.g. EMP010).");
  if (e.name.trim().length < 3) throw new Error("Enter the employee's full name.");
  if (!/^[6-9]\d{9}$/.test(e.phone.replace(/\D/g, "").slice(-10))) throw new Error("Enter a valid 10-digit Indian mobile number.");
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(e.email.trim())) {
  throw new Error("Enter a valid email address (e.g. name@example.com).");
}
  if (!e.department) throw new Error("Select a department.");
  if (e.password !== undefined && e.password.length < 6) throw new Error("Password must be at least 6 characters.");
}

export const employeeService = {
  passwordOf(id: string) {
    return storage.get().users.find((u) => u.id === id)?.password ?? "";
  },

  async create(input: EmployeeInput) {
    const { password, ...rest } = input;
    if (!password) throw new Error("Set a login password for the employee.");
    const e = { ...rest, id: input.id.trim().toUpperCase() };
    validate({ ...e, password });

    // Call backend API
    const res = await apiClient<any>("/employees", {
      method: "POST",
      body: JSON.stringify({
        id: e.id,
        name: e.name,
        phone: e.phone,
        email: e.email,
        department: e.department,
        designation: e.designation,
        joiningDate: e.joiningDate,
        status: e.status,
        role: "employee",
        password,
        photo: e.photo,
      }),
    });

    const newEmp: Employee = {
      ...e,
      id: res.id,
      createdAt: res.createdAt || new Date().toISOString(),
    };

    storage.update((d) => ({
      ...d,
      employees: [...d.employees.filter((x) => x.id !== newEmp.id), newEmp],
      users: [...d.users.filter((u) => u.id !== newEmp.id), { id: e.id, name: e.name, role: "employee", password, email: e.email }],
      activities: makeActivity(d, { kind: "info", actor: "ADMIN001", message: `Employee ${e.name} (${e.id}) was added.` }),
    }));

    return newEmp;
  },

  async update(id: string, input: EmployeeInput) {
    const { password, ...rest } = input;
    validate({ ...input, id, password: password || undefined });

    // Call backend API
    const res = await apiClient<any>(`/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: input.name,
        phone: input.phone,
        email: input.email,
        department: input.department,
        designation: input.designation,
        joiningDate: input.joiningDate,
        status: input.status,
        password: password || undefined,
        photo: input.photo,
      }),
    });

    storage.update((d) => ({
      ...d,
      employees: d.employees.map((x) => (x.id === id ? { ...x, ...rest, id } : x)),
      users: d.users.map((u) => (u.id === id ? { ...u, name: input.name, email: input.email, ...(password ? { password } : {}) } : u)),
      activities: makeActivity(d, { kind: "info", actor: "ADMIN001", message: `Employee record ${id} was updated.` }),
    }));
  },

  async setStatus(id: string, status: Employee["status"]) {
    // Call backend API
    await apiClient(`/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });

    storage.update((d) => ({
      ...d,
      employees: d.employees.map((x) => (x.id === id ? { ...x, status } : x)),
      activities: makeActivity(d, { kind: status === "active" ? "info" : "warning", actor: "ADMIN001", message: `Employee ${id} was ${status === "active" ? "reactivated" : "deactivated"}.` }),
    }));
  },

  async remove(id: string) {
    // Call backend API
    await apiClient(`/employees/${id}`, {
      method: "DELETE",
    });

    storage.update((d) => ({
      ...d,
      employees: d.employees.filter((x) => x.id !== id),
      users: d.users.filter((u) => u.id !== id),
      activities: makeActivity(d, { kind: "warning", actor: "ADMIN001", message: `Employee ${id} was deleted.` }),
    }));
  },
};

