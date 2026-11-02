/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the
 * embedded 1:1 call: native twins of web `src/context/CallContext.tsx`
 * (CallProvider / useCall), `src/components/CallManager.tsx` (which overlay
 * shows for which state), `IncomingCallModal.tsx`, `CallingScreen.tsx` and
 * `MessengerCall.tsx`. The web mounts CallProvider + CallManager inside the
 * inbox / DM page (`src/pages/Messages.tsx:1274,1425-1429`), not in the group
 * chat page, so the native DM screen mounts them the same way.
 *
 * The tones are the web `callSounds` (src/utils/callSounds.ts, see
 * ./callSounds.ts); media comes from the react-native-webrtc engine
 * (src/ports/webrtc.ts).
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Button, notify, notifyError, Text, useUITheme } from '../../../ports/ui';
import { ChatIcon, Dialog, DialogContent } from '../../../ports/chat';
import { getWebRTCEngine } from '../../../ports/webrtc';
import { callSounds } from './callSounds';
import { getSupabase } from '../../../auth/client';
import { useI18n } from '../../../i18n/I18nProvider';
import { useCallState, type CallData } from './useCallState';
import { useWebRTC } from './useWebRTC';

type CallValue = ReturnType<typeof useCallState>;

const CallContext = createContext<CallValue | null>(null);

export function CallProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const value = useCallState(userId);
  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall(): CallValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within a CallProvider');
  return ctx;
}

const initial = (name: string) => (name.trim()[0] ?? '?').toUpperCase();

export function IncomingCallModal({
  callerName,
  callerAvatar,
  isVideoCall,
  onAccept,
  onReject,
}: {
  callerName: string;
  callerAvatar?: string;
  isVideoCall: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <Dialog open>
      <DialogContent testID="incoming-call-modal">
        <View style={styles.dialogBody}>
          <Avatar uri={callerAvatar} fallback={initial(callerName)} size={96} />
          <View style={styles.center}>
            <Text style={styles.callerName}>{callerName}</Text>
            <Text muted>{t(isVideoCall ? 'callsNative.incomingVideo' : 'callsNative.incomingAudio')}</Text>
          </View>
          <View style={styles.controls}>
            <Button variant="destructive" size="lg" onPress={onReject} accessibilityLabel={t('callsNative.reject')} testID="incoming-call-reject" style={styles.round}>
              <ChatIcon name="PhoneOff" size={24} color={colors.destructiveForeground} />
            </Button>
            <Button size="lg" onPress={onAccept} accessibilityLabel={t('callsNative.accept')} testID="incoming-call-accept" style={[styles.round, { backgroundColor: colors.statusSuccess }]}>
              <ChatIcon name={isVideoCall ? 'Video' : 'Phone'} size={24} color={colors.primaryForeground} />
            </Button>
          </View>
        </View>
      </DialogContent>
    </Dialog>
  );
}

export function CallingScreen({ recipientName, recipientAvatar, isVideoCall, onEndCall }: { recipientName: string; recipientAvatar?: string; isVideoCall: boolean; onEndCall: () => void }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [dots, setDots] = useState('');
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? '' : `${d}.`)), 500);
    return () => clearInterval(id);
  }, []);
  return (
    <View style={[styles.fullscreen, { backgroundColor: colors.background }]} testID="calling-screen">
      <Avatar uri={recipientAvatar} fallback={initial(recipientName)} size={128} />
      <View style={styles.center}>
        <Text style={styles.bigName}>{recipientName}</Text>
        <Text muted testID="calling-status">
          {t(isVideoCall ? 'callsNative.videoCalling' : 'callsNative.calling')}
          {dots}
        </Text>
      </View>
      <Button variant="destructive" size="lg" onPress={onEndCall} accessibilityLabel={t('callsNative.endCall')} testID="calling-end" style={styles.round}>
        <ChatIcon name="PhoneOff" size={24} color={colors.destructiveForeground} />
      </Button>
    </View>
  );
}

type ConnectionStatus = 'initializing' | 'connecting' | 'connected' | 'failed';

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function MessengerCall({
  callId,
  userId,
  recipientId,
  recipientName,
  recipientAvatar,
  isVideoCall,
  onEndCall,
}: {
  callId: string;
  userId: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  isVideoCall: boolean;
  onEndCall: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<ConnectionStatus>('initializing');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rtc = useWebRTC({ roomId: callId, userId, isVideoEnabled: isVideoCall, isAudioEnabled: true });
  const { joinRoom, leaveRoom, peers } = rtc;
  const peersRef = useRef(peers);
  peersRef.current = peers;
  const onEndRef = useRef(onEndCall);
  onEndRef.current = onEndCall;

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        setStatus('initializing');
        await joinRoom();
        if (!alive) return;
        setStatus('connecting');
        const channel = getSupabase().channel(`user:${recipientId}:calls`);
        channel.subscribe();
        await channel.send({ type: 'broadcast', event: 'webrtc-ready', payload: { call_id: callId, from_user_id: userId } });
        timeoutRef.current = setTimeout(() => {
          if (peersRef.current.length === 0) {
            setStatus('failed');
            notifyError('toasts.common.connectionFailed', 'toasts.common.couldNotEstablishConnectionPleaseTry');
            setTimeout(() => onEndRef.current(), 2000);
          }
        }, 15000);
      } catch {
        if (!alive) return;
        setStatus('failed');
        notifyError('toasts.common.connectionError');
        setTimeout(() => onEndRef.current(), 2000);
      }
    };
    void run();
    return () => {
      alive = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      leaveRoom();
    };
  }, [callId, userId, recipientId, joinRoom, leaveRoom]);

  useEffect(() => {
    if (peers[0]?.stream) {
      setStatus('connected');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, [peers]);

  useEffect(() => {
    if (status !== 'connected') return undefined;
    const id = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  const statusText =
    status === 'connected'
      ? formatDuration(duration)
      : status === 'initializing'
        ? t('callsNative.initializing')
        : status === 'failed'
          ? t('callsNative.connectionFailed')
          : t('callsNative.connecting');

  const StreamView = getWebRTCEngine()?.StreamView;
  const remote = peers[0]?.stream;
  const showVideo = isVideoCall && !!remote && !!StreamView;

  return (
    <View style={[styles.callRoot, { backgroundColor: colors.background }]} testID="messenger-call">
      <View style={[styles.stage, { backgroundColor: colors.muted }]}>
        {showVideo && StreamView && remote ? (
          <StreamView stream={remote} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={styles.center}>
            <Avatar uri={recipientAvatar} fallback={initial(recipientName)} size={128} />
            <Text style={styles.callerName}>{recipientName}</Text>
            <Text muted testID="call-status">
              {statusText}
            </Text>
          </View>
        )}
        {isVideoCall && rtc.localStream && StreamView ? (
          <View style={[styles.pip, { borderColor: colors.border }]}>
            <StreamView stream={rtc.localStream} style={StyleSheet.absoluteFill} muted />
          </View>
        ) : null}
      </View>
      <View style={[styles.bar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={styles.controls}>
          <Button
            variant={rtc.isAudioEnabled ? 'default' : 'destructive'}
            size="lg"
            onPress={rtc.toggleAudio}
            accessibilityLabel={t(rtc.isAudioEnabled ? 'callsNative.mute' : 'callsNative.unmute')}
            testID="call-toggle-audio"
            style={styles.round}
          >
            <ChatIcon name={rtc.isAudioEnabled ? 'Mic' : 'MicOff'} size={24} color={rtc.isAudioEnabled ? colors.primaryForeground : colors.destructiveForeground} />
          </Button>
          {isVideoCall ? (
            <Button
              variant={rtc.isVideoEnabled ? 'default' : 'destructive'}
              size="lg"
              onPress={rtc.toggleVideo}
              accessibilityLabel={t(rtc.isVideoEnabled ? 'callsNative.cameraOff' : 'callsNative.cameraOn')}
              testID="call-toggle-video"
              style={styles.round}
            >
              <ChatIcon name={rtc.isVideoEnabled ? 'Video' : 'VideoOff'} size={24} color={rtc.isVideoEnabled ? colors.primaryForeground : colors.destructiveForeground} />
            </Button>
          ) : null}
          <Button
            variant="destructive"
            size="lg"
            onPress={() => {
              leaveRoom();
              onEndCall();
            }}
            accessibilityLabel={t('callsNative.endCall')}
            testID="call-end"
            style={styles.round}
          >
            <ChatIcon name="PhoneOff" size={24} color={colors.destructiveForeground} />
          </Button>
        </View>
        {status === 'connected' ? (
          <Text muted style={styles.durationBelow}>
            {formatDuration(duration)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** CallManager.tsx: the incoming modal, the outgoing "Calling…" screen or the active call. */
export function CallManager({ userId }: { userId: string }) {
  const { t } = useI18n();
  const { activeCall, incomingCall, acceptCall, rejectCall, endCall } = useCall();
  const unknown = t('callsNative.unknownUser');

  // Tones (CallManager.tsx:22-56): the incoming ringtone while a call rings,
  // the outgoing ringtone while calling, a beep on connect and on end.
  useEffect(() => {
    if (incomingCall) {
      callSounds.playIncomingRingtone();
      notify('toasts.common.incomingCall');
    } else {
      callSounds.stopAll();
    }
    return () => callSounds.stopAll();
  }, [incomingCall]);

  const state = activeCall?.state;
  useEffect(() => {
    if (state === 'calling') callSounds.playOutgoingRingtone();
    else if (state === 'active') callSounds.playConnectedBeep();
    return () => {
      if (state === 'ended') callSounds.playEndedBeep();
    };
  }, [state]);

  const endWithBeep = () => {
    callSounds.playEndedBeep();
    void endCall();
  };

  const other = (call: CallData) =>
    call.callerId === userId
      ? { id: call.recipientId, name: call.recipientName || unknown, avatar: call.recipientAvatar }
      : { id: call.callerId, name: call.callerName || unknown, avatar: call.callerAvatar };

  return (
    <>
      {incomingCall ? (
        <IncomingCallModal
          callerName={incomingCall.callerName || unknown}
          callerAvatar={incomingCall.callerAvatar}
          isVideoCall={incomingCall.isVideoCall}
          onAccept={() => {
            callSounds.stopAll();
            void acceptCall(incomingCall);
          }}
          onReject={() => {
            callSounds.stopAll();
            void rejectCall(incomingCall);
          }}
        />
      ) : null}
      {activeCall?.state === 'calling' ? (
        <CallingScreen recipientName={activeCall.recipientName || unknown} recipientAvatar={activeCall.recipientAvatar} isVideoCall={activeCall.isVideoCall} onEndCall={endWithBeep} />
      ) : null}
      {activeCall?.state === 'active' ? (
        <MessengerCall
          callId={activeCall.callId}
          userId={userId}
          recipientId={other(activeCall).id}
          recipientName={other(activeCall).name}
          isVideoCall={activeCall.isVideoCall}
          onEndCall={endWithBeep}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  dialogBody: { alignItems: 'center', gap: 24, paddingVertical: 32 },
  center: { alignItems: 'center', gap: 8 },
  callerName: { fontSize: 24, fontWeight: '600', textAlign: 'center' },
  bigName: { fontSize: 30, fontWeight: '600', textAlign: 'center' },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  round: { width: 64, height: 64, borderRadius: 32 },
  fullscreen: { position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, zIndex: 50, alignItems: 'center', justifyContent: 'center', gap: 32, padding: 32 },
  callRoot: { position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, zIndex: 50 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pip: { position: 'absolute', top: 16, end: 16, width: 128, height: 96, borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  bar: { padding: 32, borderTopWidth: StyleSheet.hairlineWidth },
  durationBelow: { textAlign: 'center', marginTop: 16 },
});
