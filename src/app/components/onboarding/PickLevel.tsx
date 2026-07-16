import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Check } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { type Level, ONBOARDING_LEVELS } from '../../data/onboardingOptions';

export default function PickLevel() {
  const navigate = useNavigate();
  const { setLevel, completeOnboarding } = useOnboarding();
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);

  const handleContinue = () => {
    if (selectedLevel) {
      setLevel(selectedLevel);
      navigate('/onboarding/interests');
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
            <span>Step 2 of 4</span>
            <span>50%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-[#7CFFB2] h-2 rounded-full transition-all" style={{ width: '50%' }}></div>
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-bold text-center mb-12">
          Where are you in your investment journey?
        </h2>

        {/* Level Cards */}
        <div className="space-y-4 mb-8">
          {ONBOARDING_LEVELS.map((level) => (
            <button
              key={level.id}
              onClick={() => setSelectedLevel(level.id)}
              className={`w-full p-6 rounded-2xl border-2 transition-all text-left relative ${
                selectedLevel === level.id
                  ? 'border-[#7CFFB2] bg-[#7CFFB2]/5 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">{level.emoji}</span>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">{level.title}</h3>
                  <p className="text-gray-600">{level.description}</p>
                </div>
                {selectedLevel === level.id && (
                  <div className="w-8 h-8 bg-[#7CFFB2] rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-black" strokeWidth={3} />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!selectedLevel}
          className="w-full px-8 py-4 bg-black text-white rounded-full hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>

        {/* Back link */}
        <button
          onClick={() => navigate('/onboarding/signup')}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-6"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
