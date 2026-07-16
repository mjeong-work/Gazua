import { useState } from 'react';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Footer from './Footer';

type StripeTier = 'analyst' | 'educator'

export default function PricingPage() {
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const activeTier = profile?.subscription_tier ?? 'free';

  const tiers = [
    {
      name: 'Explorer',
      stripeTier: null as StripeTier | null,
      price: 0,
      period: 'Free forever',
      description: 'Perfect for getting started with investment education',
      features: [
        'Access to community posts',
        'Basic market data',
        'Limited creator content',
        'Educational resources',
        'Mobile app access'
      ],
      cta: 'Get Started',
      highlighted: false
    },
    {
      name: 'Analyst',
      stripeTier: 'analyst' as StripeTier,
      price: 14.99,
      period: '/month',
      description: 'Advanced tools and exclusive creator content',
      features: [
        'Everything in Explorer',
        'Unlimited creator content',
        'Advanced market analytics',
        'Portfolio tracking tools',
        'Real-time notifications',
        'Priority support',
        'Ad-free experience'
      ],
      cta: 'Start Free Trial',
      highlighted: true
    },
    {
      name: 'Educator',
      stripeTier: 'educator' as StripeTier,
      price: 29.99,
      period: '/month',
      description: 'For creators building their investment community',
      features: [
        'Everything in Analyst',
        'Creator studio access',
        'Monetization tools',
        'Advanced analytics dashboard',
        'Custom channel branding',
        'Subscriber management',
        'Revenue insights',
        'API access'
      ],
      cta: 'Start Creating',
      highlighted: false
    }
  ];

  async function handleTierClick(stripeTier: StripeTier | null) {
    if (!stripeTier) {
      navigate('/onboarding/welcome');
      return;
    }

    if (!user) {
      navigate('/signin', { state: { from: '/pricing' } });
      return;
    }

    setCheckoutLoading(stripeTier);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? (import.meta.env.VITE_SUPABASE_ANON_KEY as string);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
          },
          // userId and email are now derived server-side from the verified JWT
          body: JSON.stringify({ tier: stripeTier }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PricingPage] Checkout error:', response.status, errorText);
        toast.error('Could not start checkout. Please try again or contact support.');
        return;
      }

      const data = await response.json();

      if (!data?.url) {
        console.error('[PricingPage] Checkout error: no URL returned', data);
        toast.error('Checkout session did not return a URL. Please try again.');
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error('[PricingPage] Checkout failed:', err);
      toast.error('Something went wrong. Please check your connection and try again.');
    } finally {
      setCheckoutLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#7CFFB2] border-b border-black/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold tracking-tight">Gazua</h1>
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => navigate('/main')} className="text-sm hover:opacity-70">Home</button>
              <button onClick={() => navigate('/creators')} className="text-sm hover:opacity-70">Creators</button>
              <button
                onClick={() => document.getElementById('pricing-plans')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-sm font-medium"
              >
                Pricing
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/signin')} className="px-4 py-2 text-sm hover:opacity-70">Sign In</button>
            <button onClick={() => navigate('/onboarding/welcome')} className="px-5 py-2 bg-black text-white text-sm rounded-full hover:bg-black/80">
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h2 className="text-5xl font-bold tracking-tight mb-4">
          Invest in Your Financial Education
        </h2>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Learn from trusted creators, track real portfolios, and grow your investment knowledge.
        </p>

        {/* Beta Notice */}
        <div className="mb-8 rounded-2xl border border-[#7CFFB2]/40 bg-[#7CFFB2]/10 px-6 py-5 text-left">
          <p className="font-bold text-black">🚧 Gazua is currently in Beta</p>
          <p className="mt-1 text-sm text-gray-600">
            During the beta testing period, all premium features are available through the Free plan.
            Feel free to continue with the Free option while we gather feedback and improve the platform.
          </p>
          <p className="mt-1 text-xs text-gray-500">Paid plans will become available in a future release.</p>
        </div>

        {/* Pricing Cards */}
        <div id="pricing-plans" className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => {
            const isLoading = checkoutLoading !== null && checkoutLoading === tier.stripeTier;
            // A tier is "active" when the user is logged in and their subscription
            // matches this tier (free users are on the Explorer tier).
            const isActivePlan =
              user != null &&
              (tier.stripeTier === activeTier ||
                (tier.stripeTier === null && activeTier === 'free'));
            return (
              <div
                key={tier.name}
                className={`relative rounded-2xl border-2 p-8 text-left transition-all ${
                  tier.highlighted
                    ? 'border-[#7CFFB2] shadow-xl scale-105 bg-gradient-to-b from-[#7CFFB2]/5 to-white'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#7CFFB2] text-black text-xs font-bold px-4 py-1 rounded-full">
                    MOST POPULAR
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{tier.description}</p>
                  <div className="flex items-baseline gap-1">
                    {tier.price === 0 ? (
                      <span className="text-4xl font-bold">Free</span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold">$</span>
                        <span className="text-5xl font-bold">{tier.price}</span>
                        <span className="text-gray-600">{tier.period}</span>
                      </>
                    )}
                  </div>
                </div>

                {isActivePlan ? (
                  <div className="w-full py-3 rounded-full font-medium mb-8 text-center border-2 border-[#00a86b] text-[#00a86b] text-sm">
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleTierClick(tier.stripeTier)}
                    disabled={isLoading}
                    className={`w-full py-3 rounded-full font-medium mb-8 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                      tier.highlighted
                        ? 'bg-black text-white hover:bg-black/80'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {isLoading ? 'Redirecting…' : tier.cta}
                  </button>
                )}

                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${tier.highlighted ? 'text-[#00a86b]' : 'text-gray-400'}`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-20">
          <p className="text-sm text-gray-500 text-center">
            All content on Gazua is for educational purposes only and does not constitute financial advice.
          </p>
          <Footer variant="full" />
        </div>
      </div>
    </div>
  );
}
