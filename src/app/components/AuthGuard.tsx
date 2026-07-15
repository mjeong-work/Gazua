import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

// Routes that do not require authentication.
// Any pathname that starts with one of these prefixes is considered public.
const PUBLIC_PREFIXES = ['/', '/signin', '/onboarding', '/auth', '/pricing'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(prefix + '/')
  );
}

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { pathname } = useLocation();

  // While session is resolving, show a centered spinner instead of redirecting.
  // This prevents a flash-redirect when the user is actually authenticated.
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated && !isPublic(pathname)) {
    return <Navigate to="/signin" replace state={{ from: pathname }} />;
  }

  return <>{children}</>;
}
