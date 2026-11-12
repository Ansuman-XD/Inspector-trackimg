import { employeeRepository, type EmployeeRecord } from "../repositories/employeeRepository.js";
import { departmentRepository } from "../repositories/departmentRepository.js";
import { hashPassword } from "../lib/crypto.js";
import { ServiceError } from "../lib/errors.js";

export interface EmployeeInput {
  id?: string;
  badgeId?: string;
  name: string;
  phone: string;
  email: string;
  department?: string; // department name or ID
  departmentId?: string;
  designation: string;
  joiningDate?: string;
  status?: "active" | "inactive";
  role?: "admin" | "employee";
  password?: string;
  photo?: string;
}

export function validateEmployee(e: Partial<EmployeeInput>, isCreate: boolean) {
  const id = (e.id || e.badgeId || "").trim();
  if (isCreate && !/^[A-Z0-9]{3,12}$/.test(id)) {
    throw new ServiceError("Employee ID must be 3–12 letters/digits (e.g. EMP010).", 400);
  }
  if (isCreate || e.name !== undefined) {
    if (!e.name || e.name.trim().length < 3) {
      throw new ServiceError("Enter the employee's full name.", 400);
    }
  }
  if (isCreate || e.phone !== undefined) {
    const cleanPhone = (e.phone || "").replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      throw new ServiceError("Enter a valid 10-digit Indian mobile number.", 400);
    }
  }
  if (isCreate || e.email !== undefined) {
    if (!e.email || !/^\S+@\S+\.\S+$/.test(e.email)) {
      throw new ServiceError("Enter a valid email address.", 400);
    }
  }
  if (isCreate && !e.department && !e.departmentId) {
    throw new ServiceError("Select a department.", 400);
  }
  if (isCreate && (!e.password || e.password.length < 6)) {
    throw new ServiceError("Password must be at least 6 characters.", 400);
  }
  if (!isCreate && e.password && e.password.length < 6) {
    throw new ServiceError("Password must be at least 6 characters.", 400);
  }
}

export const employeeService = {
  async list(): Promise<Omit<EmployeeRecord, "passwordHash">[]> {
    const list = await employeeRepository.findAll();
    return list.map(({ passwordHash, ...rest }) => rest);
  },

  async getById(id: string): Promise<Omit<EmployeeRecord, "passwordHash">> {
    const employee = await employeeRepository.findById(id);
    if (!employee) throw new ServiceError("Employee record not found.", 404);
    const { passwordHash, ...rest } = employee;
    return rest;
  },

  async create(input: EmployeeInput): Promise<Omit<EmployeeRecord, "passwordHash">> {
    validateEmployee(input, true);
    const id = (input.id || input.badgeId)!.trim().toUpperCase();

    const existingId = await employeeRepository.findById(id);
    if (existingId) {
      throw new ServiceError(`Employee ID ${id} already exists.`, 409);
    }

    const existingEmail = await employeeRepository.findByEmail(input.email);
    if (existingEmail) {
      throw new ServiceError("An employee with this email already exists.", 409);
    }

    // Resolve department
    let dept = null;
    if (input.departmentId) {
      dept = await departmentRepository.findById(input.departmentId);
    } else if (input.department) {
      dept = (await departmentRepository.findByName(input.department)) || (await departmentRepository.findById(input.department));
    }

    if (!dept) {
      const allDepts = await departmentRepository.findAll();
      dept = allDepts[0];
      if (!dept) throw new ServiceError("No departments available. Create one first.", 400);
    }

    const passwordHash = await hashPassword(input.password!);
    const cleanPhone = input.phone.replace(/\D/g, "").slice(-10);

    const created = await employeeRepository.create({
      id,
      badgeId: id,
      name: input.name.trim(),
      phone: cleanPhone,
      email: input.email.trim().toLowerCase(),
      departmentId: dept.id,
      department: dept.name,
      designation: input.designation.trim(),
      role: input.role || "employee",
      passwordHash,
      active: input.status ? input.status === "active" : true,
      mustChangePw: false,
      joiningDate: input.joiningDate || new Date().toISOString().slice(0, 10),
      photo: input.photo || null,
    });

    const { passwordHash: _, ...rest } = created;
    return rest;
  },

  async update(id: string, input: Partial<EmployeeInput>): Promise<Omit<EmployeeRecord, "passwordHash">> {
    validateEmployee({ ...input, id }, false);
    const existing = await employeeRepository.findById(id);
    if (!existing) throw new ServiceError("Employee record not found.", 404);

    if (input.email) {
      const existingEmail = await employeeRepository.findByEmail(input.email);
      if (existingEmail && existingEmail.id !== id) {
        throw new ServiceError("An employee with this email already exists.", 409);
      }
    }

    let deptId = existing.departmentId;
    let deptName = existing.department;
    if (input.departmentId || input.department) {
      const target = input.departmentId || input.department!;
      const dept = (await departmentRepository.findById(target)) || (await departmentRepository.findByName(target));
      if (dept) {
        deptId = dept.id;
        deptName = dept.name;
      }
    }

    const patch: Partial<typeof existing> = {
      name: input.name?.trim() ?? existing.name,
      phone: input.phone ? input.phone.replace(/\D/g, "").slice(-10) : existing.phone,
      email: input.email?.trim().toLowerCase() ?? existing.email,
      departmentId: deptId,
      department: deptName,
      designation: input.designation?.trim() ?? existing.designation,
      active: input.status ? input.status === "active" : existing.active,
      photo: input.photo !== undefined ? input.photo : existing.photo,
    };

    if (input.password) {
      patch.passwordHash = await hashPassword(input.password);
    }

    const updated = await employeeRepository.update(id, patch);
    if (!updated) throw new ServiceError("Failed to update employee", 500);

    const { passwordHash: _, ...rest } = updated;
    return rest;
  },

  async setStatus(id: string, active: boolean): Promise<void> {
    const existing = await employeeRepository.findById(id);
    if (!existing) throw new ServiceError("Employee record not found.", 404);

    await employeeRepository.update(id, { active });
  },

  async resetPassword(id: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 6) {
      throw new ServiceError("Password must be at least 6 characters.", 400);
    }
    const existing = await employeeRepository.findById(id);
    if (!existing) throw new ServiceError("Employee record not found.", 404);

    const passwordHash = await hashPassword(newPassword);
    await employeeRepository.update(id, { passwordHash, mustChangePw: true });
    // Revoke existing sessions upon admin password reset
    await employeeRepository.revokeAllUserRefreshTokens(id);
  },

  async remove(id: string): Promise<void> {
    const existing = await employeeRepository.findById(id);
    if (!existing) throw new ServiceError("Employee record not found.", 404);

    // Referential delete guard
    const openTasks = await employeeRepository.countOpenTasks(id);
    if (openTasks > 0) {
      throw new ServiceError(
        "This employee has open visits. Reassign or close them before deleting, or deactivate instead.",
        409
      );
    }

    await employeeRepository.remove(id);
  },
};
