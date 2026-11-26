import { Hono } from "hono";
import { z } from "zod";
import { authService, AuthError } from "../services/authService.js";
import { requireAuth } from "../middlewares/auth.js";
const loginSchema = z.object({
    userId: z.string().min(1, "User ID is required"),
    password: z.string().min(1, "Password is required"),
    role: z.enum(["admin", "employee"]),
});
const refreshSchema = z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
});
const logoutSchema = z.object({
    refreshToken: z.string().optional(),
});
const changePasswordSchema = z.object({
    userId: z.string().min(1),
    oldPassword: z.string().min(1),
    newPassword: z.string().min(6),
    confirmPassword: z.string().min(6),
}).refine((d) => d.newPassword === d.confirmPassword, {
    message: "New password and confirm password do not match",
    path: ["confirmPassword"],
});
export const authRoutes = new Hono();
// POST /auth/login
authRoutes.post("/login", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, 400);
    }
    try {
        const result = await authService.login(parsed.data.userId, parsed.data.password, parsed.data.role);
        return c.json(result);
    }
    catch (err) {
        if (err instanceof AuthError) {
            return c.json({ error: err.message }, err.status);
        }
        console.error("Login error:", err);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /auth/refresh
authRoutes.post("/refresh", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = refreshSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, 400);
    }
    try {
        const tokens = await authService.refresh(parsed.data.refreshToken);
        return c.json(tokens);
    }
    catch (err) {
        if (err instanceof AuthError) {
            return c.json({ error: err.message }, err.status);
        }
        return c.json({ error: "Failed to refresh token" }, 500);
    }
});
// POST /auth/logout
authRoutes.post("/logout", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = logoutSchema.safeParse(body);
    if (parsed.success && parsed.data.refreshToken) {
        await authService.logout(parsed.data.refreshToken);
    }
    return c.json({ success: true, message: "Logged out successfully" });
});
// GET /me (Protected)
authRoutes.get("/me", requireAuth, async (c) => {
    const user = c.get("user");
    try {
        const profile = await authService.getMe(user.userId);
        return c.json(profile);
    }
    catch (err) {
        if (err instanceof AuthError) {
            return c.json({ error: err.message }, err.status);
        }
        return c.json({ error: "Internal server error" }, 500);
    }
});
authRoutes.post("/change-password", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, 400);
    }
    try {
        await authService.changePassword(parsed.data.userId, parsed.data.oldPassword, parsed.data.newPassword);
        return c.json({ success: true, message: "Password changed successfully" });
    }
    catch (err) {
        if (err instanceof AuthError) {
            return c.json({ error: err.message }, err.status);
        }
        return c.json({ error: "Internal server error" }, 500);
    }
});
