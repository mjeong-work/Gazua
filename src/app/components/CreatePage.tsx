import { useState } from 'react';
import { useNavigate } from 'react-router';
import ArticleIcon from '@mui/icons-material/Article';
import AppHeader from './AppHeader';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import InsertChartIcon from '@mui/icons-material/InsertChart';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CloseIcon from '@mui/icons-material/Close';
import CreatePostModal from './CreatePostModal';
import CreateReelModal from './CreateReelModal';

export default function CreatePage() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showReelModal, setShowReelModal] = useState(false);

  const contentTypes = [
    {
      id: 'post',
      title: 'Text Post',
      description: 'Share market insights, investment ideas, or start a discussion',
      icon: <ArticleIcon sx={{ fontSize: 48 }} />,
      color: 'from-blue-500 to-cyan-500',
      action: 'Write Post'
    },
    {
      id: 'reel',
      title: 'Reel / Short Video',
      description: 'Create short-form video content about stocks, crypto, or market trends',
      icon: <VideoLibraryIcon sx={{ fontSize: 48 }} />,
      color: 'from-purple-500 to-pink-500',
      action: 'Create Reel'
    },
    {
      id: 'model',
      title: 'Finance Model',
      description: 'Upload Excel templates, Python scripts, or investment calculators',
      icon: <InsertChartIcon sx={{ fontSize: 48 }} />,
      color: 'from-green-500 to-emerald-500',
      action: 'Upload Model'
    },
    {
      id: 'idea',
      title: 'Market Idea',
      description: 'Share a trade idea, thesis, or investment opportunity',
      icon: <LightbulbIcon sx={{ fontSize: 48 }} />,
      color: 'from-amber-500 to-orange-500',
      action: 'Share Idea'
    }
  ];

  const handleCreate = (type: string) => {
    if (type === 'post') { setShowPostModal(true); return; }
    if (type === 'reel') { setShowReelModal(true); return; }
    setSelectedType(type);
  };

  const handleCloseModal = () => {
    setSelectedType(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AppHeader />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-12">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">Create & Share</h1>
            <p className="text-xl text-neutral-600">
              Share your knowledge, insights, and models with the Gazua community.
            </p>
          </div>

          {/* Content Type Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-12">
            {contentTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleCreate(type.id)}
                className="text-left border-2 border-neutral-200 rounded-md p-5 sm:p-8 hover:border-brand hover:shadow-lg transition-all bg-white group"
              >
                <div className={`w-20 h-20 rounded-md bg-gradient-to-br ${type.color} flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform`}>
                  {type.icon}
                </div>
                <h3 className="text-2xl font-bold mb-3">{type.title}</h3>
                <p className="text-neutral-600 mb-6 leading-relaxed">{type.description}</p>
                <div className="flex items-center gap-2 text-brand font-medium">
                  <span>{type.action}</span>
                  <span>→</span>
                </div>
              </button>
            ))}
          </div>

          {/* Tips Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-6">
            <h3 className="font-bold mb-3">Tips for Great Content</h3>
            <ul className="space-y-2 text-sm text-neutral-700">
              <li className="flex items-start gap-2">
                <span className="text-brand mt-0.5">•</span>
                <span><strong>Be specific:</strong> Share concrete examples, data, or actionable insights</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand mt-0.5">•</span>
                <span><strong>Show your work:</strong> Explain your thinking and methodology</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand mt-0.5">•</span>
                <span><strong>Tag appropriately:</strong> Use relevant tags so others can discover your content</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand mt-0.5">•</span>
                <span><strong>Engage with feedback:</strong> Respond to comments and questions from the community</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand mt-0.5">•</span>
                <span><strong>Disclaimer:</strong> Always remind readers to do their own research</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {showPostModal && (
        <CreatePostModal
          onClose={() => setShowPostModal(false)}
          onSuccess={() => { setShowPostModal(false); navigate('/main'); }}
        />
      )}

      {showReelModal && (
        <CreateReelModal
          onClose={() => setShowReelModal(false)}
          onSuccess={() => { setShowReelModal(false); navigate('/main/reels'); }}
        />
      )}

      {/* Create Modal (Upload Model / Share Idea — not yet built) */}
      {selectedType && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-md max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-8 py-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {contentTypes.find(t => t.id === selectedType)?.title}
                </h2>
                <p className="text-sm text-neutral-600">
                  {contentTypes.find(t => t.id === selectedType)?.description}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <CloseIcon sx={{ fontSize: 20 }} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="text-center py-12">
                <div className={`w-24 h-24 rounded-md bg-gradient-to-br ${contentTypes.find(t => t.id === selectedType)?.color} flex items-center justify-center text-white mb-6 mx-auto`}>
                  {contentTypes.find(t => t.id === selectedType)?.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
                <p className="text-neutral-600 mb-6 max-w-sm mx-auto">
                  Content creation tools are currently in development. You'll be able to create and publish {selectedType === 'post' ? 'posts' : selectedType === 'reel' ? 'reels' : selectedType === 'model' ? 'models' : 'market ideas'} soon.
                </p>
                <button
                  onClick={handleCloseModal}
                  className="px-6 py-3 bg-black text-white rounded-sm hover:bg-black/90 transition-colors"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
