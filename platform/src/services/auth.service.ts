import { http } from "@/services/api/http-client";
import type { TokenPair, User } from "@/types/api";

export interface FamilyMember {
  id: string;
  full_name: string;
  relation: string;
  dob: string | null;
}

export const authService = {
  requestOtp: (phone: string, purpose = "login") =>
    http.post<{ status: string; expires_in: number; dev_code?: string }>("/auth/otp/request", {
      phone,
      purpose,
    }),
  verifyOtp: (payload: { phone: string; code: string; purpose?: string; full_name?: string }) =>
    http.post<TokenPair>("/auth/otp/verify", payload),
  login: (email: string, password: string, totp_code?: string) =>
    http.post<TokenPair>("/auth/login", { email, password, totp_code }),
  refresh: (refresh_token: string) => http.post<TokenPair>("/auth/refresh", { refresh_token }),
  logout: (refresh_token: string) => http.post("/auth/logout", { refresh_token }),
  me: () => http.get<User>("/auth/me"),
  updateMe: (payload: Record<string, unknown>) => http.patch<User>("/auth/me", payload),
  linkAbha: (abha_id: string) => http.post("/auth/abha/link", { abha_id }),
  setup2fa: () => http.post<{ secret: string; otpauth_uri: string }>("/auth/2fa/setup"),
  enable2fa: (code: string) => http.post("/auth/2fa/enable", { code }),
  listFamily: () => http.get<FamilyMember[]>("/auth/family"),
  addFamily: (payload: { full_name: string; relation: string; dob?: string }) =>
    http.post<FamilyMember>("/auth/family", payload),
};
