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

  const canSubmit = !!file && !!caption.trim() && !processingFile && !submitting;

  return (
    <div className="fixed inset-0 z-50 flex flex-col lg:items-center lg:justify-center lg:bg-black/50 lg:p-6">
      <div className="flex-1 min-h-0 flex flex-col bg-white lg:flex-none lg:w-full lg:max-w-4xl lg:max-h-[85vh] lg:rounded-2xl lg:shadow-2xl lg:overflow-hidden">
        {/* Top bar */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3">
          <button
            onClick={onClose}
            className="p-1.5 -ml-1.5 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <CloseIcon sx={{ fontSize: 22 }} />
          </button>
          <h1 className="text-sm font-semibold">New Reel</h1>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="text-sm font-semibold text-brand disabled:text-gray-400 transition-colors px-1.5"
          >
            {submitting ? 'Posting…' : 'Next'}
          </button>
        </div>

        {/* Content — mobile: single flex column, Caption absorbs leftover vertical space.
            Desktop (lg+): two-pane row, video left / fields right, both matched to the same
            height and centered — same elements, just reflowed, so mobile markup/behavior is
            untouched. overflow-y-auto is a safety net for short viewports either way. */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-center lg:gap-10">
          {/* Video upload / preview — ~35-40% of viewport height on mobile (short/near-square,
              so fields below are visible without scrolling); a taller fixed pane on desktop,
              matched in height to the fields column beside it. */}
          <div className="flex-shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="absolute w-px h-px opacity-0 overflow-hidden pointer-events-none -z-10"
              onChange={(e) => handleFileSelected(e.target.files?.[0])}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileSelected(e.dataTransfer.files?.[0]); }}
              className={`relative aspect-[4/5] h-[36vh] max-h-72 mx-auto lg:h-[60vh] lg:max-h-[520px] lg:mx-0 rounded-2xl cursor-pointer overflow-hidden transition-colors ${
                thumbnailPreviewUrl
                  ? ''
                  : `flex flex-col items-center justify-center px-4 border border-dashed ${isDragging ? 'border-brand bg-green-50' : 'border-gray-200 hover:border-gray-300'}`
              }`}
            >
              {thumbnailPreviewUrl ? (
                <>
                  <img src={thumbnailPreviewUrl} alt="Video thumbnail preview" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pt-6 pb-2">
                    <p className="text-[11px] text-white/90 truncate">{file?.name} · Tap to change</p>
                  </div>
                </>
              ) : (
                <>
                  <VideoLibraryIcon sx={{ fontSize: 32, color: '#c1c7cf' }} />
                  <p className="text-xs text-gray-500 mt-2 mb-0.5 text-center leading-snug">
                    {processingFile ? 'Processing video…' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-[11px] text-gray-400 text-center leading-snug">
                    MP4, MOV, or WEBM (max 100MB, under 60 seconds)
                  </p>
                </>
              )}
            </div>
            {fileError && <p className="text-sm text-red-500 mt-2 text-center">{fileError}</p>}
          </div>

          {/* Fields column — on mobile this is just two more items in the same flow (parent's
              gap-4 spaces them); on desktop it becomes a fixed-width sidebar next to the video
              pane instead of Ticker/Caption stretching edge-to-edge across the whole window. */}
          <div className="flex-1 min-h-0 flex flex-col gap-4 lg:flex-none lg:w-80 lg:h-[60vh] lg:max-h-[520px]">
            {/* Ticker or Topic */}
            <div className="flex-shrink-0">
              <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                Ticker or Topic
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">#</span>
                <input
                  type="text"
                  placeholder="NVDA, Bitcoin, Market Update"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            {/* Caption — grows to fill whatever vertical space is left, like the rest of this
                page's fields, instead of a fixed row count leaving empty space beneath it. */}
            <div className="flex-1 min-h-[80px] flex flex-col">
              <textarea
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full flex-1 min-h-0 text-sm focus:outline-none resize-none placeholder:text-gray-400"
              />
              <p className="text-[11px] text-gray-400 text-right flex-shrink-0">
                {caption.length} / 2200
              </p>
            </div>

            {submitError && (
              <p className="text-sm text-red-500 text-center flex-shrink-0">{submitError}</p>
            )}
          </div>
        </div>

        {/* Footer — pinned below the scroll area, not the viewport, so it never covers content */}
        <div className="flex-shrink-0 px-4 py-3">
          <PublishReminder variant="footer" />
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
