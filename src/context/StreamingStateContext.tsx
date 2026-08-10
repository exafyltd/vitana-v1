import { createContext, useContext, useState, useMemo, ReactNode } from 'react';

interface StreamingStateContextValue {
  glassModeActive: boolean;
  micActive: boolean;
  sessionReady: boolean;
  audioOverlayVisible: boolean;
  triggeredByOrb: boolean;
  cameraActive: boolean;
  screenShareActive: boolean;
  diaryActive: boolean;
  autopilotActive: boolean;
  textInputVisible: boolean;
  setGlassModeActive: (active: boolean) => void;
  setMicActive: (active: boolean) => void;
  setSessionReady: (ready: boolean) => void;
  setAudioOverlayVisible: (visible: boolean) => void;
  setTriggeredByOrb: (triggered: boolean) => void;
  setCameraActive: (active: boolean) => void;
  setScreenShareActive: (active: boolean) => void;
  setDiaryActive: (active: boolean) => void;
  setAutopilotActive: (active: boolean) => void;
  setTextInputVisible: (visible: boolean) => void;
}

const StreamingStateContext = createContext<StreamingStateContextValue | undefined>(undefined);

export function StreamingStateProvider({ children }: { children: ReactNode }) {
  const [glassModeActive, setGlassModeActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [audioOverlayVisible, setAudioOverlayVisible] = useState(false);
  const [triggeredByOrb, setTriggeredByOrb] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [screenShareActive, setScreenShareActive] = useState(false);
  const [diaryActive, setDiaryActive] = useState(false);
  const [autopilotActive, setAutopilotActive] = useState(false);
  const [textInputVisible, setTextInputVisible] = useState(false);

  // Memoized so this root-level provider doesn't hand every consumer a fresh
  // object (and thus a re-render) each time the provider itself re-renders.
  // All setters come from useState and are referentially stable.
  const value = useMemo(
    () => ({
      glassModeActive,
      micActive,
      sessionReady,
      audioOverlayVisible,
      triggeredByOrb,
      cameraActive,
      screenShareActive,
      diaryActive,
      autopilotActive,
      textInputVisible,
      setGlassModeActive,
      setMicActive,
      setSessionReady,
      setAudioOverlayVisible,
      setTriggeredByOrb,
      setCameraActive,
      setScreenShareActive,
      setDiaryActive,
      setAutopilotActive,
      setTextInputVisible,
    }),
    [
      glassModeActive,
      micActive,
      sessionReady,
      audioOverlayVisible,
      triggeredByOrb,
      cameraActive,
      screenShareActive,
      diaryActive,
      autopilotActive,
      textInputVisible,
    ]
  );

  return (
    <StreamingStateContext.Provider value={value}>
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
