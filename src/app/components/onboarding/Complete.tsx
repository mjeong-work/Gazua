import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Check } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';

const LEVEL_CONFIG = {
  beginner:   { label: 'Explorer', emoji: '🌍', tagline: "You're starting your investment journey." },
  experienced: { label: 'Analyst',  emoji: '📊', tagline: "You're building your investment toolkit." },
  confident:  { label: 'Expert',   emoji: '🧠', tagline: "You're ready for advanced strategies." },
} as const;

export default function Complete() {
  const navigate = useNavigate();
  const { completeOnboarding, data: onboardingData } = useOnboarding();
  const [showContent, setShowContent] = useState(false);
  const levelConfig = LEVEL_CONFIG[onboardingData.level ?? 'beginner'];

  useEffect(() => {
    // Trigger animation after mount
    setTimeout(() => setShowContent(true), 100);
    // Mark onboarding as complete
    completeOnboarding();
  }, [completeOnboarding]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className={`max-w-md w-full text-center transition-all duration-700 ${
        showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        {/* Success Icon with Animation */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 bg-mint rounded-full flex items-center justify-center">
              <Check className="w-12 h-12 text-black" strokeWidth={3} />
            </div>
            {/* Pulse rings */}
            <div className="absolute inset-0 bg-mint rounded-full animate-ping opacity-20"></div>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-bold mb-4">
          Welcome to Gazua, {levelConfig.label}!
        </h1>

        <p className="text-xl text-gray-600 mb-8 leading-relaxed">
          {levelConfig.tagline} Learn, engage, and rise through the community.
        </p>

        {/* Level Badge */}
        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-mint/10 to-green-500/10 px-8 py-4 rounded-2xl border-2 border-mint/30 mb-12">
          <span className="text-3xl">{levelConfig.emoji}</span>
          <div className="text-left">
            <div className="text-xs text-gray-600 uppercase tracking-wide">Your Level</div>
            <div className="text-2xl font-bold">{levelConfig.label}</div>
          </div>
        </div>

        {/* Features preview */}
        <div className="grid grid-cols-3 gap-4 mb-12 text-center">
          <div className="p-4 rounded-xl bg-gray-50">
            <div className="text-2xl mb-2">📚</div>
            <div className="text-sm font-medium text-gray-700">Learn</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-50">
            <div className="text-2xl mb-2">💬</div>
            <div className="text-sm font-medium text-gray-700">Engage</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-50">
            <div className="text-2xl mb-2">📈</div>
            <div className="text-sm font-medium text-gray-700">Grow</div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/main')}
          className="w-full px-8 py-4 bg-black text-white rounded-full hover:bg-black/90 transition-colors mb-6"
        >
          Explore the Feed
        </button>

        {/* Disclaimer */}
        <p className="text-xs text-gray-500 leading-relaxed">
          All content on Gazua is for educational purposes only.
        </p>
      </div>
    </div>
  );
}
