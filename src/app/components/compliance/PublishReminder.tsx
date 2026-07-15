// Small reminder shown above the Publish action in CreatePostModal / CreateReelModal —
// distinct from ContentDisclaimer (which is reader-facing, shown on published content).
// This is author-facing, shown at compose time, before ComplianceReviewModal's
// screening/disclosure flow even runs.
export default function PublishReminder({ className = '' }: { className?: string }) {
  return (
    <div className={`border-t border-gray-100 pt-3 ${className}`}>
      <p className="text-xs text-gray-500 leading-snug">
        <span className="font-medium text-gray-600">Remember: </span>
        Please share research, not investment recommendations. Avoid misleading claims or guarantees of returns.
      </p>
    </div>
  );
}
