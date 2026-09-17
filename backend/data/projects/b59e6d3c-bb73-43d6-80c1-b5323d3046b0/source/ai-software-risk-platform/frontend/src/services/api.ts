import axios, { AxiosError, type AxiosInstance } from "axios";

import type { HealthResponse } from "../types/api";

const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000/api/v1";

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Calls the backend health-check endpoint.
 *
 * Throws on network failure or non-2xx responses so callers can decide
 * how to represent "offline" state in the UI (see useHealthCheck).
 */
export async function fetchHealth(): Promise<HealthResponse> {
  const response = await apiClient.get<HealthResponse>("/health");
  return response.data;
}

interface ApiErrorPayload {
  message?: string;
}

/** Type guard-friendly helper for extracting a readable error message. */
export function getApiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as ApiErrorPayload | undefined;
    return payload?.message ?? error.message ?? "Network error";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}
