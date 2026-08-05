import { useState } from 'react';

interface AdminConfirmDialogProps {
  title: string;
  body?: string;
  /** Shows a moderator-notes textarea and passes its (optional) value to onConfirm. */
  withNotes?: boolean;
  notesPlaceholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for destructive actions (remove/suspend) vs. black for others. */
  destructive?: boolean;
  onConfirm: (notes?: string) => void;
  onClose: () => void;
}

// Reuses the app's real modal convention (MyProfilePage.tsx's Overlay component) rather than
// the unused ui/dialog.tsx — fixed inset-0 + centered backdrop + stopPropagation inner wrapper.
export default function AdminConfirmDialog({
  title,
  body,
  withNotes = false,
  notesPlaceholder = 'Notes (optional, saved with audit log)',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onClose,
}: AdminConfirmDialogProps) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = () => {
    setSubmitting(true);
    onConfirm(withNotes ? notes.trim() || undefined : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-2xl border border-neutral-200 shadow-xl p-6"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2 className="text-base font-bold mb-1">{title}</h2>
        {body && <p className="text-sm text-neutral-500 mb-4">{body}</p>}

        {withNotes && (
          <textarea
            autoFocus
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={notesPlaceholder}
            rows={3}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm resize-none focus:outline-none focus:border-neutral-400 mb-4"
          />
        )}

        <div className={`flex items-center justify-end gap-2 ${withNotes ? '' : 'mt-2'}`}>
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-medium rounded-full border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className={`px-4 py-2 text-xs font-medium rounded-full text-white transition-colors disabled:opacity-50 ${
              destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-black/80'
            }`}
          >
            {submitting ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
