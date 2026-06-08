import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type CommunityContext = {
  currentCommunityId: string | null;
  setCurrent: (id: string | null) => void;
};

export const communityContext = create<CommunityContext>()(
  persist(
    (set) => ({
      currentCommunityId: null,
      setCurrent: (id) => set({ currentCommunityId: id }),
    }),
    { name: 'community-ctx', storage: createJSONStorage(() => localStorage) },
  ),
);
