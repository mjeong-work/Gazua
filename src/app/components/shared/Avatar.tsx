interface AvatarProps {
  imageUrl?: string | null;
  initials: string;
  gradientClass?: string;
  /** Swaps the default white elevation ring for a 3px mint ring — the "verified" treatment
   * shared by the profile header and anywhere else a verified creator's avatar shows up. */
  verified?: boolean;
  /** Caller controls size (and matching font-size) via Tailwind classes, e.g.
   * "w-16 h-16 text-lg md:w-24 md:h-24 md:text-2xl" — keeps this component breakpoint-agnostic. */
  className: string;
}

// Presentational only — no click/upload behavior. Pages that need an editable avatar (e.g.
// MyProfilePage) wrap this with their own overlay button rather than baking upload logic in here,
// since public profile views (CreatorProfileHeader) render the exact same circle without it.
export default function Avatar({ imageUrl, initials, gradientClass = 'from-blue-500 to-purple-600', verified, className }: AvatarProps) {
  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0 ${
        verified ? 'ring-[3px] ring-mint' : 'ring-4 ring-white shadow-md'
      } ${imageUrl ? '' : `bg-gradient-to-br ${gradientClass}`} ${className}`}
    >
      {imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-cover" /> : initials}
    </div>
  );
}
