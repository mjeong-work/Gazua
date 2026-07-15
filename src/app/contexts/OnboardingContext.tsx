import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getProfile, updateOnboarding } from '../../lib/services/profiles.service';

type Level = 'beginner' | 'experienced' | 'confident';
type RiskStyle = 'conservative' | 'balanced' | 'aggressive' | 'speculative';

interface OnboardingData {
  level: Level | null;
  interests: string[];
  riskStyle: RiskStyle | null;
}

interface OnboardingContextType {
  data: OnboardingData;
  setLevel: (level: Level) => void;
  setInterests: (interests: string[]) => void;
  setRiskStyle: (style: RiskStyle) => void;
  isOnboarded: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

const STORAGE_KEY = 'gazua_onboarding';
const DEFAULT_DATA: OnboardingData = { level: null, interests: [], riskStyle: null };

function loadFromStorage(): { data: OnboardingData; isOnboarded: boolean } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        data: parsed.data ?? DEFAULT_DATA,
        isOnboarded: parsed.isOnboarded ?? false,
      };
    }
  } catch {}
  return { data: DEFAULT_DATA, isOnboarded: false };
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const initial = loadFromStorage();
  const [data, setData] = useState<OnboardingData>(initial.data);
  const [isOnboarded, setIsOnboarded] = useState(initial.isOnboarded);

  // Ref keeps the current userId available inside callbacks without stale closures.
  const userIdRef = useRef<string | null>(null);

  // Hydrate from Supabase profile when auth user changes.
  useEffect(() => {
    const uid = user?.id ?? null;
    userIdRef.current = uid;

    if (uid) {
      getProfile(uid).then(({ data: profile }) => {
        if (!profile) return;
        setData({
          level: (profile.onboarding_level as Level | null) ?? null,
          interests: profile.onboarding_interests ?? [],
          riskStyle: (profile.onboarding_risk_style as RiskStyle | null) ?? null,
        });
        setIsOnboarded(profile.onboarding_completed ?? false);
      });
    } else {
      // Logged out — fall back to localStorage state.
      const stored = loadFromStorage();
      setData(stored.data);
      setIsOnboarded(stored.isOnboarded);
    }
  }, [user?.id]);

  // Mirror every state change to localStorage so guest/offline state persists.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, isOnboarded }));
    } catch {}
  }, [data, isOnboarded]);

  // Fire-and-forget Supabase write. Errors are silent — localStorage already
  // has the latest value, so the user experience is never blocked.
  const syncToSupabase = (updates: Parameters<typeof updateOnboarding>[1]) => {
    const uid = userIdRef.current;
    if (!uid) return;
    updateOnboarding(uid, updates).catch(() => {});
  };

  const setLevel = (level: Level) => {
    setData(prev => ({ ...prev, level }));
    syncToSupabase({ onboarding_level: level });
  };

  const setInterests = (interests: string[]) => {
    setData(prev => ({ ...prev, interests }));
    syncToSupabase({ onboarding_interests: interests });
  };

  const setRiskStyle = (style: RiskStyle) => {
    setData(prev => ({ ...prev, riskStyle: style }));
    syncToSupabase({ onboarding_risk_style: style });
  };

  const completeOnboarding = () => {
    setIsOnboarded(true);
    syncToSupabase({ onboarding_completed: true });
  };

  const resetOnboarding = () => {
    setData(DEFAULT_DATA);
    setIsOnboarded(false);
  };

  return (
    <OnboardingContext.Provider
      value={{ data, setLevel, setInterests, setRiskStyle, isOnboarded, completeOnboarding, resetOnboarding }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) throw new Error('useOnboarding must be used within an OnboardingProvider');
  return context;
}
