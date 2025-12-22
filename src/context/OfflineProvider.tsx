/**
 * Offline State Provider
 * 
 * Centralized offline detection for the entire app.
 * Provides isOffline state to any component that needs it.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

interface OfflineContextValue {
  isOffline: boolean;
}

const OfflineContext = createContext<OfflineContextValue>({ isOffline: false });

export function useOffline() {
  return useContext(OfflineContext);
}

interface OfflineProviderProps {
  children: React.ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      console.debug('[Offline] Back online');
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      console.debug('[Offline] Gone offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <OfflineContext.Provider value={{ isOffline }}>
      {children}
    </OfflineContext.Provider>
  );
}
