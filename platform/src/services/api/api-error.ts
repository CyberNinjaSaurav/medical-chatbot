import type { ApiErrorBody } from "@/types/api";

export class ApiError extends Error {
  code: string;
  details?: unknown;
  requestId?: string;
  status: number;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.details = body.details;
    this.requestId = body.request_id;
  }
}
