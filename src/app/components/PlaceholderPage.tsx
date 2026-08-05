import { useNavigate } from 'react-router';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: string;
}

export default function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold tracking-tight">Gazua</h1>
          </div>
          <button
            onClick={() => navigate('/main')}
            className="px-4 py-2 text-sm hover:opacity-70"
          >
            Home
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-6">{icon}</div>
          <h2 className="text-3xl font-bold mb-4">{title}</h2>
          <p className="text-neutral-600 mb-8 leading-relaxed">{description}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/main')}
              className="px-6 py-3 bg-black text-white rounded-full hover:bg-black/90 transition-colors"
            >
              Go to Feed
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 border-2 border-neutral-200 rounded-full hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
