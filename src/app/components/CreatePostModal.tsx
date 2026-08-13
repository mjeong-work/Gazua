import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import ImageIcon from '@mui/icons-material/Image';
import ComplianceReviewModal from './compliance/ComplianceReviewModal';
import PublishReminder from './compliance/PublishReminder';
import { screenContent, saveComplianceReview, logAuditEvent } from '../../lib/services/compliance.service';
import { createPost, updatePostImages } from '../../lib/services/posts.service';
import { useAuth } from '../contexts/AuthContext';
import type { DisclosureType } from '../../types/compliance';
import { resizeImage } from '../../lib/imageMedia';
import { BUCKETS, uploadToBucket } from '../../lib/storage';

const CATEGORIES = ['Stocks', 'ETFs', 'Crypto', 'Retirement', 'Options', 'News', 'Beginner Basics'] as const;
const MAX_IMAGES = 5;

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

  // Image attachments — uploaded only on publish (see handleApprove). Kept as raw File[]
  // so preview/remove/reorder-free UI stays instant; resize + upload happens once at submit.
  const [images, setImages] = useState<File[]>([]);
  const [imageWarning, setImageWarning] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Object URLs are only valid while the File they wrap is still selected — regenerate
  // (and revoke the previous batch) whenever the image list changes.
  useEffect(() => {
    const urls = images.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
    setActiveImageIndex(i => Math.min(i, Math.max(urls.length - 1, 0)));
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [images]);

  const { profile } = useAuth();
  const isCreator = profile?.is_creator ?? false;

  const handleSubmit = () => setShowCompliance(true);

  const handleFilesSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ''; // allow re-selecting the same file(s) later
    if (picked.length === 0) return;

    const combined = [...images, ...picked];
    setImageWarning(combined.length > MAX_IMAGES ? `You can add up to ${MAX_IMAGES} images.` : null);
    setImages(combined.slice(0, MAX_IMAGES));
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageWarning(null);
  };

  const scrollToImage = (index: number) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' });
  };

  const handleCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el || el.clientWidth === 0) return;
    setActiveImageIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

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

    if (error || !newPost) {
      setSubmitting(false);
      setSubmitError(error ?? 'Failed to publish. Please try again.');
      setShowCompliance(false);
      return;
    }

    // Images upload after the post row exists — the storage path is keyed by post id
    // (see BUCKETS.postImages in storage.ts) so order stays stable and predictable.
    if (images.length > 0) {
      const urls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const webp = await resizeImage(images[i], { maxDimension: 1600, quality: 0.8 });
        const { data: uploaded, error: uploadError } = await uploadToBucket(
          BUCKETS.postImages,
          `${profile.id}/${newPost.id}/${i}.webp`,
          webp
        );
        if (uploadError || !uploaded) {
          setSubmitting(false);
          setSubmitError(uploadError ?? 'Post was published, but one of the images failed to upload.');
          setShowCompliance(false);
          return;
        }
        urls.push(uploaded.publicUrl);
      }
      await updatePostImages(newPost.id, urls);
    }

    setSubmitting(false);
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
        className="bg-white rounded-md max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-base font-semibold">Create Post</h2>
          <button
            onClick={onClose}
            className="icon-tap-target p-1.5 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-5 space-y-4">
          {/* Identity row — who's posting + category, standing in for LinkedIn's avatar/name
              + audience-selector row (this app has no post-visibility concept, so category
              fills that "context for this post" slot instead of a fake control). */}
          <div className="flex items-center gap-2">
            <div className="w-11 h-11 rounded-full bg-neutral-200 flex-shrink-0 flex items-center justify-center text-sm font-semibold text-neutral-600 overflow-hidden">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : (profile?.full_name?.[0]?.toUpperCase() ?? '?')}
            </div>
            <div>
              <p className="text-sm font-semibold">{profile?.full_name ?? 'You'}</p>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])}
                className="text-xs text-neutral-500 bg-neutral-100 rounded-sm px-2.5 py-0.5 mt-0.5 border-none focus:outline-none cursor-pointer"
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
            className="w-full text-[15px] focus:outline-none resize-none placeholder:text-neutral-400 min-h-[120px]"
          />
          <p className="text-[11px] text-neutral-400 text-right -mt-3">
            {content.length} / 500
          </p>

          {/* Image preview — carousel (2+) or single image, plus a removable thumbnail row.
              Renders nothing when no images are attached. */}
          {previewUrls.length > 0 && (
            <div>
              {previewUrls.length > 1 ? (
                <>
                  <div
                    ref={carouselRef}
                    onScroll={handleCarouselScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar rounded-md"
                  >
                    {previewUrls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt=""
                        className="w-full flex-shrink-0 snap-center aspect-video object-cover"
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    {previewUrls.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => scrollToImage(i)}
                        aria-label={`Go to image ${i + 1}`}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          i === activeImageIndex ? 'bg-neutral-800' : 'bg-neutral-300'
                        }`}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <img src={previewUrls[0]} alt="" className="w-full rounded-md aspect-video object-cover" />
              )}

              <div className="flex items-center gap-2 mt-2">
                {images.map((file, i) => (
                  <div key={i} className="relative w-14 h-14 flex-shrink-0">
                    <img
                      src={previewUrls[i]}
                      alt={file.name}
                      className="w-full h-full rounded-md object-cover"
                    />
                    <button
                      onClick={() => removeImage(i)}
                      aria-label="Remove image"
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-neutral-800 text-white rounded-full flex items-center justify-center hover:bg-black transition-colors"
                    >
                      <CloseIcon sx={{ fontSize: 12 }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {imageWarning && (
            <p className="text-[11px] text-neutral-400 -mt-3">{imageWarning}</p>
          )}

          {/* Ticker + Sentiment — the two pieces of investment context every post needs,
              kept as one compact row instead of two separate labeled sections. */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesSelected}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Add images"
              aria-label="Add images"
              className="relative w-8 h-8 rounded-full flex items-center justify-center transition-colors text-neutral-400 hover:bg-neutral-100"
            >
              <ImageIcon sx={{ fontSize: 18 }} />
              {images.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-black text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
                  {images.length}
                </span>
              )}
            </button>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-medium">$</span>
              <input
                type="text"
                placeholder="Ticker"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="w-28 pl-6 pr-3 py-1.5 border border-neutral-200 rounded-sm text-xs focus:outline-none focus:border-brand"
              />
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setSentiment('Bullish')}
                title="Bullish"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  sentiment === 'Bullish' ? 'bg-green-100 text-green-700' : 'text-neutral-400 hover:bg-neutral-100'
                }`}
              >
                <TrendingUpIcon sx={{ fontSize: 18 }} />
              </button>
              <button
                onClick={() => setSentiment('Neutral')}
                title="Neutral"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  sentiment === 'Neutral' ? 'bg-blue-100 text-blue-700' : 'text-neutral-400 hover:bg-neutral-100'
                }`}
              >
                <TrendingFlatIcon sx={{ fontSize: 18 }} />
              </button>
              <button
                onClick={() => setSentiment('Bearish')}
                title="Bearish"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  sentiment === 'Bearish' ? 'bg-red-100 text-red-700' : 'text-neutral-400 hover:bg-neutral-100'
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
            disabled={!ticker.trim() || !content.trim() || images.length === 0 || submitting}
            className="w-full py-3 bg-black text-white font-bold rounded-full hover:bg-black/80 transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed"
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
