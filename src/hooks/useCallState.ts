import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export type CallState = 'idle' | 'calling' | 'ringing' | 'active' | 'ended' | 'no-answer';

interface UserProfile {
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface CallData {
  callId: string;
  callerId: string;
  recipientId: string;
  isVideoCall: boolean;
  state: CallState;
  callerName?: string;
  callerAvatar?: string;
  recipientName?: string;
  recipientAvatar?: string;
}

const CALL_TIMEOUT_MS = 30000; // 30 seconds

export const useCallState = (userId: string) => {
  const [activeCall, setActiveCall] = useState<CallData | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  console.log('📞 useCallState initialized for user:', userId);

  // Fetch user profile data
  const fetchUserProfile = useCallback(async (targetUserId: string): Promise<UserProfile> => {
    try {
      console.log('👤 Fetching profile for user:', targetUserId);
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, full_name, avatar_url')
        .eq('user_id', targetUserId)
        .single();

      if (error) throw error;
      
      console.log('✅ Profile fetched:', data);
      return data || { display_name: null, full_name: null, avatar_url: null };
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      return { display_name: null, full_name: null, avatar_url: null };
    }
  }, []);

  // Clear call timeout
  const clearCallTimeout = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  }, []);

  // Set call timeout for auto-rejection
  const setCallTimeout = useCallback((callData: CallData) => {
    clearCallTimeout();
    
    callTimeoutRef.current = setTimeout(async () => {
      console.log('⏰ Call timeout - auto-rejecting');
      
      // Send no-answer event to caller
      const channel = supabase.channel(`user:${callData.callerId}:calls`);
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'call-no-answer',
        payload: { ...callData, state: 'no-answer' },
      });
      
      // Clear local state
      setIncomingCall(null);
      setActiveCall(null);
    }, CALL_TIMEOUT_MS);
  }, [clearCallTimeout]);

  useEffect(() => {
    console.log('🔌 Setting up Supabase channel for user:', userId);
    const channel = supabase.channel(`user:${userId}:calls`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'incoming-call' }, ({ payload }) => {
        if (payload.recipientId === userId) {
          console.log('📞 Incoming call received:', payload);
          setIncomingCall(payload);
          setCallTimeout(payload); // Start timeout timer
        }
      })
      .on('broadcast', { event: 'call-accepted' }, ({ payload }) => {
        if (payload.callerId === userId || payload.recipientId === userId) {
          console.log('✅ Call accepted:', payload);
          clearCallTimeout(); // Clear timeout when call is accepted
          setActiveCall({ ...payload, state: 'active' });
          setIncomingCall(null);
        }
      })
      .on('broadcast', { event: 'call-rejected' }, ({ payload }) => {
        if (payload.callerId === userId) {
          console.log('❌ Call rejected:', payload);
          clearCallTimeout();
          setActiveCall(null);
          setIncomingCall(null);
        }
      })
      .on('broadcast', { event: 'call-no-answer' }, ({ payload }) => {
        if (payload.callerId === userId) {
          console.log('⏰ Call not answered (timeout):', payload);
          clearCallTimeout();
          setActiveCall(null);
          setIncomingCall(null);
        }
      })
      .on('broadcast', { event: 'call-ended' }, ({ payload }) => {
        if (payload.callerId === userId || payload.recipientId === userId) {
          console.log('📴 Call ended:', payload);
          clearCallTimeout();
          setActiveCall(null);
          setIncomingCall(null);
        }
      })
      .subscribe((status) => {
        console.log('📡 Channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to calls channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel subscription error');
        }
      });

    return () => {
      console.log('🔌 Cleaning up channel subscription');
      clearCallTimeout();
      channel.unsubscribe();
    };
  }, [userId, clearCallTimeout, setCallTimeout]);

  const startCall = useCallback(async (recipientId: string, isVideoCall: boolean) => {
    try {
      console.log('📞 Starting call to:', recipientId, 'Video:', isVideoCall);
      
      const callId = `call_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Fetch both user profiles
      const [callerProfile, recipientProfile] = await Promise.all([
        fetchUserProfile(userId),
        fetchUserProfile(recipientId),
      ]);

      console.log('👤 Caller profile:', callerProfile);
      console.log('👤 Recipient profile:', recipientProfile);

      const callerName = callerProfile.display_name || callerProfile.full_name || 'Unknown User';
      const recipientName = recipientProfile.display_name || recipientProfile.full_name || 'Unknown User';
      
      const callData: CallData = {
        callId,
        callerId: userId,
        recipientId,
        isVideoCall,
        state: 'calling',
        callerName,
        callerAvatar: callerProfile.avatar_url || undefined,
        recipientName,
        recipientAvatar: recipientProfile.avatar_url || undefined,
      };

      console.log('📞 Call data prepared:', callData);
      setActiveCall(callData);
      console.log('📞 Active call state set');

      // Broadcast call to recipient
      console.log('📡 Broadcasting call to recipient channel:', `user:${recipientId}:calls`);
      const channel = supabase.channel(`user:${recipientId}:calls`);
      await channel.subscribe();
      
      const broadcastResult = await channel.send({
        type: 'broadcast',
        event: 'incoming-call',
        payload: callData,
      });
      
      console.log('✅ Call broadcast result:', broadcastResult);
      console.log('✅ Call initiated successfully');

      return callId;
    } catch (error) {
      console.error('❌ Error starting call:', error);
      throw error;
    }
  }, [userId, fetchUserProfile]);

  const acceptCall = useCallback(async (callData: CallData) => {
    console.log('✅ Accepting call:', callData);
    clearCallTimeout(); // Clear timeout when accepting
    
    const channel = supabase.channel(`user:${callData.callerId}:calls`);
    await channel.subscribe();

    await channel.send({
      type: 'broadcast',
      event: 'call-accepted',
      payload: { ...callData, state: 'active' },
    });

    setActiveCall({ ...callData, state: 'active' });
    setIncomingCall(null);
  }, [clearCallTimeout]);

  const rejectCall = useCallback(async (callData: CallData) => {
    console.log('❌ Rejecting call:', callData);
    clearCallTimeout(); // Clear timeout when rejecting
    
    const channel = supabase.channel(`user:${callData.callerId}:calls`);
    await channel.subscribe();

    await channel.send({
      type: 'broadcast',
      event: 'call-rejected',
      payload: callData,
    });

    setIncomingCall(null);
  }, [clearCallTimeout]);

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
