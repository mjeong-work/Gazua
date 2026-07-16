// ── Video upload validation + client-side thumbnail capture ──────
// Shared by CreateReelModal (reels) and MyProfilePage's video-upload modal
// (long-form videos) — identical mechanics, different size/duration limits.

export interface VideoLimits {
  maxBytes: number
  maxDurationSeconds: number
}

export const REEL_LIMITS: VideoLimits = {
  maxBytes: 100 * 1024 * 1024, // 100MB
  maxDurationSeconds: 60,
}

export const LONGFORM_LIMITS: VideoLimits = {
  maxBytes: 4 * 1024 * 1024 * 1024, // 4GB
  maxDurationSeconds: Infinity,
}

/** Size/type check on the raw File — duration isn't knowable until loadVideoMetadata resolves. */
export function validateVideoFile(file: File, limits: VideoLimits): string | null {
  if (!file.type.startsWith('video/')) {
    return 'Please select a video file.'
  }
  if (file.size > limits.maxBytes) {
    const maxMb = Math.round(limits.maxBytes / (1024 * 1024))
    return `Video is too large — max ${maxMb >= 1024 ? `${(maxMb / 1024).toFixed(0)}GB` : `${maxMb}MB`}.`
  }
  return null
}

/** Loads a video file's metadata (duration) via an offscreen <video>. Caller owns the returned
 * objectUrl and must revoke it (URL.revokeObjectURL) once done with preview/thumbnail capture. */
export function loadVideoMetadata(file: File): Promise<{ duration: number; objectUrl: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    video.onloadedmetadata = () => resolve({ duration: video.duration, objectUrl })
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not read this video file.'))
    }
    video.src = objectUrl
  })
}

/** Captures a frame from a loaded video (via its objectUrl) as a JPEG blob, for use as a thumbnail. */
export function captureThumbnail(objectUrl: string, atSeconds = 1): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = objectUrl

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(atSeconds, video.duration / 2)
    }
    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not capture a thumbnail from this video.'))
        return
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not capture a thumbnail from this video.'))),
        'image/jpeg',
        0.8
      )
    }
    video.onerror = () => reject(new Error('Could not capture a thumbnail from this video.'))
  })
}
