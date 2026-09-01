import { http } from "@/services/api/http-client";
import type { TokenPair, User } from "@/types/api";
export const authService = {
  requestOtp: (phone: string, purpose = "login") =>
    http.post<{ status: string; expires_in: number; dev_code?: string }>("/auth/otp/request", { phone, purpose }),
  verifyOtp: (payload: { phone: string; code: string; purpose?: string; full_name?: string }) =>
    http.post<TokenPair>("/auth/otp/verify", payload),
  login: (email: string, password: string, totp_code?: string) =>
    http.post<TokenPair>("/auth/login", { email, password, totp_code }),
  logout: (refresh_token: string) => http.post("/auth/logout", { refresh_token }),
  me: () => http.get<User>("/auth/me"),
};
