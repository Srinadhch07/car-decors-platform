import { useCallback, useEffect, useState } from "react";
import { api, ApiRequestError } from "../lib/api/client";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Generic hook for fetching data from the API on mount.
 * Re-fetches when the fetcher function reference changes.
 */
export function useApi<T>(fetcher: () => Promise<T>): UseApiState<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const doFetch = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null });
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "An unexpected error occurred";
      setState({ data: null, loading: false, error: message });
    }
  }, [fetcher]);

  useEffect(() => {
    void doFetch();
  }, [doFetch]);

  return state;
}

/** Fetch active categories. */
export function useCategories() {
  return useApi(() => api.getCategories());
}
