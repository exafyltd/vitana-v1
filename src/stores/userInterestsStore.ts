import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserInterests {
  interests: string[];
  wellness_goals: string[];
  filteringEnabled: boolean;
}

interface UserInterestsStore extends UserInterests {
  setInterests: (interests: string[]) => void;
  setWellnessGoals: (goals: string[]) => void;
  setFilteringEnabled: (enabled: boolean) => void;
  toggleInterest: (interest: string) => void;
  toggleWellnessGoal: (goal: string) => void;
  clearAll: () => void;
  getActiveTags: () => string[];
}

export const useUserInterestsStore = create<UserInterestsStore>()(
  persist(
    (set, get) => ({
      interests: [],
      wellness_goals: [],
      filteringEnabled: true,
      
      setInterests: (interests) => set({ interests }),
      
      setWellnessGoals: (goals) => set({ wellness_goals: goals }),
      
      setFilteringEnabled: (enabled) => set({ filteringEnabled: enabled }),
      
      toggleInterest: (interest) => set((state) => ({
        interests: state.interests.includes(interest)
          ? state.interests.filter(i => i !== interest)
          : [...state.interests, interest]
      })),
      
      toggleWellnessGoal: (goal) => set((state) => ({
        wellness_goals: state.wellness_goals.includes(goal)
          ? state.wellness_goals.filter(g => g !== goal)
          : [...state.wellness_goals, goal]
      })),
      
      clearAll: () => set({ interests: [], wellness_goals: [] }),
      
      getActiveTags: () => {
        const state = get();
        if (!state.filteringEnabled) return [];
        return [...state.interests, ...state.wellness_goals];
      }
    }),
    {
      name: 'user-interests-storage',
    }
  )
);
