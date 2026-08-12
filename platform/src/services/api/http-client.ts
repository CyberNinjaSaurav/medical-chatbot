import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { ApiError } from "@/services/api/api-error";
import { tokenStorage } from "@/services/api/token-storage";
import type { ApiErrorBody, TokenPair } from "@/types/api";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const http = axios.create({
  baseURL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) return null;
  try {
    const { data } = await axios.post<TokenPair>(`${baseURL}/auth/refresh`, {
      refresh_token: refresh,
    });
    tokenStorage.set(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    tokenStorage.clear();
    return null;
  }
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const access = await refreshPromise;
      if (access) {
        original.headers.Authorization = `Bearer ${access}`;
        return http(original);
      }
    }
    if (error.response?.data?.code) {
      throw new ApiError(error.response.status, error.response.data);
    }
    throw new ApiError(error.response?.status ?? 500, {
      code: "NETWORK_ERROR",
      message: error.message || "Network error",
    });
  },
);
