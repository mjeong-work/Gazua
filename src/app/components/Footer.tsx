import { Link } from 'react-router';
import { getAllDocuments } from '../../lib/legal/registry';

// Explicit order (not registry/glob order) so the footer's link order is stable and
// intentional, matching the order legal documents are introduced elsewhere in the app.
const FOOTER_LEGAL_SLUGS = [
  'terms',
  'privacy',
  'investment-disclaimer',
  'ai-policy',
  'community-guidelines',
  'creator-policy',
  'research-integrity-principles',
  'risk-disclosure',
  'data-source-policy',
  'copyright-dmca',
] as const;

interface FooterProps {
  /** 'compact' (default) — existing single-line disclaimer. 'full' — complete legal link grid, used on legal pages and the public marketing page. */
  variant?: 'compact' | 'full';
}

export default function Footer({ variant = 'compact' }: FooterProps) {
  if (variant === 'full') {
    const docsBySlug = new Map(getAllDocuments().map((d) => [d.slug, d]));
    return (
      <div className="mt-12 pt-8 border-t border-neutral-100">
        <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2 justify-center mb-6">
          {FOOTER_LEGAL_SLUGS.map((slug) => {
            const doc = docsBySlug.get(slug);
            if (!doc) return null;
            return (
              <Link
                key={slug}
                to={`/legal/${slug}`}
                className="text-xs text-neutral-500 hover:text-black transition-colors"
              >
                {doc.title}
              </Link>
            );
          })}
          <a
            href="mailto:support@gazua.com"
            className="text-xs text-neutral-500 hover:text-black transition-colors"
          >
            Contact
          </a>
        </nav>
        <p className="text-[10px] text-neutral-400 text-center leading-relaxed">
          All content on Gazua is user-generated and for educational purposes only. Not investment advice.
          Gazua does not endorse or guarantee any content.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 pt-4 border-t border-neutral-100">
      <p className="text-[10px] text-neutral-400 text-center leading-relaxed">
        All content on Gazua is user-generated and for educational purposes only. Not investment advice.
        Gazua does not endorse or guarantee any content.{' '}
        <Link to="/legal/terms" className="underline hover:text-neutral-500 transition-colors">Terms</Link>
        {' · '}
        <Link to="/legal/privacy" className="underline hover:text-neutral-500 transition-colors">Privacy</Link>
      </p>
    </div>
  );
}
