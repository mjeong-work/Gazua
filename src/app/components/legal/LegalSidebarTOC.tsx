import { useEffect, useRef, useState } from 'react';
import type { LegalHeading } from '../../../lib/legal/types';

interface LegalSidebarTOCProps {
  headings: LegalHeading[];
  className?: string;
}

export default function LegalSidebarTOC({ headings, className = '' }: LegalSidebarTOCProps) {
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top of the viewport among those currently visible.
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );

    for (const heading of headings) {
      const el = document.getElementById(heading.id);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className={`sticky top-20 self-start ${className}`}>
      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
        On this page
      </p>
      <ul className="space-y-2 border-l border-gray-200 dark:border-gray-800">
        {headings.map((heading) => (
          <li key={heading.id} style={{ paddingLeft: heading.depth === 3 ? '1.5rem' : '0.875rem' }}>
            <a
              href={`#${heading.id}`}
              className={`block -ml-px border-l pl-3 text-sm transition-colors ${
                activeId === heading.id
                  ? 'border-brand text-brand font-medium'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
