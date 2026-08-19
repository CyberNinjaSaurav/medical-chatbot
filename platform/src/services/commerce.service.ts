import { http } from "@/services/api/http-client";
import type { OrderSummary, Paginated, Product } from "@/types/api";

export const pharmacyService = {
  products: (params?: Record<string, string | number | undefined>) =>
    http.get<Paginated<Product>>("/products", { params }),
  product: (id: string) => http.get<Product>(`/products/${id}`),
  createOrder: (payload: {
    items: Array<{ product_id: string; qty: number }>;
    address: Record<string, unknown>;
    prescription_id?: string | null;
    delivery_slot?: string;
  }) =>
    http.post<{ id: string; status: string; total: number; tracking_code: string }>("/orders", payload),
  payOrder: (id: string) => http.post<{ status: string; payment_id: string }>(`/orders/${id}/pay`),
  listOrders: () => http.get<{ items: OrderSummary[] }>("/orders"),
  getOrder: (id: string) => http.get(`/orders/${id}`),
  track: (id: string) => http.get(`/orders/${id}/tracking`),
  fromPrescription: (prescriptionId: string, address: Record<string, unknown>) =>
    http.post<{ id: string; status: string; total: number; tracking_code: string }>(
      `/orders/from-prescription/${prescriptionId}`,
      { address },
    ),
  subscriptions: () =>
    http.get<{
      items: Array<{
        id: string;
        product_id: string;
        cadence_days: number;
        status: string;
        next_refill_at?: string | null;
      }>;
    }>("/subscriptions"),
  createSubscription: (payload: {
    product_id: string;
    cadence_days?: number;
    next_refill_at?: string;
  }) => http.post("/subscriptions", payload),
};

export const notificationService = {
  list: (params?: { cursor?: number; unread_only?: boolean }) =>
    http.get<{ items: import("@/types/api").NotificationItem[]; next_cursor?: number | null }>(
      "/notifications",
      { params },
    ),
  markRead: (id: string) => http.post(`/notifications/${id}/read`),
  archive: (id: string) => http.post(`/notifications/${id}/archive`),
};

export const recordsService = {
  timeline: () => http.get<{ items: Array<Record<string, unknown>> }>("/records/timeline"),
  consents: () => http.get<{ items: Array<Record<string, unknown>> }>("/records/consents"),
  createConsent: (purpose: string, scope?: string) =>
    http.post("/records/consents", { purpose, scope }),
  revokeConsent: (id: string) => http.post(`/records/consents/${id}/revoke`),
};

export const labService = {
  tests: () => http.get<{ items: Array<Record<string, unknown>> }>("/labs/tests"),
  book: (payload: { test_id: string; collection_slot?: string; address?: Record<string, unknown> }) =>
    http.post("/labs/bookings", payload),
  bookings: () => http.get<{ items: Array<Record<string, unknown>> }>("/labs/bookings"),
  report: (id: string) => http.get(`/labs/reports/${id}`),
};
