import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useIntelligentGreeting } from '@/hooks/useIntelligentGreeting';
import { useAuth } from './AuthProvider';
import { useStreamingState } from './StreamingStateContext';

interface IntelligentGreetingContextValue {
  triggerGreeting: () => Promise<void>;
  manualGreeting: () => Promise<void>;
  suppressGreeting: () => void;
  cancelGreeting: () => void;
  schedulePostGlassCooldown: () => void;
  clearGreetingState: () => void;
  isSpeaking: boolean;
}

interface IntelligentGreetingProviderProps {
  children: ReactNode;
  glassModeActive?: boolean;
  micActive?: boolean;
  sessionReady?: boolean;
}

const IntelligentGreetingContext = createContext<IntelligentGreetingContextValue | undefined>(undefined);

export function IntelligentGreetingProvider({ 
  children, 
  glassModeActive = false,
  micActive = false,
  sessionReady = false
}: IntelligentGreetingProviderProps) {
  const { user } = useAuth();
  const [hasPendingTTS, setHasPendingTTS] = useState(false);
  
  const { 
    triggerGreeting, 
    manualGreeting, 
    suppressGreeting,
    cancelGreeting,
    schedulePostGlassCooldown,
    clearGreetingState, 
    isSpeaking 
  } = useIntelligentGreeting({
    glassModeActive,
    micActive,
    sessionReady,
    hasPendingTTS
  });

  // Monitor TTS state
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      setHasPendingTTS(window.speechSynthesis.speaking || window.speechSynthesis.pending);
      
      const checkTTS = setInterval(() => {
        setHasPendingTTS(window.speechSynthesis.speaking || window.speechSynthesis.pending);
      }, 500);
      
      return () => clearInterval(checkTTS);
    }
  }, []);

  // Trigger greeting once per session after authentication AND session ready
  useEffect(() => {
    if (user && sessionReady && !glassModeActive && !micActive) {
      // Wait 5s to ensure everything is stable
      const timer = setTimeout(() => {
        triggerGreeting();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [user, sessionReady, glassModeActive, micActive, triggerGreeting]);

  // Clear greeting state on logout
  useEffect(() => {
    if (!user) {
      clearGreetingState();
    }
  }, [user, clearGreetingState]);

  const value = {
    triggerGreeting,
    manualGreeting,
    suppressGreeting,
    cancelGreeting,
    schedulePostGlassCooldown,
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
