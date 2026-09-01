import { http } from "@/services/api/http-client";
import type { OrderSummary } from "@/types/api";
export const pharmacyService = {
  listOrders: () => http.get<{ items: OrderSummary[] }>("/orders"),
  getOrder: (id: string) => http.get(`/orders/${id}`),
  verify: (id: string, note?: string) => http.post(`/orders/${id}/pharmacist/verify`, { note }),
  reject: (id: string, reason: string) => http.post(`/orders/${id}/pharmacist/reject`, { reason }),
  advance: (id: string) => http.post(`/orders/${id}/advance`),
  h1Register: () => http.get<{ items: Array<Record<string, unknown>> }>("/admin/compliance/h1-register"),
};
