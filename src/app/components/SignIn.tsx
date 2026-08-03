import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { signInWithEmail, signInWithGoogle, resetPasswordForEmail } from '../../lib/auth.service';
import { getProfile } from '../../lib/services/profiles.service';

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  // If AuthGuard stored the original destination, use it; otherwise go to /main.
  const from = (location.state as { from?: string })?.from ?? '/main';

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading]           = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError]           = useState<string | null>(null);

  // Forgot-password mini-form
  const [forgotMode, setForgotMode]         = useState(false);
  const [resetEmail, setResetEmail]         = useState('');
  const [resetSent, setResetSent]           = useState(false);
  const [resetLoading, setResetLoading]     = useState(false);
  const [resetError, setResetError]         = useState<string | null>(null);

  // ── Email sign-in ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoading(true);

    const { data, error } = await signInWithEmail(email, password);

    if (error || !data?.user) {
      setIsLoading(false);
      setAuthError(error ?? 'Sign in failed. Please try again.');
      return;
    }

    // Check onboarding status to decide where to land. Keep isLoading=true until navigate.
    const { data: profile } = await getProfile(data.user.id);
    navigate(profile?.onboarding_completed ? from : '/onboarding/level', { replace: true });
  };

  // ── Google OAuth ───────────────────────────────────────────────
  const handleGoogle = async () => {
    setAuthError(null);
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle();
    // On success Supabase redirects away — we only land here on error.
    setIsGoogleLoading(false);
    if (error) setAuthError(error);
  };

  // ── Reset password ─────────────────────────────────────────────
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetLoading(true);
    const { error } = await resetPasswordForEmail(resetEmail);
    setResetLoading(false);
    if (error) { setResetError(error); return; }
    setResetSent(true);
  };

  // ── Forgot-password view ───────────────────────────────────────
  if (forgotMode) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6 relative">
        <button
          onClick={() => { setForgotMode(false); setResetSent(false); setResetError(null); }}
          className="absolute top-6 left-6 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Back
        </button>

        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Gazua</h1>
            <p className="text-gray-600">Reset your password</p>
          </div>

          {resetSent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-mint rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">Check your email</h2>
              <p className="text-gray-600 text-sm mb-6">
                We've sent a password reset link to <strong>{resetEmail}</strong>.
              </p>
              <button
                onClick={() => { setForgotMode(false); setResetSent(false); }}
                className="w-full px-8 py-4 bg-black text-white rounded-full hover:bg-black/90 transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label htmlFor="resetEmail" className="block text-sm font-medium mb-2">Email</label>
                <input
                  id="resetEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint/50"
                />
              </div>

              {resetError && (
                <p className="text-sm text-red-500">{resetError}</p>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full px-8 py-4 bg-black text-white rounded-full hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Sending…
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ── Main sign-in view ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 relative">
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 right-6 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        ← Back
      </button>

      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Gazua</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setAuthError(null); }}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint/50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium">Password</label>
              <button
                type="button"
                onClick={() => { setForgotMode(true); setResetEmail(email); }}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <input
              id="password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={e => { setPassword(e.target.value); setAuthError(null); }}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint/50"
            />
          </div>

          {/* Inline auth error */}
          {authError && (
            <p className="text-sm text-red-500">{authError}</p>
          )}

          {/* Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isGoogleLoading}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
              <>
                <span className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                <span className="font-medium">Connecting…</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.438 15.983 5.482 18 9.003 18z" fill="#34A853"/>
                  <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.482 0 2.438 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
                </svg>
                <span className="font-medium">Continue with Google</span>
              </>
            )}
          </button>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-8 py-4 bg-black text-white rounded-full hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Signing in…
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/onboarding/welcome')}
            className="font-medium text-black hover:underline"
          >
            Get started
          </button>
        </p>
      </div>
    </div>
  );
}
