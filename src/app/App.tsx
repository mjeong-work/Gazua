import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router';

/** Redirect /profile/:creatorId/models → /profile/:creatorId/videos */
function ModelsRedirect() {
  const { creatorId = 'alex-rodriguez' } = useParams<{ creatorId: string }>();
  return <Navigate to={`/profile/${creatorId}/videos`} replace />;
}

/** Redirect /watchlist → own profile's Watching tab */
function WatchlistRedirect() {
  const { profile, isLoading } = useAuth();
  if (isLoading) return null;
  if (profile?.username) {
    return <Navigate to={`/profile/${profile.username}/investment?tab=watching`} replace />;
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
import AuthCallback from './auth/callback';
import ResetPassword from './auth/reset-password';
import PricingPage from './components/PricingPage';
import SignIn from './components/SignIn';
import MainPagePosting from './components/MainPagePosting';
import MainPageReels from './components/MainPageReels';
import CreatorProfileInvestment from './components/CreatorProfileInvestment';
import CreatorProfileVideos from './components/CreatorProfileVideos';
import VideoWatchPage from './components/VideoWatchPage';
import Welcome from './components/onboarding/Welcome';
import SignUp from './components/onboarding/SignUp';
import PickLevel from './components/onboarding/PickLevel';
import PickInterests from './components/onboarding/PickInterests';
import PickRisk from './components/onboarding/PickRisk';
import Complete from './components/onboarding/Complete';
import NotificationsPage from './components/NotificationsPage';
import AccountPage from './components/AccountPage';
import CreatePage from './components/CreatePage';
import MessagesPage from './components/MessagesPage';
import ModelHubPage from './components/ModelHubPage';
import CreatorsPage from './components/CreatorsPage';
import WatchlistPage from './components/WatchlistPage';
import MyProfilePage from './components/MyProfilePage';
import { useAuth } from './contexts/AuthContext';
import InvestmentProfilePage from './components/InvestmentProfilePage';
import SubscriptionWelcome from './components/SubscriptionWelcome'
import LegalPage from './components/legal/LegalPage';
import WeeklyReminderModal from './components/compliance/WeeklyReminderModal';
import AdminGuard from './components/admin/AdminGuard';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboardPage from './components/admin/AdminDashboardPage';
import AdminUsersPage from './components/admin/AdminUsersPage';
import AdminUserDetailPage from './components/admin/AdminUserDetailPage';
import AdminReportsPage from './components/admin/AdminReportsPage';
import AdminContentPage from './components/admin/AdminContentPage';
import AdminAuditLogPage from './components/admin/AdminAuditLogPage';

export default function App() {
  return (
    // AuthProvider is outermost — resolves the session once for the whole tree.
    // OnboardingProvider and WatchlistProvider consume AuthContext via useAuth().
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
                  <Route path="/models"                element={<ModelHubPage />} />
                  <Route path="/creators"              element={<CreatorsPage />} />
                  <Route path="/watchlist"             element={<WatchlistRedirect />} />
                  <Route path="/insights"              element={<InvestmentProfilePage />} />
                  <Route path="/notifications"         element={<NotificationsPage />} />
                  <Route path="/messages"              element={<MessagesPage />} />
                  <Route path="/account"               element={<AccountPage />} />
                  <Route path="/my-profile"            element={<MyProfilePage />} />
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

                  {/* ── Legacy redirects ── */}
                  <Route path="/profile/investment"    element={<Navigate to="/profile/alex-rodriguez/investment" replace />} />
                  <Route path="/profile/videos"        element={<Navigate to="/profile/alex-rodriguez/videos" replace />} />
                  <Route path="/profile/models"        element={<Navigate to="/profile/alex-rodriguez/videos" replace />} />
                  <Route path="/create"                element={<CreatePage />} />
                  <Route path="/rewards"               element={<Navigate to="/main" replace />} />
                  <Route path="/investing"             element={<Navigate to="/main" replace />} />
                  <Route path="/crypto"                element={<Navigate to="/main" replace />} />
                  <Route path="/retirement"            element={<Navigate to="/main" replace />} />
                </Routes>
              </div>
              <WeeklyReminderModal />
            </AuthGuard>
          </BrowserRouter>
          </MessagesProvider>
          </SavedContentProvider>
          </FollowProvider>
        </WatchlistProvider>
      </OnboardingProvider>
    </AuthProvider>
  );
}
