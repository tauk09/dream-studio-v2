import { create } from "zustand";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "user";
  createdAt: string;
}

const TOKEN_STORAGE_KEY = "ds_v2_session_token";

export function getStoredAuthToken(): string | null {
  try {
    // Clear any legacy localStorage token so closing browser or opening a new tab session logs out cleanly
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredAuthToken(token: string | null): void {
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    if (token) window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage quota / private mode errors
  }
}

export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getStoredAuthToken();
  return {
    ...(extra ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

interface AuthState {
  user: AuthUser | null;
  initialized: boolean;
  refreshAuth: () => Promise<AuthUser | null>;
  clearAuth: () => void;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  register: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initialized: false,

  clearAuth: () => {
    setStoredAuthToken(null);
    set({ user: null, initialized: true });
  },

  refreshAuth: async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        headers: authHeaders()
      });
      if (!res.ok) {
        setStoredAuthToken(null);
        set({ user: null, initialized: true });
        return null;
      }
      const data = (await res.json()) as { authenticated: boolean; user: AuthUser | null };
      if (!data.authenticated) {
        setStoredAuthToken(null);
      }
      set({ user: data.authenticated ? data.user : null, initialized: true });
      return data.authenticated ? data.user : null;
    } catch {
      set({ user: null, initialized: true });
      return null;
    }
  },

  login: async (email, password) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = (await res.json()) as {
        ok: boolean;
        user?: AuthUser;
        token?: string;
        message?: string;
      };
      if (!res.ok || !data.ok || !data.user) {
        return { ok: false, message: data.message ?? "로그인에 실패했습니다." };
      }
      if (data.token) setStoredAuthToken(data.token);
      set({ user: data.user, initialized: true });
      return { ok: true };
    } catch {
      return { ok: false, message: "서버와 연결할 수 없습니다." };
    }
  },

  register: async (email, password, displayName) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName })
      });
      const data = (await res.json()) as {
        ok: boolean;
        user?: AuthUser;
        token?: string;
        message?: string;
      };
      if (!res.ok || !data.ok || !data.user) {
        return { ok: false, message: data.message ?? "회원가입에 실패했습니다." };
      }
      if (data.token) setStoredAuthToken(data.token);
      set({ user: data.user, initialized: true });
      return { ok: true };
    } catch {
      return { ok: false, message: "서버와 연결할 수 없습니다." };
    }
  },

  logout: async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: authHeaders()
      });
    } finally {
      setStoredAuthToken(null);
      set({ user: null, initialized: true });
    }
  }
}));
