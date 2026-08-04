import { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import ComplianceReviewModal from './compliance/ComplianceReviewModal';
import PublishReminder from './compliance/PublishReminder';
import { screenContent, saveComplianceReview, logAuditEvent } from '../../lib/services/compliance.service';
import { createPost } from '../../lib/services/posts.service';
import { useAuth } from '../contexts/AuthContext';
import type { DisclosureType } from '../../types/compliance';

const CATEGORIES = ['Stocks', 'ETFs', 'Crypto', 'Retirement', 'Options', 'News', 'Beginner Basics'] as const;

interface CreatePostModalProps {
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export default function CreatePostModal({ onClose, onSuccess }: CreatePostModalProps) {
  const [ticker, setTicker] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('Stocks');
  const [sentiment, setSentiment] = useState<'Bullish' | 'Neutral' | 'Bearish'>('Neutral');
  const [showCompliance, setShowCompliance] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { profile } = useAuth();
  const isCreator = profile?.is_creator ?? false;

  const handleSubmit = () => setShowCompliance(true);

  const handleApprove = async (disclosures: DisclosureType[]) => {
    if (!profile?.id) {
      setSubmitError('You must be signed in to publish a post.');
      setShowCompliance(false);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const { data: newPost, error } = await createPost({
      creator_id: profile.id,
      asset: ticker.trim().toUpperCase(),
      category,
      content,
      sentiment,
    });

    // Fire-and-forget compliance log — never blocks publishing
    const result = screenContent(content, [ticker].filter(Boolean), isCreator);
    saveComplianceReview({
      contentType: 'post',
      contentId: newPost?.id ?? null,
      originalText: content,
      tickers: [ticker].filter(Boolean),
      result,
      disclosuresAccepted: disclosures,
      outcome: 'published',
    }).then(reviewId => {
      logAuditEvent({
        eventType: 'post_published',
        contentType: 'post',
        reviewId: reviewId ?? undefined,
        metadata: { risk_score: result.score, disclosures },
      }).catch(() => {});
    }).catch(() => {});

    setSubmitting(false);

    if (error || !newPost) {
      setSubmitError(error ?? 'Failed to publish. Please try again.');
      setShowCompliance(false);
      return;
    }

    setShowCompliance(false);
    onClose();
    onSuccess?.('Post published!');
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-base font-semibold">Create Post</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-5 space-y-4">
          {/* Identity row — who's posting + category, standing in for LinkedIn's avatar/name
              + audience-selector row (this app has no post-visibility concept, so category
              fills that "context for this post" slot instead of a fake control). */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-sm font-semibold text-gray-600 overflow-hidden">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : (profile?.full_name?.[0]?.toUpperCase() ?? '?')}
            </div>
            <div>
              <p className="text-sm font-semibold">{profile?.full_name ?? 'You'}</p>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])}
                className="text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5 mt-0.5 border-none focus:outline-none cursor-pointer"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Post text — the dominant element, borderless like the rest of this modal */}
          <textarea
            rows={5}
            placeholder="Share your investment thesis, market insights, or analysis..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
            className="w-full text-[15px] focus:outline-none resize-none placeholder:text-gray-400 min-h-[120px]"
          />
          <p className="text-[11px] text-gray-400 text-right -mt-3">
            {content.length} / 500
          </p>

          {/* Ticker + Sentiment — the two pieces of investment context every post needs,
              kept as one compact row instead of two separate labeled sections. */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">$</span>
              <input
                type="text"
                placeholder="Ticker"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="w-28 pl-6 pr-3 py-1.5 border border-gray-200 rounded-full text-xs focus:outline-none focus:border-brand"
              />
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setSentiment('Bullish')}
                title="Bullish"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  sentiment === 'Bullish' ? 'bg-green-100 text-green-700' : 'text-gray-400 hover:bg-gray-100'
                }`}
              >
                <TrendingUpIcon sx={{ fontSize: 18 }} />
              </button>
              <button
                onClick={() => setSentiment('Neutral')}
                title="Neutral"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  sentiment === 'Neutral' ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:bg-gray-100'
                }`}
              >
                <TrendingFlatIcon sx={{ fontSize: 18 }} />
              </button>
              <button
                onClick={() => setSentiment('Bearish')}
                title="Bearish"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  sentiment === 'Bearish' ? 'bg-red-100 text-red-700' : 'text-gray-400 hover:bg-gray-100'
                }`}
              >
                <TrendingDownIcon sx={{ fontSize: 18 }} />
              </button>
            </div>
          </div>

          {submitError && (
            <p className="text-sm text-red-500 text-center">{submitError}</p>
          )}

          <PublishReminder variant="footer" />

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!ticker.trim() || !content.trim() || submitting}
            className="w-full py-3 bg-black text-white font-bold rounded-full hover:bg-black/80 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {submitting ? 'Publishing…' : 'Publish Post'}
          </button>
        </div>
      </div>

      {showCompliance && (
        <ComplianceReviewModal
          content={content}
          tickers={[ticker].filter(Boolean)}
          isCreator={isCreator}
          onCancel={() => setShowCompliance(false)}
          onApprove={handleApprove}
        />
      )}
    </div>
  );
}
