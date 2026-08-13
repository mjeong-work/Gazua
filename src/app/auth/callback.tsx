import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import { getProfile } from '../../lib/services/profiles.service';
import { recordLegalAcknowledgement } from '../../lib/services/legal.service';
import type { Session } from '@supabase/supabase-js';

async function resolveDestination(session: Session): Promise<string> {
  const { data: profile } = await getProfile(session.user.id);
  return profile?.onboarding_completed ? '/main' : '/onboarding/level';
}

/** Google (and Supabase) report a cancelled/failed OAuth attempt as ?error=...&error_description=...
 * on the redirect — never a ?code=. Checking for this up front means a cancelled consent
 * screen shows an explanation immediately instead of a spinner that only gives up after 10s. */
function readOAuthError(): string | null {
  const params = new URLSearchParams(window.location.search);
  const description = params.get('error_description');
  if (description) return description.replace(/\+/g, ' ');
  return params.get('error');
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(() => readOAuthError());

  useEffect(() => {
    if (oauthError) return;
    let handled = false;

    const handle = async (session: Session) => {
      if (handled) return;
      handled = true;

      // Only signInWithGoogle({ intent: 'signup' }) (SignUp.tsx's Google button, gated on the
      // same allAgreed checkboxes the email/password path requires) marks the redirect this
      // way — SignIn.tsx's Google button (returning users) does not, since it never presents
      // the terms first. recordLegalAcknowledgement itself is a no-op if this user already has
      // a current-version acceptance on file, so a repeat signup-intent login is still safe.
      // Wrapped in try/catch so an unexpected failure here (network blip, RLS surprise) can
      // never strand the user on this spinner — reaching the app matters more than this write
      // succeeding on the very first attempt.
      if (new URLSearchParams(window.location.search).get('intent') === 'signup') {
        try {
          await recordLegalAcknowledgement(session.user.id, { method: 'oauth_google' });
        } catch (err) {
          console.error('[AuthCallback] recordLegalAcknowledgement failed:', err);
        }
      }

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

    // If neither fires within 10s (e.g. the code exchange silently failed), surface an error
    // rather than spinning forever.
    const timeout = setTimeout(() => {
      if (!handled) setTimedOut(true);
    }, 10_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate, oauthError]);

  if (oauthError || timedOut) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <p className="text-sm text-neutral-700 font-medium">Sign-in failed</p>
          <p className="text-sm text-neutral-500">
            {oauthError ? oauthError : 'The link may have expired. Please try signing in again.'}
          </p>
          <button
            onClick={() => { setOauthError(null); navigate('/signin', { replace: true }); }}
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
