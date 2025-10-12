import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export type CallState = 'idle' | 'calling' | 'ringing' | 'active' | 'ended' | 'no-answer';

interface UserProfile {
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface CallData {
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
    const channel = supabase.channel(`user:${userId}:calls`, {
      config: { 
        presence: { key: userId },
        broadcast: { self: false }
      }
    });
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
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('👥 Presence sync:', Object.keys(state).length, 'users online');
      })
      .subscribe(async (status) => {
        console.log('📡 Channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to calls channel');
          // Track presence to make this user visible to others
          await channel.track({
            user_id: userId,
            online: true,
            timestamp: Date.now()
          });
          console.log('👤 Presence tracked for user:', userId);
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

      // Broadcast call to recipient with retry logic
      console.log('📡 Broadcasting call to recipient channel:', `user:${recipientId}:calls`);
      const channel = supabase.channel(`user:${recipientId}:calls`, {
        config: { 
          presence: { key: userId },
          broadcast: { self: false }
        }
      });
      
      // Wait for subscription to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Subscription timeout')), 5000);
        channel.subscribe((status) => {
          console.log('📡 Broadcast channel subscription status:', status);
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            resolve();
          } else if (status === 'CHANNEL_ERROR') {
            clearTimeout(timeout);
            reject(new Error('Channel subscription failed'));
          }
        });
      });
      
      console.log('✅ Channel subscribed, checking recipient presence...');
      
      // Check if recipient is online via presence
      const presenceState = channel.presenceState();
      const recipientPresent = Object.keys(presenceState).includes(recipientId);
      console.log('👥 Recipient presence check:', { recipientId, present: recipientPresent, onlineUsers: Object.keys(presenceState) });
      
      if (!recipientPresent) {
        console.warn('⚠️ Recipient not found in presence state, call may not be received');
      }
      
      // Wait 500ms after subscription before broadcasting to ensure channel is fully ready
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('✅ Channel ready, starting broadcast attempts...');
      
      // Retry broadcast up to 3 times with longer delays (1s, 2s, 3s)
      let broadcastSuccess = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`📡 Broadcast attempt ${attempt}/3...`);
        const broadcastResult = await channel.send({
          type: 'broadcast',
          event: 'incoming-call',
          payload: callData,
        });
        
        console.log(`📡 Broadcast attempt ${attempt} result:`, broadcastResult);
        
        if (broadcastResult === 'ok') {
          broadcastSuccess = true;
          console.log('✅ Call broadcast successful');
          break;
        }
        
        if (attempt < 3) {
          const delay = 1000 * attempt; // 1s, 2s, 3s
          console.warn(`⚠️ Broadcast attempt ${attempt} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      if (!broadcastSuccess) {
        throw new Error('Failed to broadcast call after 3 attempts');
      }
      
      console.log('✅ Call initiated successfully');
      return callId;
    } catch (error) {
      console.error('❌ Error starting call:', error);
      setActiveCall(null); // Clear active call on error
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
