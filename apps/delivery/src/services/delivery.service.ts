import { http } from "@/services/api/http-client";
import type { OrderSummary } from "@/types/api";
export const deliveryService = {
  listOrders: () => http.get<{ items: OrderSummary[] }>("/orders"),
  advance: (id: string) => http.post(`/orders/${id}/advance`),
  track: (id: string) => http.get(`/orders/${id}/tracking`),
};
