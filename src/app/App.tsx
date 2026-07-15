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
import AuthGuard from './components/AuthGuard';
import AuthCallback from './auth/callback';
import ResetPassword from './auth/reset-password';
import PricingPage from './components/PricingPage';
import SignIn from './components/SignIn';
import MainPagePosting from './components/MainPagePosting';
import MainPageReels from './components/MainPageReels';
import CreatorProfileInvestment from './components/CreatorProfileInvestment';
import CreatorProfileVideos from './components/CreatorProfileVideos';
import Welcome from './components/onboarding/Welcome';
import SignUp from './components/onboarding/SignUp';
import PickLevel from './components/onboarding/PickLevel';
import PickInterests from './components/onboarding/PickInterests';
import PickRisk from './components/onboarding/PickRisk';
import Complete from './components/onboarding/Complete';
import NotificationsPage from './components/NotificationsPage';
import AccountPage from './components/AccountPage';
import ModelHubPage from './components/ModelHubPage';
import CreatorsPage from './components/CreatorsPage';
import WatchlistPage from './components/WatchlistPage';
import { useAuth } from './contexts/AuthContext';
import InvestmentProfilePage from './components/InvestmentProfilePage';
import SubscriptionWelcome from './components/SubscriptionWelcome'
import ModerationPage from './components/ModerationPage';
import TermsPage from './components/TermsPage';
import PrivacyPage from './components/PrivacyPage';

export default function App() {
  return (
    // AuthProvider is outermost — resolves the session once for the whole tree.
    // OnboardingProvider and WatchlistProvider consume AuthContext via useAuth().
    <AuthProvider>
      <OnboardingProvider>
        <WatchlistProvider>
          <FollowProvider>
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
                  <Route path="/account"               element={<AccountPage />} />
                  <Route path="/subscription/welcome" element={<SubscriptionWelcome />} />
                  <Route path="/admin/moderation"    element={<ModerationPage />} />
                  <Route path="/terms"               element={<TermsPage />} />
                  <Route path="/privacy"             element={<PrivacyPage />} />

                  {/* ── Dynamic creator profiles ── */}
                  <Route path="/profile/:creatorId/investment" element={<CreatorProfileInvestment />} />
                  <Route path="/profile/:creatorId/videos"     element={<CreatorProfileVideos />} />
                  <Route path="/profile/:creatorId/models"     element={<ModelsRedirect />} />

                  {/* ── Legacy redirects ── */}
                  <Route path="/profile/investment"    element={<Navigate to="/profile/alex-rodriguez/investment" replace />} />
                  <Route path="/profile/videos"        element={<Navigate to="/profile/alex-rodriguez/videos" replace />} />
                  <Route path="/profile/models"        element={<Navigate to="/profile/alex-rodriguez/videos" replace />} />
                  <Route path="/create"                element={<Navigate to="/main" replace />} />
                  <Route path="/rewards"               element={<Navigate to="/main" replace />} />
                  <Route path="/investing"             element={<Navigate to="/main" replace />} />
                  <Route path="/crypto"                element={<Navigate to="/main" replace />} />
                  <Route path="/retirement"            element={<Navigate to="/main" replace />} />
                </Routes>
              </div>
            </AuthGuard>
          </BrowserRouter>
          </FollowProvider>
        </WatchlistProvider>
      </OnboardingProvider>
    </AuthProvider>
  );
}
