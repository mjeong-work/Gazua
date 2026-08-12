import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';

// Parallel to AuthGuard.tsx, used only inside the /admin route subtree — AuthGuard already
// requires login for any /admin* path (not in its PUBLIC_PREFIXES), so by the time this
// mounts the user is guaranteed authenticated; this adds the role check on top.
//
// This is a UX gate only, NOT the real security boundary: every admin service call is
// independently enforced server-side via RLS policies and the admin_set_*() RPCs (see
// 20260711000000_admin_roles_and_moderation.sql), which re-check is_admin() themselves. A
// non-admin could disable this component entirely and every write would still fail.
export default function AdminGuard({ children }: { children: ReactNode }) {
  const { profile, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-neutral-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold mb-2">Access Denied</h1>
          <p className="text-sm text-neutral-500 mb-6">
            You don't have permission to view this page.
          </p>
          <button
            onClick={() => navigate('/main')}
            className="px-6 py-2.5 bg-black text-white font-medium text-sm rounded-sm hover:bg-black/80 transition-colors"
          >
            Back to Gazua
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
