import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type User = {
  id: string;
  email: string;
  name: string;
  globalRole: 'user' | 'superadmin' | string;
  status: 'active' | 'disabled' | string;
  interests?: string[];
  // Matches the backend SafeUser.onboarding shape (PRD 10 §6) so the
  // /onboard/profile gate in landingPathAfterAuth can key off real timestamps
  // rather than the older boolean shape that never matched the API.
  onboarding?: {
    profileCompletedAt?: string | null;
    interestsCompletedAt?: string | null;
  };
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  hydrated: boolean;
  setTokens: (at: string, rt: string) => void;
  setUser: (u: User | null) => void;
  loginSuccess: (at: string, rt: string, user: User) => void;
  logout: () => void;
};

export const authStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      hydrated: false,
      setTokens: (at, rt) => set({ accessToken: at, refreshToken: rt }),
      setUser: (u) => set({ user: u }),
      loginSuccess: (at, rt, user) => set({ accessToken: at, refreshToken: rt, user }),
      logout: () => {
        set({ accessToken: null, refreshToken: null, user: null });
        try {
          localStorage.removeItem('community-ctx');
        } catch {
          // ignore; SSR / no-storage envs
        }
      },
    }),
    {
      name: 'community-auth',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export function useAuth() {
  return authStore();
}
