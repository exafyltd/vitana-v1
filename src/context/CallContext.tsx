import { createContext, useContext, ReactNode } from 'react';
import { useCallState } from '@/hooks/useCallState';
import type { CallData } from '@/hooks/useCallState';

interface CallContextValue {
  activeCall: CallData | null;
  incomingCall: CallData | null;
  startCall: (recipientId: string, isVideoCall: boolean) => Promise<string>;
  acceptCall: (callData: CallData) => Promise<void>;
  rejectCall: (callData: CallData) => Promise<void>;
  endCall: () => Promise<void>;
}

const CallContext = createContext<CallContextValue | null>(null);

interface CallProviderProps {
  userId: string;
  userName: string;
  children: ReactNode;
}

export const CallProvider = ({ userId, userName, children }: CallProviderProps) => {
  console.log('🎬 CallProvider: Initializing with userId:', userId);
  
  const callState = useCallState(userId);

  return (
    <CallContext.Provider value={callState}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
