export const APP_NAME = "GWAK";
export const API_PREFIX = "/api/v1";
export const CONTAINER_MAX = 1280;
export const PAGE_TRANSITION_MS = 200;

export const ORDER_STATUSES = [
  "created",
  "payment_pending",
  "paid",
  "rx_verification_pending",
  "verified",
  "packed",
  "dispatched",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "refunded",
  "rx_rejected",
] as const;

export const DRUG_TIERS = ["O", "A", "B", "H1", "PROHIBITED"] as const;
