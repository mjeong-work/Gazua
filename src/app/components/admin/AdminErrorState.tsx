// No existing error-state precedent in this codebase (ModerationPage.tsx silently
// console.error's fetch failures) — this is new, matching the app's existing
// centered-message + black-pill-button conventions used elsewhere.
interface AdminErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function AdminErrorState({ message = 'Something went wrong.', onRetry }: AdminErrorStateProps) {
  return (
    <div className="text-center py-20">
      <p className="text-sm text-red-600 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-xs font-medium rounded-sm bg-black text-white hover:bg-black/80 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
