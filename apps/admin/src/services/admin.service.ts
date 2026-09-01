import { http } from "@/services/api/http-client";
export const adminService = {
  dashboard: () => http.get<Record<string, number>>("/admin/dashboard"),
  audit: () => http.get<{ items: Array<Record<string, unknown>> }>("/admin/audit"),
  h1Register: () => http.get<{ items: Array<Record<string, unknown>> }>("/admin/compliance/h1-register"),
  createProduct: (payload: Record<string, unknown>) => http.post("/admin/catalog", payload),
  approveProduct: (id: string) => http.post(`/admin/catalog/${id}/approve`),
  onboardDoctor: (payload: Record<string, unknown>) => http.post("/admin/ops/doctors", payload),
  seedProduct: (payload: Record<string, unknown>) => http.post("/admin/ops/products", payload),
  createPharmacist: (payload: Record<string, unknown>) => http.post("/admin/ops/pharmacist", payload),
  createDelivery: (payload: Record<string, unknown>) => http.post("/admin/ops/delivery", payload),
};
export const ordersService = {
  list: () => http.get<{ items: Array<Record<string, unknown>> }>("/orders"),
};
