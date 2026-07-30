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
  const [timeHorizon, setTimeHorizon] = useState<'Short-term' | 'Medium-term' | 'Long-term'>('Medium-term');
  const [riskLevel, setRiskLevel] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [confidence, setConfidence] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [sentiment, setSentiment] = useState<'Bullish' | 'Neutral' | 'Bearish'>('Neutral');
  const [tags, setTags] = useState('');
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

    const parsedTags = tags.split(/\s+/).filter(t => t.startsWith('#'));

    const { data: newPost, error } = await createPost({
      creator_id: profile.id,
      asset: ticker.trim().toUpperCase(),
      category,
      content,
      tags: parsedTags,
      sentiment,
      time_horizon: timeHorizon,
      risk_level: riskLevel,
      confidence,
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
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Create Post</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Ticker or Topic */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Ticker or Topic
            </label>
            <input
              type="text"
              placeholder="e.g., NVDA, Bitcoin, S&P 500"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand"
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Post Content */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              What's your take?
            </label>
            <textarea
              rows={5}
              placeholder="Share your investment thesis, market insights, or analysis..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {content.length} / 500 characters
            </p>
          </div>

          {/* Sentiment */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Sentiment
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setSentiment('Bullish')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  sentiment === 'Bullish'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <TrendingUpIcon sx={{ fontSize: 20 }} />
                Bullish
              </button>
              <button
                onClick={() => setSentiment('Neutral')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  sentiment === 'Neutral'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <TrendingFlatIcon sx={{ fontSize: 20 }} />
                Neutral
              </button>
              <button
                onClick={() => setSentiment('Bearish')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  sentiment === 'Bearish'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <TrendingDownIcon sx={{ fontSize: 20 }} />
                Bearish
              </button>
            </div>
          </div>

          {/* Time Horizon */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Time Horizon
            </label>
            <select
              value={timeHorizon}
              onChange={(e) => setTimeHorizon(e.target.value as typeof timeHorizon)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand"
            >
              <option>Short-term</option>
              <option>Medium-term</option>
              <option>Long-term</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Risk Level */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Risk Level
              </label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as typeof riskLevel)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand"
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>

            {/* Confidence */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Confidence
              </label>
              <select
                value={confidence}
                onChange={(e) => setConfidence(e.target.value as typeof confidence)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand"
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Tags (optional)
            </label>
            <input
              type="text"
              placeholder="e.g., #stocks #tech #AI"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand"
            />
          </div>

          {submitError && (
            <p className="text-sm text-red-500 text-center">{submitError}</p>
          )}

          <PublishReminder className="mb-2" />

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!ticker.trim() || !content.trim() || submitting}
            className="w-full py-4 bg-black text-white font-bold rounded-full hover:bg-black/80 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
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
