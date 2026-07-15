import { Sparkles } from 'lucide-react';

interface AIDisclaimerCardProps {
  /** Single-line variant for tight spaces (e.g. inside a chat bubble). */
  compact?: boolean;
  /** Optional confidence label, shown only when the underlying feature computes one. */
  confidence?: 'Low' | 'Medium' | 'High';
  className?: string;
}

// Generic, reusable AI-generated-content disclaimer. Currently mounted on
// InvestmentProfilePage (the app's only real AI-generated-content surface today) but
// intentionally standalone so a future AI chat feature can drop it in unchanged.
export default function AIDisclaimerCard({ compact = false, confidence, className = '' }: AIDisclaimerCardProps) {
  if (compact) {
    return (
      <p className={`flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 leading-tight ${className}`}>
        <Sparkles className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
        AI-generated · May contain inaccuracies · Not investment advice
      </p>
    );
  }

  return (
    <div className={`flex items-start gap-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl p-4 ${className}`}>
      <Sparkles className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-black dark:text-white">AI-generated Summary</p>
          {confidence && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400">
              Confidence: {confidence}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          This content was generated with AI. AI-generated content may contain inaccuracies, omissions, or
          outdated information. Always verify important information using original public sources before
          making investment decisions.
        </p>
      </div>
    </div>
  );
}
