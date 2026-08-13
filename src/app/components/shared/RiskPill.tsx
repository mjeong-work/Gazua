import type { RiskStyle } from '../../data/onboardingOptions';
import { RISK_STYLE_LABELS } from '../../utils/creator';

interface RiskPillProps {
  riskStyle: RiskStyle | null | undefined;
  className?: string;
}

// A creator's self-reported investing style (profiles.creator_risk_style) as a small pill.
// Renders nothing for "not set yet" — same "don't synthesize a fallback" rule the rest of the
// app follows for this field (see RISK_STYLE_LABELS / creator_risk_style comments).
export default function RiskPill({ riskStyle, className = '' }: RiskPillProps) {
  if (!riskStyle) return null;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 bg-neutral-100 text-neutral-700 rounded-sm text-xs font-medium whitespace-nowrap ${className}`}>
      {RISK_STYLE_LABELS[riskStyle]}
    </span>
  );
}
