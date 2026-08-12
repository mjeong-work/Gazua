// ── Client-side image resize/compress ─────────────────────────────
// Shared by any upload flow that needs to shrink a user-selected image before
// it hits Supabase Storage. Same canvas-based approach as videoMedia.ts's
// captureThumbnail — draw into a canvas, read back a compressed blob.

export interface ResizeOptions {
  /** Longest side, in px, the output image is scaled down to fit within. Images already
   * smaller than this in both dimensions are re-encoded but not upscaled. */
  maxDimension: number
  /** 0–1 webp quality passed to canvas.toBlob. */
  quality: number
}

/** Loads an image File and re-encodes it as webp, scaled to fit within maxDimension. Caller
 * owns the returned Blob; the source File is never mutated. Rejects if the file can't be
 * decoded as an image or the canvas fails to produce a blob. */
export function resizeImage(file: File, { maxDimension, quality }: ResizeOptions): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
      const width = Math.round(img.width * scale)
      const height = Math.round(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      URL.revokeObjectURL(objectUrl)

      if (!ctx) {
        reject(new Error('Could not process this image.'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not process this image.'))),
        'image/webp',
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not read this image file.'))
    }
    img.src = objectUrl
  })
}
