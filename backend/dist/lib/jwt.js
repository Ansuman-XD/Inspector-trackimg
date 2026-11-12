import jwt from "jsonwebtoken";
import { config } from "../config.js";
export function generateAccessToken(payload) {
    return jwt.sign(payload, config.jwt.accessSecret, {
        expiresIn: "15m",
    });
}
export function generateRefreshToken(payload) {
    return jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: "7d",
    });
}
export function verifyAccessToken(token) {
    return jwt.verify(token, config.jwt.accessSecret);
}
export function verifyRefreshToken(token) {
    return jwt.verify(token, config.jwt.refreshSecret);
}
