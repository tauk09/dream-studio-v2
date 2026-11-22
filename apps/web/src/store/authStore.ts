import { create } from "zustand";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "user";
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  initialized: boolean;
  refreshAuth: () => Promise<AuthUser | null>;
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

  refreshAuth: async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) {
        set({ user: null, initialized: true });
        return null;
      }
      const data = (await res.json()) as { authenticated: boolean; user: AuthUser | null };
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
      const data = (await res.json()) as { ok: boolean; user?: AuthUser; message?: string };
      if (!res.ok || !data.ok || !data.user) {
        return { ok: false, message: data.message ?? "로그인에 실패했습니다." };
      }
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
      const data = (await res.json()) as { ok: boolean; user?: AuthUser; message?: string };
      if (!res.ok || !data.ok || !data.user) {
        return { ok: false, message: data.message ?? "회원가입에 실패했습니다." };
      }
      set({ user: data.user, initialized: true });
      return { ok: true };
    } catch {
      return { ok: false, message: "서버와 연결할 수 없습니다." };
    }
  },

  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      set({ user: null, initialized: true });
    }
  }
}));
