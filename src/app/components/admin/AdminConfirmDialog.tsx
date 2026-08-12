import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';

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

// Built on ui/dialog.tsx (Radix Dialog) — see audit Issue 9. Always rendered `open` since the
// caller already only mounts this component when it should be shown ({showDialog && <.../>});
// onOpenChange routes Radix's own close triggers (Escape, overlay click, the built-in X button)
// back through the same onClose prop callers already pass.
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
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm rounded-md p-6">
        <DialogTitle className="text-base font-bold mb-1">{title}</DialogTitle>
        {body ? (
          <DialogDescription className="text-sm text-neutral-500 mb-4">{body}</DialogDescription>
        ) : (
          <DialogDescription className="sr-only">{title}</DialogDescription>
        )}

        {withNotes && (
          <textarea
            autoFocus
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={notesPlaceholder}
            rows={3}
            className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-sm resize-none focus:outline-none focus:border-neutral-400 mb-4"
          />
        )}

        <div className={`flex items-center justify-end gap-2 ${withNotes ? '' : 'mt-2'}`}>
          <Button
            onClick={onClose}
            disabled={submitting}
            variant="pillOutline"
            className="px-4 py-2 h-auto text-xs"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting}
            className={`px-4 py-2 h-auto text-xs rounded-sm text-white ${
              destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-black/80'
            }`}
          >
            {submitting ? '…' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
