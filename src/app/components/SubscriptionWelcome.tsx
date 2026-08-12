import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// ── Tier content ─────────────────────────────────────────────────────────────

const TIERS = {
  analyst: {
    name: 'Analyst',
    price: '$14.99 / month',
    headline: (name: string | null) =>
      name ? `Welcome to Analyst, ${name}.` : 'You are now an Analyst.',
    subtitle: "You've unlocked the full creator feed, advanced analytics, and portfolio tools.",
    features: [
      'Unlimited creator content',
      'Advanced market analytics',
      'Portfolio tracking tools',
      'Real-time notifications',
      'Priority support',
      'Ad-free experience',
    ],
  },
  educator: {
    name: 'Educator',
    price: '$29.99 / month',
    headline: (name: string | null) =>
      name ? `Welcome to Educator, ${name}.` : 'You are now an Educator.',
    subtitle: "Your creator studio is ready. Start publishing, building your audience, and earning.",
    features: [
      'Creator studio access',
      'Monetization tools',
      'Advanced analytics dashboard',
      'Custom channel branding',
      'Subscriber management',
      'API access',
    ],
  },
} as const

// ── Component ─────────────────────────────────────────────────────────────────

export default function SubscriptionWelcome() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { profile, refreshProfile } = useAuth()
  const [visible, setVisible] = useState(false)

  const tierKey = params.get('tier') === 'educator' ? 'educator' : 'analyst'
  const config = TIERS[tierKey]
  const firstName = profile?.full_name?.split(' ')[0] ?? null

  useEffect(() => {
    setTimeout(() => setVisible(true), 80)
    refreshProfile()
  }, [refreshProfile])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div
        className={`max-w-md w-full text-center transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        {/* Plan badge */}
        <div className="inline-flex items-center bg-mint/20 border border-mint/50 px-4 py-1.5 rounded-sm text-xs font-medium text-brand mb-4">
          {config.name} Plan activated
        </div>

        {/* Headline */}
        <h1 className="text-3xl font-bold mb-3">
          {config.headline(firstName)}
        </h1>

        {/* Subtitle */}
        <p className="text-neutral-500 leading-relaxed mb-2">
          {config.subtitle}
        </p>
        <p className="text-sm text-neutral-400 mb-10">
          {config.price} · Cancel anytime
        </p>

        {/* Feature list */}
        <div className="bg-neutral-50 rounded-md px-6 py-5 mb-8 text-left">
          <p className="text-xs text-neutral-400 font-medium uppercase tracking-widest mb-4">
            What you now have access to
          </p>
          <ul className="space-y-3">
            {config.features.map(feature => (
              <li key={feature} className="flex items-center gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-mint rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-black" strokeWidth={3} />
                </span>
                <span className="text-sm text-neutral-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA — black rounded-sm, matches Complete.tsx */}
        <button
          onClick={() => navigate('/main')}
          className="w-full px-8 py-4 bg-black text-white rounded-sm hover:bg-black/90 transition-colors mb-5"
        >
          Explore the Feed
        </button>

        {/* Secondary */}
        <p className="text-xs text-neutral-400">
          Manage billing in{' '}
          <button
            onClick={() => navigate('/my-profile/settings')}
            className="underline underline-offset-2 hover:text-neutral-600 transition-colors"
          >
            your profile settings
          </button>
        </p>
      </div>
    </div>
  )
}
