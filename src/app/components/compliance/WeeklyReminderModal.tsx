import { useEffect, useState } from 'react';
import { differenceInDays } from 'date-fns';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../contexts/AuthContext';

const STORAGE_KEY = 'gazua_weekly_reminder_last_shown';
const REMINDER_INTERVAL_DAYS = 7;

const REMINDERS = [
  'Think independently.',
  'AI can make mistakes.',
  'Verify information using original public sources.',
  'Creator opinions are independent.',
  'Investing involves risk.',
  'Never rely solely on AI or community opinions.',
];

// Not a legal acceptance — a lightweight, dismissible UX nudge shown once every 7 days
// to a logged-in user. localStorage-only: unlike onboarding acceptance, this carries no
// compliance weight, so it doesn't need cross-device sync.
export default function WeeklyReminderModal() {
  const { isAuthenticated } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const lastShown = localStorage.getItem(STORAGE_KEY);
    if (!lastShown || differenceInDays(new Date(), new Date(lastShown)) >= REMINDER_INTERVAL_DAYS) {
      setShow(true);
    }
  }, [isAuthenticated]);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[55] p-4"
      onClick={dismiss}
    >
      <div
        className="bg-white rounded-md max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-bold">Before You Continue</h2>
          <button
            onClick={dismiss}
            className="icon-tap-target p-1.5 -mt-1 -mr-1 hover:bg-neutral-100 rounded-full transition-colors"
            aria-label="Dismiss reminder"
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">
          Remember
        </p>
        <ul className="space-y-2 mb-6">
          {REMINDERS.map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm text-neutral-700 leading-snug">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-neutral-400 flex-shrink-0" />
              {line}
            </li>
          ))}
        </ul>

        <button
          onClick={dismiss}
          className="w-full py-3 bg-black text-white rounded-full text-sm font-bold hover:bg-black/80 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
