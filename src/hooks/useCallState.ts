import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export type CallState = 'idle' | 'calling' | 'ringing' | 'active' | 'ended';

interface CallData {
  callId: string;
  callerId: string;
  recipientId: string;
  isVideoCall: boolean;
  state: CallState;
}

export const useCallState = (userId: string) => {
  const [activeCall, setActiveCall] = useState<CallData | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const channelRef = useState<RealtimeChannel | null>(null)[0];

  useEffect(() => {
    const channel = supabase.channel(`user:${userId}:calls`);

    channel
      .on('broadcast', { event: 'incoming-call' }, ({ payload }) => {
        if (payload.recipientId === userId) {
          setIncomingCall(payload);
        }
      })
      .on('broadcast', { event: 'call-accepted' }, ({ payload }) => {
        if (payload.callerId === userId || payload.recipientId === userId) {
          setActiveCall({ ...payload, state: 'active' });
          setIncomingCall(null);
        }
      })
      .on('broadcast', { event: 'call-rejected' }, ({ payload }) => {
        if (payload.callerId === userId) {
          setActiveCall(null);
          setIncomingCall(null);
        }
      })
      .on('broadcast', { event: 'call-ended' }, ({ payload }) => {
        if (payload.callerId === userId || payload.recipientId === userId) {
          setActiveCall(null);
          setIncomingCall(null);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  const startCall = useCallback(async (recipientId: string, isVideoCall: boolean) => {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const callData: CallData = {
      callId,
      callerId: userId,
      recipientId,
      isVideoCall,
      state: 'calling',
    };

    setActiveCall(callData);

    const channel = supabase.channel(`user:${recipientId}:calls`);
    await channel.subscribe();
    
    await channel.send({
      type: 'broadcast',
      event: 'incoming-call',
      payload: callData,
    });

    return callId;
  }, [userId]);

  const acceptCall = useCallback(async (callData: CallData) => {
    const channel = supabase.channel(`user:${callData.callerId}:calls`);
    await channel.subscribe();

    await channel.send({
      type: 'broadcast',
      event: 'call-accepted',
      payload: { ...callData, state: 'active' },
    });

    setActiveCall({ ...callData, state: 'active' });
    setIncomingCall(null);
  }, []);

  const rejectCall = useCallback(async (callData: CallData) => {
    const channel = supabase.channel(`user:${callData.callerId}:calls`);
    await channel.subscribe();

    await channel.send({
      type: 'broadcast',
      event: 'call-rejected',
      payload: callData,
    });

    setIncomingCall(null);
  }, []);

  const endCall = useCallback(async () => {
    if (!activeCall) return;

    const recipientId = activeCall.callerId === userId ? activeCall.recipientId : activeCall.callerId;
    
    const channel = supabase.channel(`user:${recipientId}:calls`);
    await channel.subscribe();

    await channel.send({
      type: 'broadcast',
      event: 'call-ended',
      payload: activeCall,
    });

    setActiveCall(null);
  }, [activeCall, userId]);

  return {
    activeCall,
    incomingCall,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
  };
};
