import { useRef, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import ComplianceReviewModal from './compliance/ComplianceReviewModal';
import PublishReminder from './compliance/PublishReminder';
import { screenContent, saveComplianceReview, logAuditEvent } from '../../lib/services/compliance.service';
import { createReel } from '../../lib/services/reels.service';
import { useAuth } from '../contexts/AuthContext';
import { BUCKETS, buildOwnerPath, uploadToBucket } from '../../lib/storage';
import { validateVideoFile, loadVideoMetadata, captureThumbnail, REEL_LIMITS } from '../../lib/videoMedia';
import type { DisclosureType } from '../../types/compliance';

interface CreateReelModalProps {
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export default function CreateReelModal({ onClose, onSuccess }: CreateReelModalProps) {
  const { profile } = useAuth();
  const isCreator = profile?.is_creator ?? false;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [processingFile, setProcessingFile] = useState(false);

  const [caption, setCaption] = useState('');
  const [ticker, setTicker] = useState('');
  const [showCompliance, setShowCompliance] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const cleanupPreviews = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
  };

  const handleFileSelected = async (selected: File | null | undefined) => {
    if (!selected) return;

    const validationError = validateVideoFile(selected, REEL_LIMITS);
    if (validationError) {
      setFileError(validationError);
      return;
    }

    setProcessingFile(true);
    setFileError(null);
    try {
      const { duration, objectUrl: newObjectUrl } = await loadVideoMetadata(selected);
      if (duration > REEL_LIMITS.maxDurationSeconds) {
        URL.revokeObjectURL(newObjectUrl);
        setFileError(`Reels must be under ${REEL_LIMITS.maxDurationSeconds} seconds.`);
        setProcessingFile(false);
        return;
      }

      const thumbBlob = await captureThumbnail(newObjectUrl);
      cleanupPreviews();
      setFile(selected);
      setObjectUrl(newObjectUrl);
      setThumbnailBlob(thumbBlob);
      setThumbnailPreviewUrl(URL.createObjectURL(thumbBlob));
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Could not process this video.');
    } finally {
      setProcessingFile(false);
    }
  };

  const handleSubmit = () => setShowCompliance(true);

  const handleApprove = async (disclosures: DisclosureType[]) => {
    if (!profile?.id) {
      setSubmitError('You must be signed in to publish a reel.');
      setShowCompliance(false);
      return;
    }
    if (!file || !thumbnailBlob) {
      setSubmitError('Please select a video first.');
      setShowCompliance(false);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const videoExt = file.name.split('.').pop() || 'mp4';
    const videoUpload = await uploadToBucket(BUCKETS.reels, buildOwnerPath(profile.id, videoExt), file);
    if (videoUpload.error || !videoUpload.data) {
      setSubmitError(videoUpload.error ?? 'Failed to upload video. Please try again.');
      setSubmitting(false);
      setShowCompliance(false);
      return;
    }

    const thumbUpload = await uploadToBucket(BUCKETS.thumbnails, buildOwnerPath(profile.id, 'jpg'), thumbnailBlob);
    if (thumbUpload.error || !thumbUpload.data) {
      setSubmitError(thumbUpload.error ?? 'Failed to upload thumbnail. Please try again.');
      setSubmitting(false);
      setShowCompliance(false);
      return;
    }

    const tickers = [ticker.trim().toUpperCase()].filter(Boolean);

    const { data: newReel, error } = await createReel({
      creator_id: profile.id,
      caption,
      tickers,
      storage_path: videoUpload.data.path,
      thumbnail_url: thumbUpload.data.publicUrl,
    });

    // Fire-and-forget compliance log — never blocks publishing
    const result = screenContent(caption, tickers, isCreator);
    saveComplianceReview({
      contentType: 'reel',
      contentId: newReel?.id ?? null,
      originalText: caption,
      tickers,
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

    setSubmitting(false);

    if (error || !newReel) {
      setSubmitError(error ?? 'Failed to publish. Please try again.');
      setShowCompliance(false);
      return;
    }

    setShowCompliance(false);
    cleanupPreviews();
    onClose();
    onSuccess?.('Reel published!');
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
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0])}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileSelected(e.dataTransfer.files?.[0]); }}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                isDragging ? 'border-[#00a86b] bg-green-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              {thumbnailPreviewUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <img src={thumbnailPreviewUrl} alt="Video thumbnail preview" className="max-h-40 rounded-lg" />
                  <p className="text-sm text-gray-600">{file?.name}</p>
                </div>
              ) : (
                <>
                  <VideoLibraryIcon sx={{ fontSize: 64, color: '#9ca3af' }} />
                  <p className="text-sm text-gray-600 mt-3 mb-1">
                    {processingFile ? 'Processing video…' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-500">
                    MP4, MOV, or WEBM (max 100MB, under 60 seconds)
                  </p>
                </>
              )}
            </div>
            {fileError && <p className="text-sm text-red-500 mt-2">{fileError}</p>}
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

          {/* Caption */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Caption
            </label>
            <textarea
              rows={4}
              placeholder="Describe what your reel is about..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00a86b] resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {caption.length} / 2200 characters
            </p>
          </div>

          {submitError && (
            <p className="text-sm text-red-500 text-center">{submitError}</p>
          )}

          <PublishReminder />

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!file || !caption.trim() || processingFile || submitting}
            className="w-full py-4 bg-black text-white font-bold rounded-full hover:bg-black/80 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {submitting ? 'Publishing…' : 'Publish Reel'}
          </button>
        </div>
      </div>

      {showCompliance && (
        <ComplianceReviewModal
          content={caption}
          tickers={[ticker].filter(Boolean)}
          isCreator={isCreator}
          onCancel={() => setShowCompliance(false)}
          onApprove={handleApprove}
        />
      )}
    </div>
  );
}
