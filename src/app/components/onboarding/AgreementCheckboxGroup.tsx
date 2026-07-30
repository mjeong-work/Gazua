import { Link } from 'react-router';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../ui/collapsible';
import { Checkbox } from '../ui/checkbox';

export type AgreementKey =
  | 'educational_platform'
  | 'no_advice'
  | 'ai_inaccuracies'
  | 'creator_opinions'
  | 'sole_responsibility'
  | 'terms'
  | 'privacy';

interface AgreementItem {
  key: AgreementKey;
  label: React.ReactNode;
}

const AGREEMENT_ITEMS: AgreementItem[] = [
  { key: 'educational_platform', label: 'Gazua is an educational research platform.' },
  { key: 'no_advice', label: 'Gazua does not provide investment advice.' },
  { key: 'ai_inaccuracies', label: 'AI-generated content may contain inaccuracies.' },
  { key: 'creator_opinions', label: 'Creator opinions do not represent Gazua.' },
  { key: 'sole_responsibility', label: 'I am solely responsible for my own investment decisions.' },
  {
    key: 'terms',
    label: (
      <>
        I agree to the{' '}
        <Link to="/legal/terms" className="text-brand hover:underline" target="_blank">
          Terms of Service
        </Link>
        .
      </>
    ),
  },
  {
    key: 'privacy',
    label: (
      <>
        I agree to the{' '}
        <Link to="/legal/privacy" className="text-brand hover:underline" target="_blank">
          Privacy Policy
        </Link>
        .
      </>
    ),
  },
];

interface AgreementCheckboxGroupProps {
  values: Record<AgreementKey, boolean>;
  onChange: (key: AgreementKey, checked: boolean) => void;
  className?: string;
}

// The 7 required onboarding acknowledgements, collapsed by default so the sign-up form
// doesn't read as an intimidating wall of legal text. Purely controlled — SignUp.tsx owns
// the checked state and gates its submit button on every item being true.
export default function AgreementCheckboxGroup({ values, onChange, className = '' }: AgreementCheckboxGroupProps) {
  return (
    <div className={`border border-gray-200 rounded-xl p-4 ${className}`}>
      <p className="text-sm font-medium mb-2">Responsible Investing Acknowledgement</p>
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors group">
          <span className="transition-transform duration-200 group-data-[state=open]:rotate-180">▼</span>
          Please review before creating your account
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pt-4 space-y-3">
            {AGREEMENT_ITEMS.map((item) => (
              <label key={item.key} className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={values[item.key]}
                  onCheckedChange={(checked) => onChange(item.key, checked as boolean)}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-600 leading-snug">{item.label}</span>
              </label>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
