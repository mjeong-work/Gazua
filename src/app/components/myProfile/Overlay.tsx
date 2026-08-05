import type { ReactNode } from 'react';

// Defined once, shared by every MyProfilePage modal (Investment's New Simulation form, Edit
// Profile, Post Composer) — a stable identity across re-renders matters here since an inline
// component defined inside a render function would get remounted on every render, which was
// killing focus in modal inputs after every keystroke.
export default function Overlay({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}
