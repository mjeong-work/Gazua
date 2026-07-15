import { useNavigate } from 'react-router';

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white relative overflow-hidden flex items-center justify-center">
      {/* Subtle background visualization */}
      <div className="absolute inset-0 opacity-[0.03]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <path d="M 0 400 Q 200 350 400 380 T 800 350 T 1200 380 T 1600 350" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
          <path d="M 0 450 Q 200 420 400 440 T 800 410 T 1200 440 T 1600 410" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2"/>
          <path d="M 0 500 Q 200 480 400 490 T 800 470 T 1200 490 T 1600 470" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.1"/>
        </svg>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-md w-full px-6 text-center">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold tracking-tight mb-4">Gazua</h1>
          <div className="w-16 h-1 bg-[#7CFFB2] mx-auto rounded-full"></div>
        </div>

        {/* Tagline */}
        <p className="text-2xl text-gray-700 mb-12 leading-relaxed">
          The trusted social layer for investment learning
        </p>

        {/* CTAs */}
        <div className="space-y-4">
          <button
            onClick={() => navigate('/onboarding/signup')}
            className="w-full px-8 py-4 bg-black text-white rounded-full hover:bg-black/90 transition-colors"
          >
            Get Started
          </button>
          <button
            onClick={() => navigate('/signin')}
            className="w-full px-8 py-4 border-2 border-gray-200 text-gray-700 rounded-full hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Sign In
          </button>
        </div>

        {/* Additional info */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="text-sm text-gray-500">
            Join thousands learning to invest with confidence
          </p>
          <button
            onClick={() => navigate('/')}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Back to pricing
          </button>
        </div>
      </div>
    </div>
  );
}
