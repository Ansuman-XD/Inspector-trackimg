import type { Department } from "@/types";
import { storage, uid } from "./storageService";
import { makeActivity } from "./notificationService";
import { apiClient } from "./apiClient";

export type DepartmentInput = { name: string; code: string; description?: string };

function validate(d: DepartmentInput) {
  if (d.name.trim().length < 2) throw new Error("Enter a department name.");
  if (!/^[A-Za-z&/ ]{1,6}$/.test(d.code.trim())) throw new Error("Code must be 1–6 letters (e.g. CEN, S&T).");
}

export const departmentService = {
  async create(input: DepartmentInput) {
    validate(input);
    const name = input.name.trim();
    const code = input.code.trim().toUpperCase();

    // Call backend API
    const res = await apiClient<any>("/departments", {
      method: "POST",
      body: JSON.stringify({ name, code, description: input.description?.trim() || undefined }),
    });

    const newDept: Department = {
      id: res.id,
      name: res.name,
      code: res.code,
      description: res.description || undefined,
      createdAt: res.createdAt || new Date().toISOString(),
    };

    storage.update((d) => ({
      ...d,
      departments: [...d.departments.filter((x) => x.id !== newDept.id), newDept],
      activities: makeActivity(d, { kind: "info", actor: "ADMIN001", message: `Department ${name} was added.` }),
    }));

    return newDept;
  },

  async update(id: string, input: DepartmentInput) {
    validate(input);
    const name = input.name.trim();
    const code = input.code.trim().toUpperCase();

    // Call backend API
    const res = await apiClient<any>(`/departments/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, code, description: input.description?.trim() || undefined }),
    });

    storage.update((d) => ({
      ...d,
      departments: d.departments.map((x) =>
        x.id === id ? { ...x, name: res.name, code: res.code, description: res.description || undefined } : x
      ),
    }));
  },

  async remove(id: string) {
    // Call backend API
    await apiClient(`/departments/${id}`, {
      method: "DELETE",
    });

    storage.update((d) => ({ ...d, departments: d.departments.filter((x) => x.id !== id) }));
  },
};

