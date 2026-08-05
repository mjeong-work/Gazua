import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Check } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { INTEREST_OPTIONS } from '../../data/onboardingOptions';

export default function PickInterests() {
  const navigate = useNavigate();
  const { setInterests, completeOnboarding } = useOnboarding();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleContinue = () => {
    if (selectedInterests.length >= 3) {
      setInterests(selectedInterests);
      navigate('/onboarding/risk');
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 relative">
      {/* Skip link */}
      <button
        onClick={() => { completeOnboarding(); navigate('/main'); }}
        className="absolute top-6 right-6 text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
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
          <div className="flex items-center justify-between text-sm text-neutral-600 mb-2">
            <span>Step 3 of 4</span>
            <span>75%</span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2">
            <div className="bg-mint h-2 rounded-full transition-all" style={{ width: '75%' }}></div>
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-bold text-center mb-4">
          What do you want to learn about?
        </h2>
        <p className="text-center text-neutral-600 mb-12">
          Select at least 3
        </p>

        {/* Interest Pills */}
        <div className="flex flex-wrap gap-3 mb-8 justify-center">
          {INTEREST_OPTIONS.map((interest) => (
            <button
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={`px-6 py-3 rounded-full border-2 transition-all font-medium ${
                selectedInterests.includes(interest)
                  ? 'bg-mint border-mint text-black shadow-md'
                  : 'border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              <span className="flex items-center gap-2">
                {interest}
                {selectedInterests.includes(interest) && (
                  <Check className="w-4 h-4" strokeWidth={3} />
                )}
              </span>
            </button>
          ))}
        </div>

        {/* Counter */}
        {selectedInterests.length > 0 && (
          <p className="text-center text-sm text-neutral-600 mb-6">
            {selectedInterests.length} selected
            {selectedInterests.length < 3 && ` • ${3 - selectedInterests.length} more needed`}
          </p>
        )}

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={selectedInterests.length < 3}
          className="w-full px-8 py-4 bg-black text-white rounded-full hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>

        {/* Back link */}
        <button
          onClick={() => navigate('/onboarding/level')}
          className="w-full text-center text-sm text-neutral-500 hover:text-neutral-700 mt-6"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
