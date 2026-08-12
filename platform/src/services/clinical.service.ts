import { http } from "@/services/api/http-client";
import type {
  Appointment,
  Doctor,
  LandingContent,
  Paginated,
  Prescription,
  Slot,
} from "@/types/api";

export const doctorService = {
  landing: () => http.get<LandingContent>("/landing"),
  specialties: () =>
    http.get<{ items: Array<{ name: string; doctor_count: number; starting_fee: number }> }>(
      "/specialties",
    ),
  list: (params?: Record<string, string | number | undefined>) =>
    http.get<Paginated<Doctor>>("/doctors", { params }),
  get: (id: string) => http.get<Doctor>(`/doctors/${id}`),
  slots: (doctorId: string, mode?: string) =>
    http.get<Slot[]>("/slots", { params: { doctor_id: doctorId, mode } }),
};

export const appointmentService = {
  book: (payload: {
    doctor_id: string;
    slot_id: string;
    mode?: string;
    intake?: Record<string, unknown>;
  }) => http.post<{ id: string; status: string; payment_status: string; fee: number }>("/appointments", payload),
  consent: (id: string) =>
    http.post<{ consent_id: string; status: string }>(`/appointments/${id}/consent`, {
      purpose: "teleconsultation",
      accepted: true,
    }),
  pay: (id: string) => http.post(`/appointments/${id}/pay`, {}),
  list: () => http.get<{ items: Appointment[] }>("/appointments"),
  cancel: (id: string) => http.post(`/appointments/${id}/cancel`),
  videoToken: (consultationId: string) =>
    http.get<{ room_id: string; token: string; provider: string; modes: string[] }>(
      `/consultations/${consultationId}/token`,
    ),
};

export const prescriptionService = {
  list: () => http.get<{ items: Prescription[] }>("/prescriptions"),
  create: (payload: {
    consultation_id: string;
    signature: string;
    items: Array<{
      product_id?: string;
      drug_name: string;
      schedule_tier?: string;
      dose: string;
      frequency: string;
      duration: string;
      instructions?: string;
    }>;
  }) => http.post("/prescriptions", payload),
};
