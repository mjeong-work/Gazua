import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface MockFallbackNoticeProps {
  className?: string;
  /** Default copy assumes a content list; override for other contexts (e.g. search results). */
  message?: string;
}

// Shown whenever a page's own dbX === null "use mock fallback" signal is genuinely the error
// case (fetch failed / Supabase unreachable), not "still loading" or "really empty" — those
// render their own loading/empty states instead. Without this, a real user watching a failed
// fetch silently substituted with demo content has no way to tell the difference (audit
// finding) — same underlying MOCK_POSTS/MOCK_REELS/MOCK_CREATORS fallback pattern used in
// MainPagePosting.tsx, MainPageReels.tsx, and SearchModal.tsx.
export default function MockFallbackNotice({ className = '', message }: MockFallbackNoticeProps) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-sm text-xs text-amber-800 ${className}`}>
      <WarningAmberIcon sx={{ fontSize: 14 }} className="flex-shrink-0" />
      <span>{message ?? "Couldn't load live content — showing examples instead."}</span>
    </div>
  );
}
