import type { ReactNode } from 'react';
import { Link } from 'react-router';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { slugifyHeading } from '../../../lib/legal/slugify';

function flattenToText(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenToText).join('');
  return '';
}

interface LegalDocumentRendererProps {
  markdown: string;
}

// Maps markdown elements to the exact typography classes TermsPage/PrivacyPage used
// (max-w-3xl reading column, text-sm/gray-700 body copy, brand-token links), so rendered
// markdown is visually indistinguishable from the old hardcoded-JSX pages, now with
// dark-mode variants and scroll-margin for anchor-linked headings under the sticky header.
export default function LegalDocumentRenderer({ markdown }: LegalDocumentRendererProps) {
  return (
    <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => {
            const id = slugifyHeading(flattenToText(children));
            return (
              <h2 id={id} className="text-lg font-bold text-black dark:text-white mt-10 first:mt-0 mb-3 scroll-mt-24">
                {children}
              </h2>
            );
          },
          h3: ({ children }) => {
            const id = slugifyHeading(flattenToText(children));
            return (
              <h3 id={id} className="text-base font-semibold text-black dark:text-white mt-6 mb-2 scroll-mt-24">
                {children}
              </h3>
            );
          },
          p: ({ children }) => <p className="mb-3">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside space-y-2 ml-2 mb-3">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-2 ml-2 mb-3">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-black dark:text-white">{children}</strong>,
          hr: () => <hr className="my-8 border-gray-200 dark:border-gray-800" />,
          a: ({ href, children }) => {
            if (!href) return <>{children}</>;
            const isInternal = href.startsWith('/');
            const className = 'text-brand hover:underline';
            if (isInternal) {
              return <Link to={href} className={className}>{children}</Link>;
            }
            return <a href={href} className={className}>{children}</a>;
          },
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-gray-200 dark:border-gray-800 px-3 py-2 text-left font-semibold text-black dark:text-white">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-200 dark:border-gray-800 px-3 py-2 align-top">{children}</td>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
