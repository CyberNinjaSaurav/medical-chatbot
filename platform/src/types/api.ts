export type UserRole =
  | "patient"
  | "doctor"
  | "pharmacist"
  | "delivery"
  | "admin"
  | "admin_pharmacy"
  | "admin_content"
  | "admin_support";

export interface User {
  id: string;
  phone: string;
  email: string | null;
  role: UserRole;
  full_name: string | null;
  abha_id: string | null;
  language: string;
  totp_enabled: boolean;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  role: UserRole;
  user_id: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
  request_id?: string;
}

export interface Paginated<T> {
  items: T[];
  next_cursor?: number | null;
  total?: number;
}

export interface Doctor {
  id: string;
  registration_no: string;
  hpr_id: string | null;
  specialties: string[];
  qualifications: string;
  languages: string[];
  experience_years: number;
  fee: number;
  bio: string | null;
  verification_status: string;
  rating_avg: number;
  rating_count: number;
  hospital_name: string | null;
  gender: string | null;
  photo_url: string | null;
  full_name?: string | null;
}

export interface Slot {
  id: string;
  doctor_id: string;
  starts_at: string;
  ends_at: string;
  mode: string;
  is_booked: boolean;
}

export interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  mode: string;
  status: string;
  payment_status: string;
  fee: number;
  consent_ref: string | null;
  created_at: string;
}

export interface Prescription {
  id: string;
  consultation_id: string;
  doctor_id: string;
  patient_id: string;
  registration_no: string;
  issued_at: string;
  items: Array<{
    id: string;
    product_id: string | null;
    drug_name: string;
    schedule_tier: string;
    dose: string;
    frequency: string;
    duration: string;
    instructions: string | null;
  }>;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  composition: string | null;
  manufacturer: string | null;
  schedule_tier: string;
  rx_required: boolean;
  price: number;
  mrp: number;
  category: string;
}

export interface OrderSummary {
  id: string;
  status: string;
  total: number;
  tracking_code: string | null;
  prescription_id: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  category: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export interface LandingContent {
  brand: string;
  tagline: string;
  trust: {
    verified_doctors: number;
    delivery_cities: string[];
    licence_form_20: string;
    licence_form_21: string;
    helpline: string;
    grievance_officer: string;
  };
  featured_doctor_ids: string[];
}
