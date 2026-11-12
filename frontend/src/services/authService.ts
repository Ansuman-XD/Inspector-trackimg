import type { Role, Session } from "@/types";
import { apiClient, tokenStorage, type StoredTokens } from "./apiClient";
import { prefs, storage } from "./storageService";

const SESSION_KEY = "railtrack.session";
const REMEMBER_KEY = "railtrack.rememberId";

export const authService = {
  async login(userId: string, password: string, role: Role, remember: boolean): Promise<Session> {
    const id = userId.trim().toUpperCase();

    // Call real backend API
    const res = await apiClient<{
      accessToken: string;
      refreshToken: string;
      user: {
        id: string;
        badgeId: string;
        name: string;
        email: string;
        role: "admin" | "employee";
        department: string;
        designation: string;
        mustChangePw: boolean;
      };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ userId: id, password, role }),
    });

    tokenStorage.setTokens({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
    });

    const now = new Date();
    const minutes = remember ? 7 * 24 * 60 : 30;
    const session: Session = {
      userId: res.user.badgeId,
      role: res.user.role,
      name: res.user.name,
      remember,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + minutes * 60e3).toISOString(),
    };

    prefs.set(SESSION_KEY, session);
    if (remember) prefs.set(REMEMBER_KEY, id);
    else prefs.remove(REMEMBER_KEY);

    // Keep memory cache updated for immediate UI sync
    try {
      storage.update((d) => ({
        ...d,
        users: d.users.map((u) =>
          u.id === id ? { ...u, lastLogin: now.toISOString() } : u
        ),
      }));
    } catch {}

    return session;
  },

  async logout(): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken();
    tokenStorage.clearTokens();
    prefs.remove(SESSION_KEY);
    if (refreshToken) {
      await apiClient("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
  },

  current(): Session | null {
    const s = prefs.get<Session | null>(SESSION_KEY, null);
    if (!s) return null;
    if (new Date(s.expiresAt) < new Date()) {
      tokenStorage.clearTokens();
      prefs.remove(SESSION_KEY);
      return null;
    }
    return s;
  },

  /** Slide the idle timeout forward on activity. */
  touch() {
    const s = authService.current();
    if (!s || s.remember) return;
    const mins = 30;
    prefs.set(SESSION_KEY, {
      ...s,
      expiresAt: new Date(Date.now() + mins * 60e3).toISOString(),
    });
  },

  rememberedId() {
    return prefs.get<string>(REMEMBER_KEY, "");
  },

  homeFor(role: Role) {
    return role === "admin" ? "/admin/dashboard" : "/employee/dashboard";
  },
};
