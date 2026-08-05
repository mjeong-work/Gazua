// Generalizes ModerationPage.tsx's centered-gray-text empty state with a configurable message.
interface AdminEmptyStateProps {
  message: string;
}

export default function AdminEmptyState({ message }: AdminEmptyStateProps) {
  return (
    <div className="text-center py-20">
      <p className="text-neutral-400 text-sm">{message}</p>
    </div>
  );
}
