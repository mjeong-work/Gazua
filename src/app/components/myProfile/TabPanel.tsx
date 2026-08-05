import { useEffect, useRef, type ReactNode } from 'react';

interface TabPanelProps {
  active: boolean;
  children: ReactNode;
}

// Wraps a tab's content so it can stay mounted (preserving in-progress state — see Issue 11's
// tab-switch regression fix) while genuinely removed from the accessibility tree and keyboard
// tab order when inactive, not just visually hidden.
//
// `inert` is the right primitive for this (one attribute disables focus + AT visibility for the
// whole subtree, no need to hunt down every button/input in each tab individually), but this
// app runs react-dom 18.3.1, and React only added first-class support for passing `inert`
// through as a JSX prop in React 19 — on 18 it's silently dropped from the DOM (confirmed by
// inspecting the rendered element directly, not assumed). Setting it imperatively via a ref
// sidesteps React's prop allowlist entirely since it's plain DOM property assignment, so it
// works regardless of React version.
export default function TabPanel({ active, children }: TabPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Cast: TS's DOM lib types HTMLElement.inert (it's a real, standard property), the gap is
    // only in React 18's JSX prop passthrough, not the DOM API itself.
    (el as HTMLElement & { inert: boolean }).inert = !active;
  }, [active]);

  return (
    <div ref={ref} className={active ? '' : 'hidden'} aria-hidden={!active}>
      {children}
    </div>
  );
}
