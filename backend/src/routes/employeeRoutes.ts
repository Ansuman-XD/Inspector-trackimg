import { Hono } from "hono";
import { z } from "zod";
import { employeeService } from "../services/employeeService.js";
import { ServiceError } from "../lib/errors.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const createEmployeeSchema = z.object({
  id: z.string().regex(/^[A-Z0-9]{3,12}$/, "Employee ID must be 3–12 letters/digits (e.g. EMP010)."),
  name: z.string().min(3, "Enter the employee's full name."),
  phone: z.string().min(10, "Enter a valid 10-digit Indian mobile number."),
  email: z.string().email("Enter a valid email address."),
  department: z.string().optional(),
  departmentId: z.string().optional(),
  designation: z.string().min(1, "Enter designation."),
  joiningDate: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  role: z.enum(["admin", "employee"]).optional(),
  password: z.string().min(6, "Password must be at least 6 characters."),
  photo: z.string().optional(),
});

const updateEmployeeSchema = z.object({
  name: z.string().min(3, "Enter the employee's full name.").optional(),
  phone: z.string().min(10, "Enter a valid 10-digit Indian mobile number.").optional(),
  email: z.string().email("Enter a valid email address.").optional(),
  department: z.string().optional(),
  departmentId: z.string().optional(),
  designation: z.string().optional(),
  joiningDate: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  password: z.string().min(6, "Password must be at least 6 characters.").optional(),
  photo: z.string().optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const employeeRoutes = new Hono();

employeeRoutes.use("/*", requireAuth);

// GET /employees
employeeRoutes.get("/", async (c) => {
  const list = await employeeService.list();
  return c.json(list);
});

// GET /employees/:id
employeeRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const emp = await employeeService.getById(id);
    return c.json(emp);
  } catch (err: any) {
    if (err instanceof ServiceError) return c.json({ error: err.message }, err.status as any);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// POST /employees (Admin only)
employeeRoutes.post("/", requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, 400);
  }

  try {
    const created = await employeeService.create(parsed.data);
    return c.json(created, 201);
  } catch (err: any) {
    if (err instanceof ServiceError) return c.json({ error: err.message }, err.status as any);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// PUT /employees/:id (Admin only)
employeeRoutes.put("/:id", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = updateEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, 400);
  }

  try {
    const updated = await employeeService.update(id, parsed.data);
    return c.json(updated);
  } catch (err: any) {
    if (err instanceof ServiceError) return c.json({ error: err.message }, err.status as any);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// POST /employees/:id/reset-password (Admin only)
employeeRoutes.post("/:id/reset-password", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, 400);
  }

  try {
    await employeeService.resetPassword(id, parsed.data.password);
    return c.json({ success: true, message: "Password reset successfully" });
  } catch (err: any) {
    if (err instanceof ServiceError) return c.json({ error: err.message }, err.status as any);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// DELETE /employees/:id (Admin only)
employeeRoutes.delete("/:id", requireAdmin, async (c) => {
  const id = c.req.param("id");
  try {
    await employeeService.remove(id);
    return c.json({ success: true, message: "Employee deleted" });
  } catch (err: any) {
    if (err instanceof ServiceError) return c.json({ error: err.message }, err.status as any);
    return c.json({ error: "Internal server error" }, 500);
  }
});
