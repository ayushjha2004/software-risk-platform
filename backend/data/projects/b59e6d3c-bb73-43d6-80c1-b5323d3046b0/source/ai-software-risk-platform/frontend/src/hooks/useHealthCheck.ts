import { useEffect, useState } from "react";

import { fetchHealth } from "../services/api";
import type { BackendStatus, HealthResponse } from "../types/api";

interface UseHealthCheckResult {
  status: BackendStatus;
  health: HealthResponse | null;
  errorMessage: string | null;
}

/**
 * Calls the backend health endpoint once on mount and exposes a simple
 * connection status ("checking" | "connected" | "offline") that the
 * Dashboard uses to render "Backend Status: Connected/Offline".
 */
export function useHealthCheck(): UseHealthCheckResult {
  const [status, setStatus] = useState<BackendStatus>("checking");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchHealth()
      .then((data) => {
        if (!isMounted) return;
        setHealth(data);
        setStatus("connected");
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setStatus("offline");
        setErrorMessage(error instanceof Error ? error.message : "Unable to reach backend");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { status, health, errorMessage };
}
