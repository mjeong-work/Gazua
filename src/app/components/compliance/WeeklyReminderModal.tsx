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
        className="bg-white dark:bg-neutral-900 rounded-2xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-bold dark:text-white">Before You Continue</h2>
          <button
            onClick={dismiss}
            className="p-1.5 -mt-1 -mr-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
            aria-label="Dismiss reminder"
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
          Remember
        </p>
        <ul className="space-y-2 mb-6">
          {REMINDERS.map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 leading-snug">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-600 flex-shrink-0" />
              {line}
            </li>
          ))}
        </ul>

        <button
          onClick={dismiss}
          className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-bold hover:bg-black/80 dark:hover:bg-white/80 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
