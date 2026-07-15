import { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import UploadIcon from '@mui/icons-material/Upload';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import ComplianceReviewModal from './compliance/ComplianceReviewModal';
import PublishReminder from './compliance/PublishReminder';
import { screenContent, saveComplianceReview, logAuditEvent } from '../../lib/services/compliance.service';
import { useAuth } from '../contexts/AuthContext';
import type { DisclosureType } from '../../types/compliance';

interface CreateReelModalProps {
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export default function CreateReelModal({ onClose, onSuccess }: CreateReelModalProps) {
  const [title, setTitle] = useState('');
  const [ticker, setTicker] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [showCompliance, setShowCompliance] = useState(false);

  const { profile } = useAuth();
  const isCreator = profile?.is_creator ?? false;

  const handleSubmit = () => setShowCompliance(true);

  const handleApprove = (disclosures: DisclosureType[]) => {
    const screenText = [title, description].filter(Boolean).join(' ');
    const result = screenContent(screenText, [ticker].filter(Boolean), isCreator);
    saveComplianceReview({
      contentType: 'reel',
      contentId: null,
      originalText: screenText,
      tickers: [ticker].filter(Boolean),
      result,
      disclosuresAccepted: disclosures,
      outcome: 'published',
    }).then(reviewId => {
      logAuditEvent({
        eventType: 'reel_published',
        contentType: 'reel',
        reviewId: reviewId ?? undefined,
        metadata: { risk_score: result.score, disclosures },
      }).catch(() => {});
    }).catch(() => {});

    setShowCompliance(false);
    onClose();
    onSuccess?.('Reel submitted');
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
          <h2 className="text-xl font-bold">Create Reel</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Upload Video */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Upload Video
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-gray-400 transition-colors cursor-pointer">
              <VideoLibraryIcon sx={{ fontSize: 64, color: '#9ca3af' }} />
              <p className="text-sm text-gray-600 mt-3 mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                MP4, MOV, or WEBM (max 100MB, under 60 seconds)
              </p>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              placeholder="e.g., Why I'm bullish on NVDA 🚀"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00a86b]"
            />
          </div>

          {/* Ticker or Topic */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Ticker or Topic
            </label>
            <input
              type="text"
              placeholder="e.g., NVDA, Bitcoin, Market Update"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00a86b]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows={4}
              placeholder="Describe what your reel is about..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00a86b] resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.length} / 300 characters
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00a86b]"
            >
              <option value="">Select a category</option>
              <option>Stocks</option>
              <option>ETFs</option>
              <option>Crypto</option>
              <option>Options</option>
              <option>Market Analysis</option>
              <option>Portfolio Review</option>
              <option>Beginner Tips</option>
              <option>News & Updates</option>
            </select>
          </div>

          <PublishReminder />

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!title || !ticker}
            className="w-full py-4 bg-black text-white font-bold rounded-full hover:bg-black/80 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Publish Reel
          </button>

          <p className="text-xs text-center text-gray-500">
            By publishing, you agree to Gazua's Community Guidelines and Terms of Service.
          </p>
        </div>
      </div>

      {showCompliance && (
        <ComplianceReviewModal
          content={[title, description].filter(Boolean).join(' ')}
          tickers={[ticker].filter(Boolean)}
          isCreator={isCreator}
          onCancel={() => setShowCompliance(false)}
          onApprove={handleApprove}
        />
      )}
    </div>
  );
}
