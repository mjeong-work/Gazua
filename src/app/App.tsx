import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router';

/** Redirect /profile/:creatorId/models → /profile/:creatorId/videos */
function ModelsRedirect() {
  const { creatorId = 'alex-rodriguez' } = useParams<{ creatorId: string }>();
  return <Navigate to={`/profile/${creatorId}/videos`} replace />;
}

/** Redirect /watchlist → My Profile's Watching tab */
function WatchlistRedirect() {
  const { profile, isLoading } = useAuth();
  if (isLoading) return null;
  if (profile?.username) {
    return <Navigate to="/my-profile?tab=watching" replace />;
  }
  return <Navigate to="/main" replace />;
}
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { WatchlistProvider } from './contexts/WatchlistContext';
import { FollowProvider } from './contexts/FollowContext';
import { SavedContentProvider } from './contexts/SavedContentContext';
import { MessagesProvider } from './contexts/MessagesContext';
import AuthGuard from './components/AuthGuard';
import { useAuth } from './contexts/AuthContext';
import AdminGuard from './components/admin/AdminGuard';
import ErrorBoundary from './components/ErrorBoundary';
import { MODELS_ENABLED } from './featureFlags';

// Route-level code splitting (audit Issue 10) — every page previously imported eagerly here,
// so App.tsx alone pulled the entire app (every onboarding step, the whole admin section, every
// creator/reel/video page) into the one main bundle regardless of which route a visitor actually
// hit. React.lazy + the <Suspense> below means each page's code only downloads when its route is
// reached. Providers/guards/layout stay eager — they're small and needed for every route anyway.
const AuthCallback = lazy(() => import('./auth/callback'));
const ResetPassword = lazy(() => import('./auth/reset-password'));
const PricingPage = lazy(() => import('./components/PricingPage'));
const SignIn = lazy(() => import('./components/SignIn'));
const MainPagePosting = lazy(() => import('./components/MainPagePosting'));
const MainPageReels = lazy(() => import('./components/MainPageReels'));
const CreatorProfileInvestment = lazy(() => import('./components/CreatorProfileInvestment'));
const CreatorProfileVideos = lazy(() => import('./components/CreatorProfileVideos'));
const VideoWatchPage = lazy(() => import('./components/VideoWatchPage'));
const AssetPage = lazy(() => import('./components/AssetPage'));
const Welcome = lazy(() => import('./components/onboarding/Welcome'));
const SignUp = lazy(() => import('./components/onboarding/SignUp'));
const PickLevel = lazy(() => import('./components/onboarding/PickLevel'));
const PickInterests = lazy(() => import('./components/onboarding/PickInterests'));
const PickRisk = lazy(() => import('./components/onboarding/PickRisk'));
const Complete = lazy(() => import('./components/onboarding/Complete'));
const NotificationsPage = lazy(() => import('./components/NotificationsPage'));
const ProfileSettingsPage = lazy(() => import('./components/ProfileSettingsPage'));
const CreatePage = lazy(() => import('./components/CreatePage'));
const MessagesPage = lazy(() => import('./components/MessagesPage'));
const ModelHubPage = lazy(() => import('./components/ModelHubPage'));
const CreatorsPage = lazy(() => import('./components/CreatorsPage'));
const MyProfilePage = lazy(() => import('./components/MyProfilePage'));
const InvestmentProfilePage = lazy(() => import('./components/InvestmentProfilePage'));
const SubscriptionWelcome = lazy(() => import('./components/SubscriptionWelcome'));
const LegalPage = lazy(() => import('./components/legal/LegalPage'));
const WeeklyReminderModal = lazy(() => import('./components/compliance/WeeklyReminderModal'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboardPage = lazy(() => import('./components/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./components/admin/AdminUsersPage'));
const AdminUserDetailPage = lazy(() => import('./components/admin/AdminUserDetailPage'));
const AdminReportsPage = lazy(() => import('./components/admin/AdminReportsPage'));
const AdminContentPage = lazy(() => import('./components/admin/AdminContentPage'));
const AdminAuditLogPage = lazy(() => import('./components/admin/AdminAuditLogPage'));

function RouteFallback() {
  return (
    <div className="size-full min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-neutral-200 border-t-black rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    // ErrorBoundary is the true outermost layer — a render-time throw anywhere below (including
    // inside a provider) or a stale-chunk lazy-import failure after a redeploy used to
    // white-screen the whole app with nothing catching it (audit finding).
    <ErrorBoundary>
    {/* AuthProvider is outermost inside that — resolves the session once for the whole tree.
        OnboardingProvider and WatchlistProvider consume AuthContext via useAuth(). */}
    <AuthProvider>
      <OnboardingProvider>
        <WatchlistProvider>
          <FollowProvider>
          <SavedContentProvider>
          <MessagesProvider>
          <BrowserRouter>
            <Toaster position="top-center" richColors />
            {/* AuthGuard needs BrowserRouter for useLocation(). */}
            {/* It shows a spinner while the session is loading, then either   */}
            {/* renders children (public + authenticated) or redirects to /signin. */}
            <AuthGuard>
              <div className="size-full bg-white">
                <Suspense fallback={<RouteFallback />}>
                <Routes>
                  {/* ── Public ── */}
                  <Route path="/"                      element={<PricingPage />} />
                  <Route path="/pricing"               element={<PricingPage />} />
                  <Route path="/signin"                element={<SignIn />} />
                  <Route path="/auth/callback"         element={<AuthCallback />} />
                  <Route path="/auth/reset-password"  element={<ResetPassword />} />

                  {/* ── Onboarding (public — user may not be logged in yet) ── */}
                  <Route path="/onboard"               element={<Navigate to="/onboarding/welcome" replace />} />
                  <Route path="/onboarding"            element={<Navigate to="/onboarding/welcome" replace />} />
                  <Route path="/onboarding/welcome"    element={<Welcome />} />
                  <Route path="/onboarding/signup"     element={<SignUp />} />
                  <Route path="/onboarding/level"      element={<PickLevel />} />
                  <Route path="/onboarding/interests"  element={<PickInterests />} />
                  <Route path="/onboarding/risk"       element={<PickRisk />} />
                  <Route path="/onboarding/complete"   element={<Complete />} />

                  {/* ── Protected ── */}
                  <Route path="/main"                  element={<MainPagePosting />} />
                  <Route path="/home"                  element={<MainPagePosting />} />
                  <Route path="/main/reels"            element={<MainPageReels />} />
                  <Route path="/models"                element={MODELS_ENABLED ? <ModelHubPage /> : <Navigate to="/main" replace />} />
                  <Route path="/creators"              element={<CreatorsPage />} />
                  <Route path="/watchlist"             element={<WatchlistRedirect />} />
                  <Route path="/insights"              element={<InvestmentProfilePage />} />
                  <Route path="/notifications"         element={<NotificationsPage />} />
                  <Route path="/messages"              element={<MessagesPage />} />
                  <Route path="/my-profile"            element={<MyProfilePage />} />
                  <Route path="/my-profile/settings"   element={<ProfileSettingsPage />} />
                  <Route path="/subscription/welcome" element={<SubscriptionWelcome />} />
                  <Route path="/legal/:slug"         element={<LegalPage />} />
                  <Route path="/terms"               element={<Navigate to="/legal/terms" replace />} />
                  <Route path="/privacy"             element={<Navigate to="/legal/privacy" replace />} />

                  {/* ── Admin (role-gated by AdminGuard, on top of AuthGuard's existing
                       login requirement) ── */}
                  <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
                    <Route index                element={<AdminDashboardPage />} />
                    <Route path="users"         element={<AdminUsersPage />} />
                    <Route path="users/:userId" element={<AdminUserDetailPage />} />
                    <Route path="reports"       element={<AdminReportsPage />} />
                    <Route path="content"       element={<AdminContentPage />} />
                    <Route path="audit-log"     element={<AdminAuditLogPage />} />
                  </Route>
                  <Route path="/admin/moderation" element={<Navigate to="/admin/reports" replace />} />

                  {/* ── Dynamic creator profiles ── */}
                  <Route path="/profile/:creatorId/investment" element={<CreatorProfileInvestment />} />
                  <Route path="/profile/:creatorId/videos"     element={<CreatorProfileVideos />} />
                  <Route path="/profile/:creatorId/models"     element={<ModelsRedirect />} />
                  <Route path="/watch/:videoId"                element={<VideoWatchPage />} />
                  <Route path="/asset/:symbol"                 element={<AssetPage />} />

                  {/* ── Legacy redirects ── */}
                  <Route path="/profile/investment"    element={<Navigate to="/profile/alex-rodriguez/investment" replace />} />
                  <Route path="/profile/videos"        element={<Navigate to="/profile/alex-rodriguez/videos" replace />} />
                  <Route path="/profile/models"        element={<Navigate to="/profile/alex-rodriguez/videos" replace />} />
                  <Route path="/account"               element={<Navigate to="/my-profile/settings" replace />} />
                  <Route path="/create"                element={<CreatePage />} />
                  <Route path="/rewards"               element={<Navigate to="/main" replace />} />
                  <Route path="/investing"             element={<Navigate to="/main" replace />} />
                  <Route path="/crypto"                element={<Navigate to="/main" replace />} />
                  <Route path="/retirement"            element={<Navigate to="/main" replace />} />
                </Routes>
                </Suspense>
              </div>
              <Suspense fallback={null}>
                <WeeklyReminderModal />
              </Suspense>
            </AuthGuard>
          </BrowserRouter>
          </MessagesProvider>
          </SavedContentProvider>
          </FollowProvider>
        </WatchlistProvider>
      </OnboardingProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}
