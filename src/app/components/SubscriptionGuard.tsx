import { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import type { SubscriptionTier } from '../../types/database';

interface SubscriptionGuardProps {
  children: ReactNode;
  requiredTier: SubscriptionTier;
  fallback?: ReactNode;
}

const TIER_ORDER: Record<SubscriptionTier, number> = { free: 0, analyst: 1, educator: 2 };

function DefaultUpgradePrompt({ requiredTier }: { requiredTier: SubscriptionTier }) {
  const navigate = useNavigate();
  const label = requiredTier === 'analyst' ? 'Analyst' : 'Educator';
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
      <div className="text-4xl">🔒</div>
      <p className="text-sm font-medium text-gray-800">
        {label} plan required
      </p>
      <p className="text-sm text-gray-500 max-w-xs">
        Upgrade to access this content.
      </p>
      <button
        onClick={() => navigate('/pricing')}
        className="mt-2 px-5 py-2 bg-black text-white text-sm rounded-full hover:bg-black/80 transition-colors"
      >
        View plans
      </button>
    </div>
  );
}

export default function SubscriptionGuard({ children, requiredTier, fallback }: SubscriptionGuardProps) {
  const { profile } = useAuth();
  const userTier = profile?.subscription_tier ?? 'free';

  if (TIER_ORDER[userTier] < TIER_ORDER[requiredTier]) {
    return <>{fallback ?? <DefaultUpgradePrompt requiredTier={requiredTier} />}</>;
  }

  return <>{children}</>;
}
