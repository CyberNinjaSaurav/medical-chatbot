import { http } from "@/services/api/http-client";
export const appointmentService = {
  list: () => http.get<{ items: Array<Record<string, unknown>> }>("/appointments"),
};
export const consultService = {
  token: (id: string) => http.get(`/consultations/${id}/token`),
  notes: (id: string, body: Record<string, unknown>) => http.post(`/consultations/${id}/notes`, body),
};
export const prescriptionService = {
  create: (body: Record<string, unknown>) => http.post("/prescriptions", body),
  list: () => http.get<{ items: Array<Record<string, unknown>> }>("/prescriptions"),
};
