import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AppHeader from './AppHeader';
import { signOut } from '../../lib/auth.service';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { supabase } from '../../lib/supabase';

const TIER_CONFIG: Record<string, { label: string; badge: string; features: string[] }> = {
  free: {
    label: 'Explorer',
    badge: 'bg-gray-100 text-gray-700',
    features: [
      'Access to community posts',
      'Basic market data',
      'Limited creator content',
      'Educational resources',
    ],
  },
  analyst: {
    label: 'Analyst',
    badge: 'bg-mint/30 text-green-800',
    features: [
      'Everything in Explorer',
      'Unlimited creator content',
      'Advanced market analytics',
      'Portfolio tracking tools',
    ],
  },
  educator: {
    label: 'Educator',
    badge: 'bg-black text-white',
    features: [
      'Everything in Analyst',
      'Creator studio access',
      'Monetization tools',
      'Advanced analytics dashboard',
    ],
  },
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  experienced: 'Experienced',
  confident: 'Confident',
};

const RISK_LABELS: Record<string, string> = {
  conservative: 'Conservative',
  balanced: 'Balanced',
  aggressive: 'Aggressive',
  speculative: 'Speculative',
};

// Reached via the gear icon on My Profile (Profile > Settings) — was previously its own
// top-level "Account" destination; see /account's legacy redirect in App.tsx.
export default function ProfileSettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const { user, profile, refreshProfile } = useAuth();
  const { data: onboarding } = useOnboarding();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // After a successful checkout Stripe webhooks update the DB asynchronously.
  // Poll refreshProfile until the tier changes or we time out (10 s).
  useEffect(() => {
    if (searchParams.get('subscription') !== 'success') return;
    toast.success('Payment received! Activating your subscription…');

    let attempts = 0;
    pollRef.current = setInterval(async () => {
      await refreshProfile();
      attempts++;
      if (attempts >= 5) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        toast.success('Subscription activated! Welcome to your new plan.');
      }
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [searchParams, refreshProfile]);

  // Stop polling once tier flips away from free
  useEffect(() => {
    if (profile?.subscription_tier && profile.subscription_tier !== 'free' && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
      toast.success('Subscription activated! Welcome to your new plan.');
    }
  }, [profile?.subscription_tier]);

  async function handleBillingPortal() {
    if (!user) return;
    setPortalLoading(true);
    try {
      // userId is now derived server-side from the verified JWT; no body needed
      const { data, error } = await supabase.functions.invoke('stripe-billing-portal', {
        body: {},
      });
      if (error || !data?.url) {
        toast.error('Could not open billing portal. Please try again.');
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setPortalLoading(false);
    }
  }

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      const { error } = await signOut();
      if (error) {
        toast.error('Sign out failed. Please try again.');
        return;
      }
      navigate('/signin', { replace: true });
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const tier = profile?.subscription_tier ?? 'free';
  const tierConfig = TIER_CONFIG[tier] ?? TIER_CONFIG.free;

  const initials = (() => {
    const name = profile?.full_name ?? profile?.username ?? user?.email ?? '?';
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase() ?? '')
      .join('');
  })();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AppHeader />

      <div className="flex-1 px-4 py-8 w-full max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/my-profile')}
            className="icon-tap-target p-1.5 -ml-1.5 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Back to profile"
          >
            <ArrowBackIcon sx={{ fontSize: 20 }} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>

        {/* ── 1. Profile ─────────────────────────────────────────── */}
        <section className="border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-mint flex items-center justify-center text-xl font-bold text-gray-800 shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-base font-semibold text-gray-900 truncate">
                {profile?.full_name || '—'}
              </p>
              <p className="text-sm text-gray-500 truncate">
                @{profile?.handle ?? profile?.username ?? '—'}
              </p>
              {user?.email && (
                <p className="text-sm text-gray-400 truncate">{user.email}</p>
              )}
            </div>
          </div>
          <button
            className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit Profile
          </button>
        </section>

        {/* ── 2. Subscription ────────────────────────────────────── */}
        <section className="border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-700">Subscription</p>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${tierConfig.badge}`}>
              {tierConfig.label}
            </span>
          </div>

          <ul className="space-y-2 mb-5">
            {tierConfig.features.map(f => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                <span className="text-brand font-bold leading-none">✓</span>
                {f}
              </li>
            ))}
          </ul>

          {tier === 'free' ? (
            <button
              onClick={() => navigate('/pricing')}
              className="w-full py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-colors"
            >
              Upgrade Plan
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/pricing')}
                className="flex-1 py-2.5 border border-brand text-brand rounded-xl text-sm font-medium hover:bg-brand/5 transition-colors"
              >
                Manage Subscription
              </button>
              <button
                onClick={handleBillingPortal}
                disabled={portalLoading}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {portalLoading ? 'Opening…' : 'Billing Portal'}
              </button>
            </div>
          )}
        </section>

        {/* ── 3. Preferences ─────────────────────────────────────── */}
        <section className="border border-gray-200 rounded-2xl p-6">
          <p className="text-sm font-semibold text-gray-700 mb-4">Investment Preferences</p>

          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Experience level</span>
              <span className="text-sm font-medium text-gray-800">
                {onboarding.level ? (LEVEL_LABELS[onboarding.level] ?? onboarding.level) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Risk style</span>
              <span className="text-sm font-medium text-gray-800">
                {onboarding.riskStyle ? (RISK_LABELS[onboarding.riskStyle] ?? onboarding.riskStyle) : '—'}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-500 block mb-2">Interests</span>
              {onboarding.interests.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {onboarding.interests.map(i => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 bg-mint/30 text-green-800 rounded-full font-medium"
                    >
                      {i}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm font-medium text-gray-800">—</span>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/onboarding/level')}
            className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit Preferences
          </button>
        </section>

        {/* ── 4. Account actions ─────────────────────────────────── */}
        <section className="border border-gray-200 rounded-2xl p-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">Account Actions</p>
          <button
            onClick={handleSignOut}
            disabled={isLoading}
            className="w-full py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing out…' : 'Sign Out'}
          </button>
        </section>
      </div>
    </div>
  );
}
