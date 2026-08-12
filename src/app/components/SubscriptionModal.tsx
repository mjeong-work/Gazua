import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { useNavigate } from 'react-router';

interface SubscriptionModalProps {
  onClose: () => void;
  creatorId: string;
  creatorName: string;
}

export default function SubscriptionModal({ onClose, creatorName }: SubscriptionModalProps) {
  const navigate = useNavigate();
  const [selectedTier, setSelectedTier] = useState<'basic' | 'premium'>('premium');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const tiers = [
    {
      id: 'basic' as const,
      name: 'Basic Access',
      price: 4.99,
      description: 'Essential content and insights',
      features: [
        'Access to weekly market analysis',
        'Monthly portfolio updates',
        'Community chat access',
        'Educational resources library'
      ]
    },
    {
      id: 'premium' as const,
      name: 'Premium Access',
      price: 12.99,
      description: 'Complete access to all content',
      features: [
        'Everything in Basic',
        'Daily market commentary',
        'Real-time trade alerts',
        'Exclusive live Q&A sessions',
        'Direct messaging with creator',
        'Early access to new content',
        'Custom investment tracking tools'
      ],
      badge: 'MOST POPULAR'
    }
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-md max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Subscribe to {creatorName}</h2>
            <p className="text-sm text-neutral-600">Choose a membership tier to unlock exclusive content</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="space-y-4 mb-8">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={`relative border-2 rounded-md p-6 cursor-pointer transition-all ${
                  selectedTier === tier.id
                    ? 'border-brand bg-brand/5'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-6 bg-mint text-black text-xs font-bold px-3 py-1 rounded-sm">
                    {tier.badge}
                  </div>
                )}

                <div className="flex items-start gap-4">
                  {/* Radio Button */}
                  <div className="mt-1">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedTier === tier.id
                          ? 'border-brand bg-brand'
                          : 'border-neutral-300'
                      }`}
                    >
                      {selectedTier === tier.id && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-baseline gap-3 mb-2">
                      <h3 className="text-xl font-bold">{tier.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">${tier.price}</span>
                        <span className="text-sm text-neutral-600">/month</span>
                      </div>
                    </div>
                    <p className="text-sm text-neutral-600 mb-4">{tier.description}</p>

                    <ul className="space-y-2">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-brand mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Subscribe Button — redirects to platform pricing page */}
          <button
            onClick={() => { onClose(); navigate('/pricing'); }}
            className="w-full py-4 bg-black text-white font-bold rounded-sm hover:bg-black/80 transition-colors mb-4"
          >
            Subscribe for ${tiers.find(t => t.id === selectedTier)?.price}/month
          </button>

          {/* Footer Note */}
          <p className="text-xs text-center text-neutral-500">
            Cancel anytime. Renews automatically. By subscribing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
