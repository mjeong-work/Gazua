import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import AgreementCheckboxGroup, { type AgreementKey } from './AgreementCheckboxGroup';
import { signUpWithEmail, signInWithGoogle } from '../../../lib/auth.service';
import { recordLegalAcknowledgement } from '../../../lib/services/legal.service';
import { CheckCircle } from 'lucide-react';

const INITIAL_AGREEMENTS: Record<AgreementKey, boolean> = {
  educational_platform: false,
  no_advice: false,
  ai_inaccuracies: false,
  creator_opinions: false,
  sole_responsibility: false,
  terms: false,
  privacy: false,
};

export default function SignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [agreements, setAgreements] = useState<Record<AgreementKey, boolean>>(INITIAL_AGREEMENTS);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [agreementError, setAgreementError] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  const allAgreed = Object.values(agreements).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allAgreed || formData.password !== formData.confirmPassword) return;

    setAuthError(null);
    setIsSubmitLoading(true);

    // Use the email prefix as the initial full_name; user can update it later.
    const fullName = formData.email.split('@')[0];
    const { data, error } = await signUpWithEmail(formData.email, formData.password, fullName);

    setIsSubmitLoading(false);

    if (error) {
      setAuthError(error);
      return;
    }

    // When email confirmation is enabled, Supabase returns session: null.
    // Show a "check your email" screen instead of navigating to onboarding,
    // since the user has no active session yet.
    if (!data?.session) {
      setConfirmEmail(formData.email);
      return;
    }

    // The 7 checkboxes are a one-time acknowledgement event, not versioned documents —
    // logged to the existing compliance_audit_logs table rather than a new one.
    recordLegalAcknowledgement(data.session.user.id, { method: 'email_password', checkboxes: Object.keys(agreements) });

    navigate('/onboarding/level');
  };

  const handleGoogleAuth = async () => {
    if (!allAgreed) {
      setAgreementError(true);
      return;
    }
    setAgreementError(false);
    setAuthError(null);
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle({ intent: 'signup' });
    // On success Supabase redirects away — we only reach here on error.
    setIsGoogleLoading(false);
    if (error) setAuthError(error);
  };

  if (confirmEmail) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle className="w-16 h-16 text-brand" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold mb-3">Check your email</h2>
          <p className="text-neutral-600 mb-2">
            We sent a confirmation link to <strong>{confirmEmail}</strong>.
          </p>
          <p className="text-sm text-neutral-500 mb-8">
            Click the link to verify your account, then sign in.
          </p>
          <button
            onClick={() => navigate('/signin')}
            className="w-full px-8 py-4 bg-black text-white rounded-sm hover:bg-black/90 transition-colors"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 relative">
      {/* Skip link */}
      <button
        onClick={() => navigate('/main')}
        className="absolute top-6 right-6 text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
      >
        Skip →
      </button>

      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Gazua</h1>
          <p className="text-neutral-600">Create your account</p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-neutral-600 mb-2">
            <span>Step 1 of 4</span>
            <span>25%</span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2">
            <div className="bg-mint h-2 rounded-full transition-all" style={{ width: '25%' }}></div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-4 py-3 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-mint/50"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              className="w-full px-4 py-3 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-mint/50"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              className="w-full px-4 py-3 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-mint/50"
            />
          </div>

          {/* OAuth Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-neutral-500">or</span>
            </div>
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={isGoogleLoading}
            className="w-full px-4 py-3 border-2 border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-neutral-300 border-t-gray-600 rounded-full animate-spin"></div>
                <span className="font-medium">Authenticating...</span>
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

          {/* Responsible Investing Acknowledgement */}
          <div className="py-4">
            <AgreementCheckboxGroup
              values={agreements}
              onChange={(key, checked) => {
                setAgreements((prev) => ({ ...prev, [key]: checked }));
                if (checked) setAgreementError(false);
              }}
              className={agreementError ? 'border-red-400' : ''}
            />
            {agreementError && (
              <p className="text-xs text-red-500 mt-2">
                Please review and check all items before continuing.
              </p>
            )}
          </div>

          {/* Inline auth error */}
          {authError && (
            <p className="text-sm text-red-500">{authError}</p>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!allAgreed || formData.password !== formData.confirmPassword || isSubmitLoading}
            className="w-full px-8 py-4 bg-black text-white rounded-sm hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Creating account…
              </span>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        {/* Back link */}
        <button
          onClick={() => navigate('/onboarding/welcome')}
          className="w-full text-center text-sm text-neutral-500 hover:text-neutral-700 mt-6"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
