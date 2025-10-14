import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useIntelligentGreeting } from '@/hooks/useIntelligentGreeting';
import { useAuth } from './AuthProvider';

interface IntelligentGreetingContextValue {
  triggerGreeting: () => Promise<void>;
  manualGreeting: () => Promise<void>;
  clearGreetingState: () => void;
  isSpeaking: boolean;
}

const IntelligentGreetingContext = createContext<IntelligentGreetingContextValue | undefined>(undefined);

export function IntelligentGreetingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { triggerGreeting, manualGreeting, clearGreetingState, isSpeaking } = useIntelligentGreeting();

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
    isSpeaking
  };

  return (
    <IntelligentGreetingContext.Provider value={value}>
      {children}
      
      {/* Visual feedback when Vitana is speaking */}
      {isSpeaking && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse z-50">
          <span className="text-lg">🔊</span>
          <span className="text-sm font-medium">Vitana is speaking...</span>
        </div>
      )}
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
