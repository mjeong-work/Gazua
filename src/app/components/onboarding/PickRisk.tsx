import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Check } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { type RiskStyle, RISK_STYLES } from '../../data/onboardingOptions';

export default function PickRisk() {
  const navigate = useNavigate();
  const { setRiskStyle, completeOnboarding } = useOnboarding();
  const [selectedRisk, setSelectedRisk] = useState<RiskStyle | null>(null);

  const handleContinue = () => {
    if (selectedRisk) {
      setRiskStyle(selectedRisk);
      navigate('/onboarding/complete');
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 relative">
      {/* Skip link */}
      <button
        onClick={() => { completeOnboarding(); navigate('/main'); }}
        className="absolute top-6 right-6 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        Skip →
      </button>

      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Gazua</h1>
        </div>

        {/* Progress indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Step 4 of 4</span>
            <span>100%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-[#7CFFB2] h-2 rounded-full transition-all" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-bold text-center mb-12">
          What's your investment style?
        </h2>

        {/* Risk Style Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {RISK_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => setSelectedRisk(style.id)}
              className={`p-6 rounded-2xl border-2 transition-all text-left relative ${
                selectedRisk === style.id
                  ? `${style.color} ${style.selectedBg} shadow-md`
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{style.emoji}</span>
                {selectedRisk === style.id && (
                  <div className="w-7 h-7 bg-[#7CFFB2] rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-black" strokeWidth={3} />
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold mb-2">{style.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {style.description}
              </p>
            </button>
          ))}
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!selectedRisk}
          className="w-full px-8 py-4 bg-black text-white rounded-full hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>

        {/* Back link */}
        <button
          onClick={() => navigate('/onboarding/interests')}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-6"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
