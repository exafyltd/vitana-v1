import { createContext, useContext, useState, ReactNode } from 'react';

interface StreamingStateContextValue {
  glassModeActive: boolean;
  micActive: boolean;
  sessionReady: boolean;
  setGlassModeActive: (active: boolean) => void;
  setMicActive: (active: boolean) => void;
  setSessionReady: (ready: boolean) => void;
}

const StreamingStateContext = createContext<StreamingStateContextValue | undefined>(undefined);

export function StreamingStateProvider({ children }: { children: ReactNode }) {
  const [glassModeActive, setGlassModeActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  return (
    <StreamingStateContext.Provider
      value={{
        glassModeActive,
        micActive,
        sessionReady,
        setGlassModeActive,
        setMicActive,
        setSessionReady,
      }}
    >
      {children}
    </StreamingStateContext.Provider>
  );
}

export function useStreamingState() {
  const context = useContext(StreamingStateContext);
  if (!context) {
    throw new Error('useStreamingState must be used within StreamingStateProvider');
  }
  return context;
}
