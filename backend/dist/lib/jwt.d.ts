export interface AccessTokenPayload {
    userId: string;
    badgeId: string;
    role: "admin" | "employee";
    name: string;
}
export interface RefreshTokenPayload {
    userId: string;
    tokenId: string;
}
export declare function generateAccessToken(payload: AccessTokenPayload): string;
export declare function generateRefreshToken(payload: RefreshTokenPayload): string;
export declare function verifyAccessToken(token: string): AccessTokenPayload;
export declare function verifyRefreshToken(token: string): RefreshTokenPayload;
