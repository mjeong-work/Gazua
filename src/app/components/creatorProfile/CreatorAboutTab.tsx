import type { MockCreator } from '../../data/creators';
import type { Profile } from '../../../types/database';

const RISK_STYLE_LABELS: Record<NonNullable<Profile['creator_risk_style']>, string> = {
  conservative: 'Conservative',
  balanced: 'Balanced',
  aggressive: 'Aggressive',
  speculative: 'Speculative',
};

interface CreatorAboutTabProps {
  creator: MockCreator;
  dbProfile: Profile | null;
  followerCount: number | null;
  /** The one stat that differs between the two pages: post count on Investment, video count on Videos. */
  secondaryStat: { label: string; value: string };
}

// Shared About tab — bio, disclaimer, focus areas, investing style, and stats. Identical
// between the Investment and Videos creator profile pages before this extraction, aside from
// the single "posts vs videos" stat row (now the secondaryStat prop).
export default function CreatorAboutTab({ creator, dbProfile, followerCount, secondaryStat }: CreatorAboutTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <div className="p-5 bg-white border border-neutral-200 rounded-xl">
          <h2 className="text-base font-semibold mb-3">About {creator.name}</h2>
          <p className="text-sm text-neutral-700 leading-relaxed">
            {creator.bio || <span className="text-neutral-400 italic">This creator hasn't added a bio yet.</span>}
          </p>
        </div>
        <div className="p-4 border border-amber-200 bg-amber-50 rounded-xl">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Disclaimer:</strong> Content shared is for educational purposes only and not financial advice. Always do your own research and consult a licensed advisor before making investment decisions.
          </p>
        </div>
      </div>
      <div className="space-y-4">
        {(dbProfile?.tags?.length || creator.focus) && (
          <div className="p-5 bg-white border border-neutral-200 rounded-xl">
            <h3 className="text-base font-semibold mb-3">Focus Areas</h3>
            <div className="flex flex-wrap gap-2">
              {(dbProfile?.tags?.length ? dbProfile.tags : [creator.focus]).map(tag => (
                <span key={tag} className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-xs font-medium">{tag}</span>
              ))}
            </div>
          </div>
        )}
        {/* Investing style — only shown for real (DB-backed) creators, since the small
            MOCK_CREATORS fallback set has no creator_risk_style at all. Deliberately never
            defaults to a guessed value: "not shared yet" is the correct state for most
            creators today, not an error to hide. */}
        {dbProfile && (
          <div className="p-5 bg-white border border-neutral-200 rounded-xl">
            <h3 className="text-base font-semibold mb-3">Investing Style</h3>
            {dbProfile.creator_risk_style ? (
              <span className="inline-flex px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-xs font-medium">
                {RISK_STYLE_LABELS[dbProfile.creator_risk_style]}
              </span>
            ) : (
              <p className="text-xs text-neutral-400 italic">Not shared yet.</p>
            )}
          </div>
        )}
        <div className="p-5 bg-white border border-neutral-200 rounded-xl space-y-3">
          <h3 className="text-base font-semibold">By the numbers</h3>
          {[
            { label: 'Followers', value: followerCount !== null ? followerCount.toLocaleString() : creator.followers },
            secondaryStat,
            { label: 'Joined', value: dbProfile ? new Date(dbProfile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—' },
          ].map(stat => (
            <div key={stat.label} className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">{stat.label}</span>
              <span className="font-semibold">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
