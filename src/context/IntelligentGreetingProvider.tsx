import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useIntelligentGreeting } from '@/hooks/useIntelligentGreeting';
import { useAuth } from './AuthProvider';

interface IntelligentGreetingContextValue {
  triggerGreeting: () => Promise<void>;
  manualGreeting: () => Promise<void>;
  clearGreetingState: () => void;
}

const IntelligentGreetingContext = createContext<IntelligentGreetingContextValue | undefined>(undefined);

export function IntelligentGreetingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { triggerGreeting, manualGreeting, clearGreetingState } = useIntelligentGreeting();

  // Trigger greeting once per session after authentication
  useEffect(() => {
    if (user) {
      // Small delay to ensure app is fully loaded
      const timer = setTimeout(() => {
        triggerGreeting();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user, triggerGreeting]);

  // Clear greeting state on logout
  useEffect(() => {
    if (!user) {
      clearGreetingState();
    }
  }, [user, clearGreetingState]);

  const value = {
    triggerGreeting,
    manualGreeting,
    clearGreetingState,
  };

  return (
    <IntelligentGreetingContext.Provider value={value}>
      {children}
    </IntelligentGreetingContext.Provider>
  );
}

export function useIntelligentGreetingContext() {
  const context = useContext(IntelligentGreetingContext);
  if (!context) {
    throw new Error('useIntelligentGreetingContext must be used within IntelligentGreetingProvider');
  }
  return context;
}
