import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

const RELOAD_GUARD_KEY = 'gazua_chunk_reload_guard';

// True for the classic "we shipped a new build while you had an old page open" failure — the
// browser tries to fetch a route's JS chunk by its old (now-deleted) hashed filename and 404s.
// Distinct from a genuine render-time bug: the fix here is just "reload the page" (the reload
// fetches the current build's chunk map), not "show an error screen".
function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|importing a module script failed|loading chunk|chunkloaderror/i.test(message);
}

// Top-level safety net (audit finding — no ErrorBoundary existed anywhere in the app, so any
// render-time exception, or a stale-chunk fetch failure after a redeploy, white-screened the
// whole app with no recovery). Two failure modes, handled differently:
//  - Stale chunk after a redeploy: reload once automatically (sessionStorage-guarded so a
//    genuinely broken deploy doesn't reload-loop forever) — barely visible to the user.
//  - Any other render-time exception: show a plain recovery screen instead of a blank page.
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isStaleChunkError(error)) {
      let alreadyReloaded = false;
      try {
        alreadyReloaded = sessionStorage.getItem(RELOAD_GUARD_KEY) === '1';
      } catch {
        // sessionStorage unavailable (private mode, etc.) — fall through to the error screen.
      }
      if (!alreadyReloaded) {
        try {
          sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
        } catch {
          // ignore — worst case this one reload isn't guarded against looping
        }
        window.location.reload();
        return;
      }
    }
    // No error-reporting service wired up yet (audit finding) — console is the only record for now.
    console.error('Unhandled render error caught by ErrorBoundary:', error, info.componentStack);
  }

  handleReload = () => {
    try {
      sessionStorage.removeItem(RELOAD_GUARD_KEY);
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-white px-6">
          <div className="max-w-sm text-center">
            <h1 className="text-lg font-semibold text-neutral-900">문제가 발생했어요</h1>
            <p className="mt-2 text-sm text-neutral-500">
              페이지를 표시하는 중 오류가 발생했습니다. 새로고침하면 대부분 해결됩니다.
            </p>
            <button
              onClick={this.handleReload}
              className="mt-6 px-6 py-2.5 bg-brand text-white text-sm font-medium rounded-full hover:bg-brand-hover transition-colors"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
