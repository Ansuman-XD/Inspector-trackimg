// /**
//  * API client layer for Inspector Tracking System.
//  * Handles typed requests, bearer tokens, and automatic token refresh.
//  */

// // const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:3001";

// // const ACCESS_TOKEN_KEY = "railtrack.access_token";
// // const REFRESH_TOKEN_KEY = "railtrack.refresh_token";

// // export interface StoredTokens {
// //   accessToken: string;
// //   refreshToken: string;
// // }

// const RAW_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:3001";
// // remove trailing slash(es) so we never build "//auth/login"
// const API_BASE_URL = String(RAW_BASE).replace(/\/+$/, "");

// const ACCESS_TOKEN_KEY = "railtrack.access_token";
// const REFRESH_TOKEN_KEY = "railtrack.refresh_token";
// const SESSION_KEY = "railtrack.session";

// export interface StoredTokens {
//   accessToken: string;
//   refreshToken: string;
// }
// let expiredNotified = false;

// export const tokenStorage = {
//   getAccessToken(): string | null {
//     if (typeof localStorage === "undefined") return null;
//     return localStorage.getItem(ACCESS_TOKEN_KEY);
//   },
//   getRefreshToken(): string | null {
//     if (typeof localStorage === "undefined") return null;
//     return localStorage.getItem(REFRESH_TOKEN_KEY);
//   },
//   setTokens(tokens: StoredTokens): void {
//     if (typeof localStorage === "undefined") return;
//     localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
//     localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
//      expiredNotified = false; 
//   },
//   clearTokens(): void {
//     if (typeof localStorage === "undefined") return;
//     localStorage.removeItem(ACCESS_TOKEN_KEY);
//     localStorage.removeItem(REFRESH_TOKEN_KEY);
//   },
// };

// // const SESSION_KEY = "railtrack.session";

// /** Clear tokens + local session and tell the app to redirect to login */
// export function forceSessionExpired(message = "Session expired. Please sign in again.") {
//   tokenStorage.clearTokens();
//   try {
//     localStorage.removeItem(SESSION_KEY);
//   } catch {}
//   // Let layout/hooks redirect
//    if (typeof window !== "undefined" && !expiredNotified) {
//     expiredNotified = true;
//     window.dispatchEvent(
//       new CustomEvent("railtrack:session-expired", { detail: { message } })
//     );
//   }
// }

// let isRefreshing = false;
// let refreshSubscribers: Array<{
//   resolve: (token: string) => void;
//   reject: (err: Error) => void;
// }> = [];

// function subscribeTokenRefresh(
//   resolve: (token: string) => void,
//   reject: (err: Error) => void
// ) {
//   refreshSubscribers.push({ resolve, reject });
// }

// function onRefreshed(token: string) {
//   refreshSubscribers.forEach((s) => s.resolve(token));
//   refreshSubscribers = [];
// }

// function onRefreshFailed(err: Error) {
//   refreshSubscribers.forEach((s) => s.reject(err));
//   refreshSubscribers = [];
// }

// export async function apiClient<T>(
//   endpoint: string,
//   options: RequestInit = {}
// ): Promise<T> {
//   const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
//   const headers = new Headers(options.headers || {});

//     // Never attach Bearer token to auth endpoints (login/refresh/logout)
//   const isAuthEndpoint = endpoint.includes("/auth/");
//   const token = tokenStorage.getAccessToken();
//   if (token && !headers.has("Authorization") && !isAuthEndpoint) {
//     headers.set("Authorization", `Bearer ${token}`);
//   }

//   // Handle json payload automatically unless FormData
//   if (!(options.body instanceof FormData) && !headers.has("Content-Type") && options.body) {
//     headers.set("Content-Type", "application/json");
//   }

//   const response = await fetch(url, { ...options, headers });

//   // Handle 401 Unauthorized -> Refresh token flow
//   if (response.status === 401 && !endpoint.includes("/auth/")) {
//     const refreshToken = tokenStorage.getRefreshToken();
//     if (!refreshToken) {
//      forceSessionExpired();
//       throw new Error("Session expired. Please sign in again.");
//     }

//     if (!isRefreshing) {
//       isRefreshing = true;
//       try {
//         const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ refreshToken }),
//         });

//         if (!refreshRes.ok) {
//           throw new Error("Failed to refresh session");
//         }

//         const newTokens = (await refreshRes.json()) as StoredTokens;
//         tokenStorage.setTokens(newTokens);
//         isRefreshing = false;
//         onRefreshed(newTokens.accessToken);
//       } catch (err) {
//         isRefreshing = false;
//         const expired = new Error("Session expired. Please sign in again.");
//         onRefreshFailed(expired);
//         forceSessionExpired();
//         throw expired;
//       }
//     }

//     // Wait for the token to refresh and retry request
//     const retryToken = await new Promise<string>((resolve, reject) => {
//       subscribeTokenRefresh(resolve, reject);
//     });

//     headers.set("Authorization", `Bearer ${retryToken}`);
//     const retryResponse = await fetch(url, { ...options, headers });
//     if (!retryResponse.ok) {
//       const errData = await retryResponse.json().catch(() => ({}));
//       throw new Error(errData.error || `Request failed with status ${retryResponse.status}`);
//     }
//     return retryResponse.json() as Promise<T>;
//   }

//   if (!response.ok) {
//     const errData = await response.json().catch(() => ({}));
//     throw new Error(errData.error || `Request failed with status ${response.status}`);
//   }

//   // Handle empty or blob responses
//   const contentType = response.headers.get("Content-Type");
//   if (contentType && contentType.includes("application/json")) {
//     return response.json() as Promise<T>;
//   }
//   return response.text() as Promise<T>;
// }


/**
 * API client layer for Inspector Tracking System.
 * Handles bearer tokens, automatic token refresh, and auto-logout on dead sessions.
 */

const RAW_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:3001";
// remove trailing slash(es) so we never build "//auth/login"
const API_BASE_URL = String(RAW_BASE).replace(/\/+$/, "");

const ACCESS_TOKEN_KEY = "railtrack.access_token";
const REFRESH_TOKEN_KEY = "railtrack.refresh_token";
const SESSION_KEY = "railtrack.session";

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

let expiredNotified = false;

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
    expiredNotified = false; // fresh login/refresh → allow future expiry events
  },
  clearTokens(): void {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

/** Clear tokens + local session and tell the app to redirect to login (fires once). */
export function forceSessionExpired(message = "Session expired. Please sign in again.") {
  tokenStorage.clearTokens();
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
  if (typeof window !== "undefined" && !expiredNotified) {
    expiredNotified = true;
    window.dispatchEvent(new CustomEvent("railtrack:session-expired", { detail: { message } }));
  }
}

/** One shared refresh for all parallel requests. */
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) throw new Error("No refresh token");

      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) throw new Error("Failed to refresh session");

      const tokens = (await res.json()) as StoredTokens;
      tokenStorage.setTokens(tokens);
      return tokens.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Request failed with status ${response.status}`);
  }
  const contentType = response.headers.get("Content-Type");
  if (contentType && contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }
  return response.text() as Promise<T>;
}

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${path}`;
  const isAuthEndpoint = path.includes("/auth/");

  const send = (token: string | null) => {
    const headers = new Headers(options.headers || {});
    if (token && !isAuthEndpoint) headers.set("Authorization", `Bearer ${token}`);
    if (!(options.body instanceof FormData) && !headers.has("Content-Type") && options.body) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(url, { ...options, headers });
  };

  let response: Response;
  try {
    response = await send(tokenStorage.getAccessToken());
  } catch {
    throw new Error(`Cannot reach the server (${API_BASE_URL}). Is the backend running?`);
  }

  // 401 → try one refresh, then retry once
  if (response.status === 401 && !isAuthEndpoint) {
    try {
      const newToken = await refreshAccessToken();
      response = await send(newToken);
    } catch {
      forceSessionExpired();
      throw new Error("Session expired. Please sign in again.");
    }
    if (response.status === 401) {
      forceSessionExpired();
      throw new Error("Session expired. Please sign in again.");
    }
  }

  return parseResponse<T>(response);
}