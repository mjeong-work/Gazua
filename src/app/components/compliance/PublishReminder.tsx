import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

// Small reminder shown above the Publish action in CreatePostModal / CreateReelModal —
// distinct from ContentDisclaimer (which is reader-facing, shown on published content).
// This is author-facing, shown at compose time, before ComplianceReviewModal's
// screening/disclosure flow even runs.
//
// variant='default' — the original bordered block (CreatePostModal).
// variant='footer'  — a lighter, icon-led caption line for full-screen composers where a
//                      border would read as an unwanted section divider (CreateReelModal).
export default function PublishReminder({
  className = '',
  variant = 'default',
}: {
  className?: string;
  variant?: 'default' | 'footer';
}) {
  if (variant === 'footer') {
    return (
      <div className={`flex items-start gap-1.5 ${className}`}>
        <InfoOutlinedIcon sx={{ fontSize: 14, color: 'var(--icon-muted)' }} className="mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-gray-400 leading-snug">
          Please share research, not investment recommendations. Avoid misleading claims or guarantees of returns.
        </p>
      </div>
    );
  }

  return (
    <div className={`border-t border-gray-100 pt-3 ${className}`}>
      <p className="text-xs text-gray-500 leading-snug">
        <span className="font-medium text-gray-600">Remember: </span>
        Please share research, not investment recommendations. Avoid misleading claims or guarantees of returns.
      </p>
    </div>
  );
}
