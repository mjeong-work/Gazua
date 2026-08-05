import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import { getProfile } from '../../lib/services/profiles.service';
import type { Session } from '@supabase/supabase-js';

async function resolveDestination(session: Session): Promise<string> {
  const { data: profile } = await getProfile(session.user.id);
  return profile?.onboarding_completed ? '/main' : '/onboarding/level';
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let handled = false;

    const handle = async (session: Session) => {
      if (handled) return;
      handled = true;
      const dest = await resolveDestination(session);
      navigate(dest, { replace: true });
    };

    // The Supabase client automatically exchanges the ?code= param from the URL.
    // Try the current session first (in case the exchange already completed).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handle(session);
    });

    // Also listen for the SIGNED_IN event fired after the code exchange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) handle(session);
      if (event === 'SIGNED_OUT') navigate('/signin', { replace: true });
    });

    // If neither fires within 10s, the code exchange failed — surface an error.
    const timeout = setTimeout(() => {
      if (!handled) setTimedOut(true);
    }, 10_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  if (timedOut) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <p className="text-sm text-neutral-700 font-medium">Sign-in failed</p>
          <p className="text-sm text-neutral-500">The link may have expired. Please try signing in again.</p>
          <button
            onClick={() => navigate('/signin', { replace: true })}
            className="px-6 py-2 bg-black text-white rounded-full text-sm hover:bg-black/90 transition-colors"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-neutral-200 border-t-black rounded-full animate-spin" />
        <p className="text-sm text-neutral-500">Signing you in…</p>
      </div>
    </div>
  );
}
