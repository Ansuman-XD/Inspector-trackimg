import { departmentRepository } from "../repositories/departmentRepository.js";
import { ServiceError } from "../lib/errors.js";
export function validateDepartment(d) {
    if (!d.name || d.name.trim().length < 2) {
        throw new ServiceError("Enter a department name.", 400);
    }
    if (!d.code || !/^[A-Za-z&/ ]{1,6}$/.test(d.code.trim())) {
        throw new ServiceError("Code must be 1–6 letters (e.g. CEN, S&T).", 400);
    }
}
export const departmentService = {
    async list() {
        return departmentRepository.findAll();
    },
    async getById(id) {
        const dept = await departmentRepository.findById(id);
        if (!dept)
            throw new ServiceError("Department not found", 404);
        return dept;
    },
    async create(input) {
        validateDepartment(input);
        const name = input.name.trim();
        const code = input.code.trim().toUpperCase();
        const existingName = await departmentRepository.findByName(name);
        if (existingName) {
            throw new ServiceError("A department with this name already exists.", 409);
        }
        const existingCode = await departmentRepository.findByCode(code);
        if (existingCode) {
            throw new ServiceError("A department with this code already exists.", 409);
        }
        const id = `DEP-${code.replace(/\W/g, "") || Date.now().toString(36).toUpperCase()}`;
        return departmentRepository.create({
            id,
            name,
            code,
            description: input.description?.trim() || null,
        });
    },
    async update(id, input) {
        validateDepartment(input);
        const existing = await departmentRepository.findById(id);
        if (!existing)
            throw new ServiceError("Department not found", 404);
        const name = input.name.trim();
        const code = input.code.trim().toUpperCase();
        const existingName = await departmentRepository.findByName(name);
        if (existingName && existingName.id !== id) {
            throw new ServiceError("A department with this name already exists.", 409);
        }
        const existingCode = await departmentRepository.findByCode(code);
        if (existingCode && existingCode.id !== id) {
            throw new ServiceError("A department with this code already exists.", 409);
        }
        const updated = await departmentRepository.update(id, {
            name,
            code,
            description: input.description?.trim() || null,
        });
        if (!updated)
            throw new ServiceError("Failed to update department", 500);
        return updated;
    },
    async remove(id) {
        const existing = await departmentRepository.findById(id);
        if (!existing)
            throw new ServiceError("Department not found", 404);
        // Referential delete guard
        const employeeCount = await departmentRepository.countEmployees(id);
        if (employeeCount > 0) {
            throw new ServiceError("Employees are still assigned to this department. Reassign them first.", 409);
        }
        await departmentRepository.remove(id);
    },
};
