import * as Sentry from '@sentry/react';

// Beta-readiness item — up to now a production error was invisible unless a user happened to
// report it (see ErrorBoundary.tsx and the new in-app feedback channel, both from the same
// audit pass). No-ops entirely when VITE_SENTRY_DSN isn't set, so local dev without a DSN
// configured behaves exactly as before — nothing breaks, nothing is sent anywhere.
export function initErrorMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Beta-scale traffic — capture everything rather than sampling, cost isn't a concern yet
    // at 20-30 users. Revisit if/when volume grows.
    tracesSampleRate: 1.0,
  });
}

/** Called from ErrorBoundary.componentDidCatch — separate from Sentry's own
 * <Sentry.ErrorBoundary> component since this app's ErrorBoundary already has bespoke
 * stale-chunk-reload handling that a drop-in replacement would lose. */
export function reportError(error: unknown, extra?: Record<string, unknown>) {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.captureException(error, extra ? { extra } : undefined);
}
