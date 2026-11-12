/**
 * API client layer for Inspector Tracking System.
 * Handles typed requests, bearer tokens, and automatic token refresh.
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:3001";

const ACCESS_TOKEN_KEY = "railtrack.access_token";
const REFRESH_TOKEN_KEY = "railtrack.refresh_token";

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export const tokenStorage = {
  getAccessToken(): string | null {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefreshToken(): string | null {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setTokens(tokens: StoredTokens): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },
  clearTokens(): void {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const headers = new Headers(options.headers || {});

  const token = tokenStorage.getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Handle json payload automatically unless FormData
  if (!(options.body instanceof FormData) && !headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...options, headers });

  // Handle 401 Unauthorized -> Refresh token flow
  if (response.status === 401 && !endpoint.includes("/auth/")) {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      tokenStorage.clearTokens();
      throw new Error("Session expired. Please sign in again.");
    }

    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (!refreshRes.ok) {
          throw new Error("Failed to refresh session");
        }

        const newTokens = (await refreshRes.json()) as StoredTokens;
        tokenStorage.setTokens(newTokens);
        isRefreshing = false;
        onRefreshed(newTokens.accessToken);
      } catch (err) {
        isRefreshing = false;
        tokenStorage.clearTokens();
        throw new Error("Session expired. Please sign in again.");
      }
    }

    // Wait for the token to refresh and retry request
    const retryToken = await new Promise<string>((resolve) => {
      subscribeTokenRefresh((newToken) => resolve(newToken));
    });

    headers.set("Authorization", `Bearer ${retryToken}`);
    const retryResponse = await fetch(url, { ...options, headers });
    if (!retryResponse.ok) {
      const errData = await retryResponse.json().catch(() => ({}));
      throw new Error(errData.error || `Request failed with status ${retryResponse.status}`);
    }
    return retryResponse.json() as Promise<T>;
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Request failed with status ${response.status}`);
  }

  // Handle empty or blob responses
  const contentType = response.headers.get("Content-Type");
  if (contentType && contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }
  return response.text() as Promise<T>;
}
