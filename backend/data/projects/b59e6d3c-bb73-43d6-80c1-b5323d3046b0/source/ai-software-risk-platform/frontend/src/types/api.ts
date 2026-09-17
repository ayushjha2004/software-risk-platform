/**
 * Shared response types mirroring the backend's Pydantic schemas.
 * Keep these in sync with `backend/app/schemas/*.py`.
 */

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

export interface RootResponse {
  message: string;
  status: string;
}

/** Discriminated union representing backend connectivity state on the UI. */
export type BackendStatus = "checking" | "connected" | "offline";
