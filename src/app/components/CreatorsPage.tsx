import { useState } from 'react';
import { useNavigate } from 'react-router';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AppHeader from './AppHeader';

interface Creator {
  id: number;
  name: string;
  avatar: string;
  tagline: string;
  focus: string;
  followers: string;
  tags: string[];
  verified: boolean;
}

interface ContentItem {
  id: number;
  type: 'reel' | 'post' | 'model';
  thumbnail: string;
  title: string;
  creator: string;
  views?: string;
  duration?: string;
}

interface Video {
  id: number;
  thumbnail: string;
  title: string;
  creator: string;
  creatorAvatar: string;
  views: string;
  uploadedAt: string;
  duration: string;
  verified: boolean;
}

export default function CreatorsPage() {
  const navigate = useNavigate();
  const [followedCreators, setFollowedCreators] = useState<Set<number>>(new Set());
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Beginner' | 'Intermediate' | 'Advanced'>('All');

  const handleFollow = (creatorId: number) => {
    setFollowedCreators(prev => {
      const newSet = new Set(prev);
      if (newSet.has(creatorId)) {
        newSet.delete(creatorId);
      } else {
        newSet.add(creatorId);
      }
      return newSet;
    });
  };

  const featuredCreators: Creator[] = [
    { id: 1, name: 'Alex Rodriguez', avatar: '👨‍💼', tagline: 'Helping everyday investors build wealth', focus: 'Value Investing', followers: '127K', tags: ['Stocks', 'ETFs', 'Beginner'], verified: true },
    { id: 2, name: 'Sarah Chen', avatar: '👩‍💼', tagline: 'Tech stock analysis and growth investing', focus: 'Growth Stocks', followers: '89K', tags: ['Stocks', 'Tech', 'Analysis'], verified: true },
    { id: 3, name: 'Mike Ross', avatar: '👨‍💻', tagline: 'Quant strategies and algorithmic trading', focus: 'Quant & Models', followers: '56K', tags: ['Python', 'Quant', 'Models'], verified: true },
    { id: 4, name: 'Emma Wilson', avatar: '👩‍🔬', tagline: 'Crypto fundamentals and blockchain tech', focus: 'Crypto', followers: '94K', tags: ['Crypto', 'Bitcoin', 'Blockchain'], verified: false },
  ];

  const beginnerEducators: Creator[] = [
    { id: 7, name: 'James Lee', avatar: '👨‍💼', tagline: 'Making investing simple for everyone', focus: 'Beginner Education', followers: '143K', tags: ['Beginner', 'Basics', 'Education'], verified: true },
    { id: 8, name: 'Anna Martinez', avatar: '👩‍🎓', tagline: 'First-time investor guides', focus: 'Beginner Basics', followers: '78K', tags: ['Beginner', 'Guides', 'Tips'], verified: false },
    { id: 9, name: 'Robert Kim', avatar: '👨‍💻', tagline: 'Finance explained with simple examples', focus: 'Education', followers: '91K', tags: ['Beginner', 'Finance', 'Simple'], verified: true },
    { id: 10, name: 'Sophie Turner', avatar: '👩‍💼', tagline: 'Investment basics for young professionals', focus: 'Career Finance', followers: '65K', tags: ['Beginner', 'Career', 'Millennials'], verified: true },
  ];

  const quantBuilders: Creator[] = [
    { id: 12, name: 'Rachel Green', avatar: '👩‍💼', tagline: 'Python quant models and backtesting', focus: 'Quant Development', followers: '45K', tags: ['Python', 'Quant', 'Backtesting'], verified: true },
    { id: 13, name: 'Tom Anderson', avatar: '👨‍💼', tagline: 'Statistical arbitrage strategies', focus: 'Advanced Quant', followers: '38K', tags: ['Stats', 'Arbitrage', 'Advanced'], verified: false },
    { id: 14, name: 'Lisa Zhang', avatar: '👩‍💼', tagline: 'Options strategies and risk models', focus: 'Options Quant', followers: '67K', tags: ['Options', 'Risk', 'Models'], verified: true },
    { id: 15, name: 'Brian Park', avatar: '👨‍💻', tagline: 'Machine learning for trading signals', focus: 'ML Trading', followers: '52K', tags: ['ML', 'Python', 'Signals'], verified: true },
  ];

  const cryptoVoices: Creator[] = [
    { id: 16, name: 'Crypto Katie', avatar: '👩‍💻', tagline: 'DeFi protocols and yield farming', focus: 'DeFi', followers: '103K', tags: ['DeFi', 'Crypto', 'Yield'], verified: false },
    { id: 17, name: 'Bitcoin Brian', avatar: '👨‍💻', tagline: 'Bitcoin fundamentals and macro', focus: 'Bitcoin', followers: '127K', tags: ['Bitcoin', 'Macro', 'Crypto'], verified: true },
    { id: 18, name: 'Ethereum Eva', avatar: '👩‍💼', tagline: 'Smart contracts and ETH ecosystem', focus: 'Ethereum', followers: '89K', tags: ['Ethereum', 'Smart Contracts', 'Web3'], verified: true },
  ];

  const featuredContent: ContentItem[] = [
    { id: 1, type: 'reel', thumbnail: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', title: 'Top 5 Stocks for 2026', creator: 'Alex Rodriguez', views: '24.5K', duration: '0:58' },
    { id: 2, type: 'reel', thumbnail: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', title: 'Bitcoin Bull Case Explained', creator: 'Crypto Katie', views: '18.2K', duration: '1:12' },
    { id: 3, type: 'reel', thumbnail: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', title: 'Beginner ETF Strategy', creator: 'David Park', views: '32.1K', duration: '0:45' },
    { id: 4, type: 'reel', thumbnail: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', title: 'Python Trading Bot Tutorial', creator: 'Mike Ross', views: '15.8K', duration: '2:34' },
    { id: 5, type: 'reel', thumbnail: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', title: 'Market Analysis: Tech Sector', creator: 'Sarah Chen', views: '21.3K', duration: '1:28' },
  ];

  const videos: Video[] = [
    { id: 1, thumbnail: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', title: 'Stock Market Basics for Complete Beginners', creator: 'James Lee', creatorAvatar: '👨‍💼', views: '234K', uploadedAt: '2 weeks ago', duration: '12:34', verified: true },
    { id: 2, thumbnail: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', title: 'How to Build Your First Investment Portfolio', creator: 'Anna Martinez', creatorAvatar: '👩‍🎓', views: '189K', uploadedAt: '1 month ago', duration: '15:22', verified: false },
    { id: 3, thumbnail: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', title: 'Understanding ETFs: The Ultimate Guide', creator: 'Robert Kim', creatorAvatar: '👨‍💻', views: '421K', uploadedAt: '3 weeks ago', duration: '18:45', verified: true },
    { id: 4, thumbnail: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', title: 'Dividend Investing 101: Passive Income Strategy', creator: 'Sophie Turner', creatorAvatar: '👩‍💼', views: '312K', uploadedAt: '1 week ago', duration: '14:56', verified: true },
  ];

  const renderCreatorCard = (creator: Creator) => {
    const isFollowing = followedCreators.has(creator.id);

    return (
      <div key={creator.id} className="flex-shrink-0 w-80 border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors bg-white">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl flex-shrink-0">
            {creator.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg truncate">{creator.name}</h3>
              {creator.verified && (
                <svg className="w-5 h-5 text-[#00a86b] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{creator.tagline}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-medium text-black">{creator.followers}</span>
              <span>followers</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {creator.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleFollow(creator.id)}
            className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              isFollowing
                ? 'bg-gray-200 text-black hover:bg-gray-300'
                : 'bg-black text-white hover:bg-black/80'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
          <button
            onClick={() => navigate('/profile/investment')}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            View
          </button>
        </div>
      </div>
    );
  };

  const renderContentCard = (item: ContentItem) => {
    return (
      <div key={item.id} className="flex-shrink-0 w-64 group cursor-pointer">
        <div className="relative aspect-[9/16] rounded-xl overflow-hidden mb-3">
          <div
            className="absolute inset-0"
            style={{ background: item.thumbnail }}
          />

          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
              <PlayArrowIcon sx={{ fontSize: 32, color: '#000000', marginLeft: '4px' }} />
            </div>
          </div>

          {item.duration && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
              {item.duration}
            </div>
          )}

          {item.views && (
            <div className="absolute top-2 left-2 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
              {item.views} views
            </div>
          )}
        </div>

        <h3 className="font-medium text-sm mb-1 group-hover:text-[#00a86b] transition-colors line-clamp-2">
          {item.title}
        </h3>
        <p className="text-xs text-gray-600">
          {item.creator}
        </p>
      </div>
    );
  };

  const renderVideoCard = (video: Video) => {
    return (
      <div key={video.id} className="flex-shrink-0 w-80 group cursor-pointer">
        <div className="relative aspect-video rounded-xl overflow-hidden mb-3">
          <div
            className="absolute inset-0"
            style={{ background: video.thumbnail }}
          />

          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
              <PlayArrowIcon sx={{ fontSize: 32, color: '#000000', marginLeft: '4px' }} />
            </div>
          </div>

          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
            {video.duration}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg flex-shrink-0">
            {video.creatorAvatar}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm mb-1 line-clamp-2 group-hover:text-[#00a86b] transition-colors">
              {video.title}
            </h3>
            <div className="flex items-center gap-1 mb-0.5">
              <p className="text-xs text-gray-600">{video.creator}</p>
              {video.verified && (
                <svg className="w-3 h-3 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <p className="text-xs text-gray-600">
              {video.views} views • {video.uploadedAt}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AppHeader />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-[1600px] mx-auto px-6 py-12">
          {/* Hero */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4">Discover Finance Creators</h1>
            <p className="text-xl text-gray-600 mb-8">
              Learn from expert investors, traders, and educators sharing real strategies and market insights.
            </p>

            {/* Filter Tabs */}
            <div className="flex items-center justify-center gap-3">
              {(['All', 'Beginner', 'Intermediate', 'Advanced'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                    selectedFilter === filter
                      ? 'bg-black text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Featured Creators */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-center">Featured Creators</h2>
            <div className="flex justify-center">
              <div className="flex gap-4">
                {featuredCreators.map(renderCreatorCard)}
              </div>
            </div>
          </section>

          {/* Featured Content */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-center">Featured Content</h2>
            <div className="flex justify-center">
              <div className="flex gap-4">
                {featuredContent.map(renderContentCard)}
              </div>
            </div>
          </section>

          {/* Videos */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-center">Videos</h2>
            <div className="flex justify-center">
              <div className="flex gap-4">
                {videos.map(renderVideoCard)}
              </div>
            </div>
          </section>
        </div>
      </div>

    </div>
  );
}
