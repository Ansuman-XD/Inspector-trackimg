import crypto from "crypto";
import { employeeRepository } from "../repositories/employeeRepository.js";
import { hashPassword, verifyPassword, hashToken } from "../lib/crypto.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, } from "../lib/jwt.js";
import { config } from "../config.js";
export class AuthError extends Error {
    status;
    constructor(message, status = 400) {
        super(message);
        this.status = status;
        this.name = "AuthError";
    }
}
export const authService = {
    async login(badgeIdInput, passwordInput, requestedRole) {
        const badgeId = badgeIdInput.trim().toUpperCase();
        // Least-privilege error: do not leak whether user badge exists
        const employee = await employeeRepository.findByBadgeId(badgeId);
        if (!employee) {
            throw new AuthError("Invalid User ID or password.", 401);
        }
        const passwordValid = await verifyPassword(employee.passwordHash, passwordInput);
        if (!passwordValid) {
            throw new AuthError("Invalid User ID or password.", 401);
        }
        // Role check
        if (employee.role !== requestedRole) {
            throw new AuthError(`This account is not registered as ${requestedRole === "admin" ? "an Admin" : "an Employee"}.`, 403);
        }
        // Status check for employees
        if (employee.role === "employee" && !employee.active) {
            throw new AuthError("Your account has been deactivated. Contact your administrator.", 403);
        }
        // Generate tokens
        const tokenId = `RT-${crypto.randomUUID()}`;
        const tokenPayload = {
            userId: employee.id,
            badgeId: employee.badgeId,
            role: employee.role,
            name: employee.name,
        };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken({ userId: employee.id, tokenId });
        // Store hashed refresh token in DB
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + config.jwt.refreshExpiresInDays);
        await employeeRepository.createRefreshToken({
            id: tokenId,
            employeeId: employee.id,
            tokenHash: hashToken(refreshToken),
            revoked: false,
            expiresAt,
        });
        await employeeRepository.updateLastLogin(employee.id);
        return {
            accessToken,
            refreshToken,
            user: {
                id: employee.id,
                badgeId: employee.badgeId,
                name: employee.name,
                email: employee.email,
                role: employee.role,
                department: employee.department,
                designation: employee.designation,
                mustChangePw: employee.mustChangePw,
            },
        };
    },
    async refresh(refreshTokenInput) {
        let payload;
        try {
            payload = verifyRefreshToken(refreshTokenInput);
        }
        catch {
            throw new AuthError("Invalid or expired refresh token", 401);
        }
        const tokenHash = hashToken(refreshTokenInput);
        const storedToken = await employeeRepository.findValidRefreshToken(payload.tokenId, tokenHash);
        if (!storedToken) {
            // Possible token reuse attempt: revoke all tokens for this user
            await employeeRepository.revokeAllUserRefreshTokens(payload.userId);
            throw new AuthError("Revoked or compromised refresh token", 401);
        }
        // Revoke old token (rotation)
        await employeeRepository.revokeRefreshToken(storedToken.id);
        const employee = await employeeRepository.findById(payload.userId);
        if (!employee || !employee.active) {
            throw new AuthError("Account inactive or deleted", 401);
        }
        // Issue new pair
        const newTokenId = `RT-${crypto.randomUUID()}`;
        const newAccessToken = generateAccessToken({
            userId: employee.id,
            badgeId: employee.badgeId,
            role: employee.role,
            name: employee.name,
        });
        const newRefreshToken = generateRefreshToken({ userId: employee.id, tokenId: newTokenId });
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + config.jwt.refreshExpiresInDays);
        await employeeRepository.createRefreshToken({
            id: newTokenId,
            employeeId: employee.id,
            tokenHash: hashToken(newRefreshToken),
            revoked: false,
            expiresAt,
        });
        return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    },
    async logout(refreshTokenInput) {
        try {
            const payload = verifyRefreshToken(refreshTokenInput);
            await employeeRepository.revokeRefreshToken(payload.tokenId);
        }
        catch {
            // Ignore invalid or already expired tokens on logout
        }
    },
    async getMe(userId) {
        const employee = await employeeRepository.findById(userId);
        if (!employee) {
            throw new AuthError("User not found", 404);
        }
        const { passwordHash, ...rest } = employee;
        return rest;
    },
    async changePassword(badgeIdInput, oldPassword, newPassword) {
        const badgeId = badgeIdInput.trim().toUpperCase();
        if (!newPassword || newPassword.length < 6) {
            throw new AuthError("New password must be at least 6 characters.", 400);
        }
        const employee = await employeeRepository.findByBadgeId(badgeId);
        if (!employee) {
            throw new AuthError("Invalid User ID or password.", 401);
        }
        const ok = await verifyPassword(employee.passwordHash, oldPassword);
        if (!ok) {
            throw new AuthError("Invalid User ID or old password.", 401);
        }
        const passwordHash = await hashPassword(newPassword);
        await employeeRepository.update(employee.id, {
            passwordHash,
            mustChangePw: false,
        });
        // optional: revoke all refresh tokens for this user
        await employeeRepository.revokeAllUserRefreshTokens(employee.id);
    },
};
