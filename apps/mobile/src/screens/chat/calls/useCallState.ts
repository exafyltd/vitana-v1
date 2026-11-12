/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the 1:1
 * call state machine. Native twin of web `src/hooks/useCallState.ts` (class B:
 * Supabase client + realtime router), over the native Supabase client's
 * realtime channels with the same channel names, events and payloads:
 *
 *   my channel `user:<me>:calls` (presence key = me, no self broadcast):
 *     incoming-call (for me) → incomingCall + 30 s no-answer timer
 *     call-accepted          → activeCall 'active', incoming cleared
 *     call-rejected / call-no-answer (I called) → cleared
 *     call-ended             → cleared
 *   startCall  → activeCall 'calling', broadcast incoming-call on the
 *                recipient's channel (3 attempts, 1 s / 2 s back-off)
 *   acceptCall → call-accepted on the caller's channel, activeCall 'active'
 *   rejectCall → call-rejected on the caller's channel
 *   endCall    → call-ended on the other side's channel
 *   no answer in 30 s → call-no-answer on the caller's channel
 *
 * The live call across two sessions is a G1 owner step; unit tests drive this
 * with a fake realtime client.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase } from '../../../auth/client';

export type CallState = 'idle' | 'calling' | 'ringing' | 'active' | 'ended' | 'no-answer';

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

export const CALL_TIMEOUT_MS = 30000;

type Channel = ReturnType<ReturnType<typeof getSupabase>['channel']>;
type Broadcast = { payload: CallData };

interface UserProfile {
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

const EMPTY_PROFILE: UserProfile = { display_name: null, full_name: null, avatar_url: null };

async function fetchUserProfile(targetUserId: string): Promise<UserProfile> {
  try {
    const { data, error } = await getSupabase().from('profiles').select('display_name, full_name, avatar_url').eq('user_id', targetUserId).single();
    if (error) throw error;
    return (data as UserProfile | null) ?? EMPTY_PROFILE;
  } catch {
    return EMPTY_PROFILE;
  }
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function sendOn(name: string, event: string, payload: unknown): Promise<unknown> {
  const channel = getSupabase().channel(name);
  channel.subscribe();
  return channel.send({ type: 'broadcast', event, payload });
}

export function useCallState(userId: string) {
  const [activeCall, setActiveCall] = useState<CallData | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCallTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const setCallTimeout = useCallback(
    (callData: CallData) => {
      clearCallTimeout();
      timeoutRef.current = setTimeout(() => {
        void sendOn(`user:${callData.callerId}:calls`, 'call-no-answer', { ...callData, state: 'no-answer' });
        setIncomingCall(null);
        setActiveCall(null);
      }, CALL_TIMEOUT_MS);
    },
    [clearCallTimeout],
  );

  useEffect(() => {
    if (!userId) return undefined;
    const supabase = getSupabase();
    const channel: Channel = supabase.channel(`user:${userId}:calls`, { config: { presence: { key: userId }, broadcast: { self: false } } });
    channel
      .on('broadcast', { event: 'incoming-call' }, ({ payload }: Broadcast) => {
        if (payload.recipientId === userId) {
          setIncomingCall(payload);
          setCallTimeout(payload);
        }
      })
      .on('broadcast', { event: 'call-accepted' }, ({ payload }: Broadcast) => {
        if (payload.callerId === userId || payload.recipientId === userId) {
          clearCallTimeout();
          setActiveCall({ ...payload, state: 'active' });
          setIncomingCall(null);
        }
      })
      .on('broadcast', { event: 'call-rejected' }, ({ payload }: Broadcast) => {
        if (payload.callerId === userId) {
          clearCallTimeout();
          setActiveCall(null);
          setIncomingCall(null);
        }
      })
      .on('broadcast', { event: 'call-no-answer' }, ({ payload }: Broadcast) => {
        if (payload.callerId === userId) {
          clearCallTimeout();
          setActiveCall(null);
          setIncomingCall(null);
        }
      })
      .on('broadcast', { event: 'call-ended' }, ({ payload }: Broadcast) => {
        if (payload.callerId === userId || payload.recipientId === userId) {
          clearCallTimeout();
          setActiveCall(null);
          setIncomingCall(null);
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') void channel.track({ user_id: userId, online: true, timestamp: Date.now() });
      });
    return () => {
      clearCallTimeout();
      void channel.unsubscribe();
    };
  }, [userId, clearCallTimeout, setCallTimeout]);

  const startCall = useCallback(
    async (recipientId: string, isVideoCall: boolean): Promise<string> => {
      try {
        const callId = `call_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const [callerProfile, recipientProfile] = await Promise.all([fetchUserProfile(userId), fetchUserProfile(recipientId)]);
        const callData: CallData = {
          callId,
          callerId: userId,
          recipientId,
          isVideoCall,
          state: 'calling',
          callerName: callerProfile.display_name || callerProfile.full_name || 'Unknown User',
          callerAvatar: callerProfile.avatar_url || undefined,
          recipientName: recipientProfile.display_name || recipientProfile.full_name || 'Unknown User',
          recipientAvatar: recipientProfile.avatar_url || undefined,
        };
        setActiveCall(callData);
        const channel: Channel = getSupabase().channel(`user:${recipientId}:calls`, { config: { presence: { key: userId }, broadcast: { self: false } } });
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Subscription timeout')), 5000);
          channel.subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              clearTimeout(timer);
              resolve();
            } else if (status === 'CHANNEL_ERROR') {
              clearTimeout(timer);
              reject(new Error('Channel subscription failed'));
            }
          });
        });
        await wait(500);
        let ok = false;
        for (let attempt = 1; attempt <= 3; attempt += 1) {
          const result = await channel.send({ type: 'broadcast', event: 'incoming-call', payload: callData });
          if (result === 'ok') {
            ok = true;
            break;
          }
          if (attempt < 3) await wait(1000 * attempt);
        }
        if (!ok) throw new Error('Failed to broadcast call after 3 attempts');
        return callId;
      } catch (error) {
        setActiveCall(null);
        throw error;
      }
    },
    [userId],
  );

  const acceptCall = useCallback(
    async (callData: CallData) => {
      clearCallTimeout();
      await sendOn(`user:${callData.callerId}:calls`, 'call-accepted', { ...callData, state: 'active' });
      setActiveCall({ ...callData, state: 'active' });
      setIncomingCall(null);
    },
    [clearCallTimeout],
  );

  const rejectCall = useCallback(
    async (callData: CallData) => {
      clearCallTimeout();
      await sendOn(`user:${callData.callerId}:calls`, 'call-rejected', callData);
      setIncomingCall(null);
    },
    [clearCallTimeout],
  );

  const endCall = useCallback(async () => {
    if (!activeCall) return;
    const other = activeCall.callerId === userId ? activeCall.recipientId : activeCall.callerId;
    await sendOn(`user:${other}:calls`, 'call-ended', activeCall);
    setActiveCall(null);
  }, [activeCall, userId]);

  return { activeCall, incomingCall, startCall, acceptCall, rejectCall, endCall };
}
