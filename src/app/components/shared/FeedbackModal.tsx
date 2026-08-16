import { useState } from 'react';
import { toast } from 'sonner';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../contexts/AuthContext';
import { submitFeedback } from '../../../lib/services/feedback.service';
import { Button } from '../ui/button';
import Overlay from '../myProfile/Overlay';

const MAX_MESSAGE_LENGTH = 2000;

interface FeedbackModalProps {
  onClose: () => void;
}

// Beta-readiness item: up to now a beta tester who hit a bug had no way to tell us short of
// texting/emailing someone directly. Deliberately minimal (one textarea, no category picker,
// no severity dropdown) — the goal is a low-friction "something's off" button, not a support
// ticket system. Reachable from Profile Settings' Account Actions section.
export default function FeedbackModal({ onClose }: FeedbackModalProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!user?.id || !message.trim()) return;
    setSubmitting(true);
    setError(null);

    const { error: err } = await submitFeedback(user.id, message, window.location.href);

    setSubmitting(false);

    if (err) {
      setError(err);
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Overlay onClose={onClose}>
        <div className="bg-white rounded-md shadow-xl w-[min(420px,90vw)] p-6 text-center">
          <h2 className="text-lg font-bold mb-2">Thanks for the feedback</h2>
          <p className="text-sm text-neutral-600 mb-5">We read every submission — this genuinely helps.</p>
          <Button variant="pill" size="pill" onClick={onClose} className="w-full">Done</Button>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-md shadow-xl w-[min(480px,90vw)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Send Feedback</h2>
          <button onClick={onClose} className="icon-tap-target p-1 hover:bg-neutral-100 rounded-full transition-colors" aria-label="Close">
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        <p className="text-sm text-neutral-500 mb-3">
          Found a bug, or something feels off? Tell us what happened — the page you're on right now is included automatically.
        </p>

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          placeholder="What happened?"
          rows={5}
          autoFocus
          className="w-full border border-neutral-200 rounded-sm px-3 py-2 text-sm resize-none focus:outline-none focus:border-neutral-400 transition-colors"
        />
        <div className="flex items-center justify-between mt-1 mb-4">
          {error ? (
            <p className="text-xs text-red-600">{error}</p>
          ) : <span />}
          <span className="text-xs text-neutral-400">{message.length}/{MAX_MESSAGE_LENGTH}</span>
        </div>

        <Button
          variant="pill"
          size="pill"
          onClick={handleSubmit}
          disabled={submitting || !message.trim()}
          className="w-full disabled:opacity-50"
        >
          {submitting ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </Overlay>
  );
}
