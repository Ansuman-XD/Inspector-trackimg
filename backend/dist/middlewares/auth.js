import { verifyAccessToken } from "../lib/jwt.js";
export const requireAuth = async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return c.json({ error: "Missing or invalid authorization token" }, 401);
    }
    const token = authHeader.slice(7).trim();
    try {
        const payload = verifyAccessToken(token);
        c.set("user", payload);
        await next();
    }
    catch (err) {
        return c.json({ error: "Invalid or expired access token" }, 401);
    }
};
export const requireRole = (allowedRole) => {
    return async (c, next) => {
        const user = c.get("user");
        if (!user) {
            return c.json({ error: "Unauthorized" }, 401);
        }
        if (user.role !== allowedRole) {
            return c.json({ error: "Forbidden: insufficient permissions" }, 403);
        }
        await next();
    };
};
export const requireAdmin = requireRole("admin");
