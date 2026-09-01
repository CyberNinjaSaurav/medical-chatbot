export type UserRole =
  | "patient" | "doctor" | "pharmacist" | "delivery"
  | "admin" | "admin_pharmacy" | "admin_content" | "admin_support";
export interface User {
  id: string; phone: string; email: string | null; role: UserRole;
  full_name: string | null; abha_id: string | null; language: string;
  totp_enabled: boolean; created_at: string;
}
export interface TokenPair {
  access_token: string; refresh_token: string; token_type: string;
  role: UserRole; user_id: string;
}
export interface ApiErrorBody {
  code: string; message: string; details?: unknown; request_id?: string;
}
export interface OrderSummary {
  id: string; status: string; total: number; tracking_code: string | null;
  prescription_id: string | null; verified_at: string | null; created_at: string;
}
