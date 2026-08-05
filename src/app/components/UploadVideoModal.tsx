import { useRef, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../contexts/AuthContext';
import { createVideo } from '../../lib/services/reels.service';
import { BUCKETS, buildOwnerPath, uploadToBucket } from '../../lib/storage';
import { validateVideoFile, loadVideoMetadata, captureThumbnail, LONGFORM_LIMITS } from '../../lib/videoMedia';

interface UploadVideoModalProps {
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

// Long-form video upload — was previously inline in MyProfilePage's own Videos tab; extracted
// so the Create bottom sheet's "Video" option can open it directly too, matching the standalone
// CreatePostModal/CreateReelModal pattern (same modal shell, onClose/onSuccess contract).
export default function UploadVideoModal({ onClose, onSuccess }: UploadVideoModalProps) {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelected = async (selected: File | null | undefined) => {
    if (!selected) return;

    const validationError = validateVideoFile(selected, LONGFORM_LIMITS);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFileName(selected.name);
    if (!title.trim()) {
      setTitle(selected.name.replace(/\.[^/.]+$/, ''));
    }

    setProcessing(true);
    setError(null);
    try {
      const { duration: dur, objectUrl } = await loadVideoMetadata(selected);
      const thumbBlob = await captureThumbnail(objectUrl);
      URL.revokeObjectURL(objectUrl);
      setFile(selected);
      setDuration(dur);
      setThumbnailBlob(thumbBlob);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process this video.');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpload = async () => {
    if (!title.trim() || !file || !profile?.id) return;
    setUploading(true);
    setError(null);

    const ext = file.name.split('.').pop() || 'mp4';
    const videoUpload = await uploadToBucket(BUCKETS.videos, buildOwnerPath(profile.id, ext), file);
    if (videoUpload.error || !videoUpload.data) {
      setError(videoUpload.error ?? 'Failed to upload video. Please try again.');
      setUploading(false);
      return;
    }

    let thumbnailUrl: string | null = null;
    if (thumbnailBlob) {
      const thumbUpload = await uploadToBucket(BUCKETS.thumbnails, buildOwnerPath(profile.id, 'jpg'), thumbnailBlob);
      if (thumbUpload.data) thumbnailUrl = thumbUpload.data.publicUrl;
    }

    const { error: err } = await createVideo({
      creator_id: profile.id,
      title: title.trim(),
      storage_path: videoUpload.data.path,
      thumbnail_url: thumbnailUrl,
      duration_seconds: duration ? Math.round(duration) : null,
    });

    setUploading(false);

    if (err) {
      setError(err ?? 'Failed to publish. Please try again.');
      return;
    }

    onClose();
    onSuccess?.('Video uploaded!');
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-[min(520px,90vw)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Upload Video</h2>
          <button onClick={onClose} className="icon-tap-target p-1.5 hover:bg-neutral-100 rounded-full transition-colors">
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

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
          className={`border-2 border-dashed rounded-xl p-8 text-center mb-4 transition-colors cursor-pointer ${isDragging ? 'border-brand bg-green-50' : 'border-neutral-200 hover:border-neutral-300'}`}
        >
          <div className="text-3xl mb-2">🎬</div>
          <p className="text-sm font-medium text-neutral-700 mb-1">
            {processing ? 'Processing video…' : fileName ? `Selected: ${fileName}` : 'Drop your video here or click to browse'}
          </p>
          <p className="text-xs text-neutral-400">MP4, MOV, or WEBM up to 4GB</p>
        </div>
        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Title <span className="text-red-400">*</span></label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your video a title..."
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-black transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-6">
          <button
            onClick={handleUpload}
            disabled={!title.trim() || !file || uploading}
            className="flex-1 py-2.5 bg-black text-white text-sm font-medium rounded-full hover:bg-black/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 border border-neutral-200 text-sm font-medium rounded-full hover:bg-neutral-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
