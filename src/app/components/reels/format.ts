/** Compact count formatter shared by all Reels engagement UI (e.g. 24500 -> "24.5K"). */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * Deterministic mock engagement seed — for video/reel data shapes with no real
 * like/comment/share counts backing them yet, this derives stable-looking numbers from an
 * id instead of a random value that would change on every render.
 */
export function seedFromId(id: number, base: number, spread: number): number {
  return base + ((id * 4111) % spread);
}
