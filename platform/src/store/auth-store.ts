import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TokenPair, User, UserRole } from "@/types/api";
import { tokenStorage } from "@/services/api/token-storage";

interface AuthState {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  setSession: (tokens: TokenPair, user?: User | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      isAuthenticated: false,
      setSession: (tokens, user = null) => {
        tokenStorage.set(tokens.access_token, tokens.refresh_token);
        set({
          user,
          role: tokens.role,
          isAuthenticated: true,
        });
      },
      setUser: (user) => set({ user, role: user?.role ?? null, isAuthenticated: !!user }),
      logout: () => {
        tokenStorage.clear();
        set({ user: null, role: null, isAuthenticated: false });
      },
    }),
    { name: "gwak-auth" },
  ),
);
