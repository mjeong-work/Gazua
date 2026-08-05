import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { ServiceResult } from '../../lib/supabase';

/**
 * Shows the standardized "couldn't load X" toast with a Retry action. Exported standalone (not
 * just via useServiceQuery below) so call sites with more custom fetch shapes — chained fetches,
 * fetches inside a realtime subscription callback, mutations — can still get the same error UX
 * without being forced into the generic hook's shape.
 */
export function reportServiceError(error: string, options: { label?: string; retry?: () => void } = {}) {
  const { label, retry } = options;
  toast.error(label ? `Couldn't load ${label}. ${error}` : error, {
    action: retry ? { label: 'Retry', onClick: retry } : undefined,
  });
}

interface UseServiceQueryOptions {
  /** Skip the fetch entirely — e.g. while a required id/user is still null. */
  enabled?: boolean;
  /** Used in the error toast: "Couldn't load {label}." */
  label?: string;
}

/**
 * Replaces the `fetcher().then(({ data }) => setX(data ?? fallback))` pattern that silently
 * drops `error` — a failed request then renders identically to "genuinely empty", with no
 * feedback or way to retry. Runs `fetcher` whenever `deps` changes (same contract as
 * useEffect's own deps array), tracks loading/error, and on failure shows a toast with a Retry
 * action that re-runs the same fetch.
 */
export function useServiceQuery<T>(
  fetcher: () => Promise<ServiceResult<T>>,
  deps: unknown[],
  options: UseServiceQueryOptions = {},
) {
  const { enabled = true, label } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  // Always call the latest fetcher/label without making them part of the effect's own deps —
  // callers pass a fresh closure every render, and re-running on that would defeat `deps`.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const labelRef = useRef(label);
  labelRef.current = label;

  const run = useCallback(() => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      return () => {};
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcherRef.current().then(({ data, error }) => {
      if (cancelled) return;
      setLoading(false);
      if (error) {
        setError(error);
        reportServiceError(error, { label: labelRef.current, retry: run });
        return;
      }
      setData(data);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => run(), deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch: run };
}
