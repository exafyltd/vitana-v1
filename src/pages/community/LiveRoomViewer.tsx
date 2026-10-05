import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import SEO from '@/components/SEO';
import AppLayout from '@/components/AppLayout';
import SubNavigation from '@/components/SubNavigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogDescription,
  ResponsiveConfirmDialogFooter,
  ResponsiveConfirmDialogHeader,
  ResponsiveConfirmDialogTitle,
} from '@/components/ui/responsive-confirm-dialog';
import { ArrowLeft, Users } from 'lucide-react';
import { communityNavigation } from '@/config/navigation';
import { DailyVideoRoom } from '@/components/liverooms/DailyVideoRoom';

import { useStreamRecording } from '@/hooks/useStreamRecording';
import { StreamRecordingPlayer } from '@/components/StreamRecordingPlayer';
import {
  liveRoomService,
  LiveRoomEnterError,
  type EnterRoomErrorCode,
  type EnterRoomResponse,
} from '@/services/liveRoomService';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useRoomState, useEndRoom } from '@/hooks/useMyRoom';
import { useHostPresence } from '@/hooks/useHostPresence';
import { useIsMobile } from '@/hooks/use-mobile';
import { notifyError, t } from '@/lib/i18n-toast';

/**
 * Live Room viewer (VTID-04906).
 *
 * Entry goes through the gateway's `enter` call only: it checks access,
 * records attendance and returns the private Daily room URL plus a meeting
 * token (owner token for the host). The page owns the exit — an app-level
 * header with a ≥44px exit button sits above the Daily iframe in every state
 * (entering, error, in room), and leaving records the exit (`exit`) on leave,
 * unmount and `pagehide`. Leaving never ends the room; only the host's
 * explicit "End for everyone" (with confirmation) does.
 */
export default function LiveRoomViewer() {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Get state passed from navigation
  const { userId, userName, room, isHost } = location.state || {};

  // Use auth context as fallback if navigation state is missing
  const effectiveUserId = userId || user?.id;
  const effectiveUserName = userName || user?.email?.split('@')[0] || t('screens.liveRoom.guest');

  // DB-based isHost detection (survives page refresh)
  const { data: dbRoom, isLoading: isLoadingHost } = useQuery({
    queryKey: ['live-room-host', roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_rooms')
        .select('host_user_id, metadata')
        .eq('id', roomId!)
        .maybeSingle();
      if (error) {
        // A query failure previously left `dbRoom` undefined, indistinguishable
        // from "no such room" — a legitimate host reloading this page would
        // silently lose moderator controls (End Stream, Settings) with no
        // trace of why.
        console.error('[LiveRoomViewer] host detection query failed:', error);
      }
      return data;
    },
    enabled: !!roomId && !!user?.id,
    staleTime: 60_000,
  });
  const effectiveIsHost = isHost || (!!user?.id && dbRoom?.host_user_id === user.id);
  const isHostResolving = !user || isLoadingHost;

  // Entry: the gateway's answer to `enter` (url + token), or why it refused.
  const [entry, setEntry] = useState<EnterRoomResponse | null>(null);
  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState<EnterRoomErrorCode | null>(null);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const exitSentRef = useRef(false);

  // "Room mode" = the member asked to enter: full-height layout with the
  // app-level header (exit button) on top of whatever state the room is in.
  const roomMode = !!entry || entering || !!enterError;
  // After `enter`, the gateway's verdict on who is host wins.
  const isRoomHost = entry ? entry.is_host : effectiveIsHost;

  // Room state polling (every 5s while live)
  const { data: roomState } = useRoomState(roomId, true);
  const roomStatus = roomState?.room?.status || room?.status;
  const sessionData = roomState?.session;
  const inRoomCount = roomState?.counts?.in_room ?? entry?.counts?.in_room;

  // Host presence signals
  useHostPresence(roomId, effectiveIsHost);

  // End room mutation (gateway). Its own onError surfaces the failure.
  const { mutate: endRoomMutation, isPending: isEnding } = useEndRoom();

  // Fetch recording if stream has ended
  const { data: recordingData } = useQuery({
    queryKey: ['stream-recording', roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stream_recordings')
        .select('*')
        .eq('stream_id', roomId)
        .eq('status', 'ready')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: roomStatus === 'ended' || roomStatus === 'idle'
  });

  // Recording hook
  const { isRecording, stopRecording } = useStreamRecording({
    streamId: roomId || '',
    localStream: null,
    isHost: isRoomHost,
    enabled: sessionData?.enable_recording ?? false,
  });

  const handleEnter = useCallback(async () => {
    if (!roomId) return;
    setEntering(true);
    setEnterError(null);
    try {
      const res = await liveRoomService.enterRoom(roomId);
      exitSentRef.current = false;
      setEntry(res);
    } catch (err) {
      console.error('[LiveRoomViewer] enter failed:', err);
      setEnterError(err instanceof LiveRoomEnterError ? err.code : 'UNKNOWN');
    } finally {
      setEntering(false);
    }
  }, [roomId]);

  // Record the exit once per entry (leave button, Daily's own leave, unmount,
  // pagehide, room ended).
  const sendExit = useCallback((keepalive = false) => {
    if (!roomId || exitSentRef.current) return;
    exitSentRef.current = true;
    liveRoomService.exitRoom(roomId, { keepalive }).catch((err) =>
      console.warn('[LiveRoomViewer] exit failed:', err),
    );
  }, [roomId]);

  useEffect(() => {
    if (!entry) return;
    const onPageHide = () => sendExit(true);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      sendExit(true);
    };
  }, [entry, sendExit]);

  // Redirect if no proper state
  useEffect(() => {
    if (!effectiveUserId) {
      notifyError('toasts.community.invalidAccess', 'toasts.community.pleaseSignJoinLiveRooms');
      navigate('/comm/live-rooms');
    }
  }, [effectiveUserId, navigate]);

  const isLive = roomStatus === 'live' || roomStatus === 'lobby';
  const hasEnded = roomStatus === 'ended' || roomStatus === 'idle';

  // The room ended while this member was inside it → record the exit.
  useEffect(() => {
    if (hasEnded && entry) sendExit();
  }, [hasEnded, entry, sendExit]);

  /** Leave the room. Never ends it — not even for the host. */
  const handleLeave = () => {
    if (entry) sendExit();
    navigate('/comm/live-rooms');
  };

  /** Host only, after confirmation: end the session for everyone. */
  const handleEndForEveryone = async () => {
    setEndConfirmOpen(false);
    if (!roomId) return;
    if (isRecording) {
      await stopRecording();
    }
    endRoomMutation(roomId, {
      onSuccess: () => {
        sendExit();
        navigate('/comm/live-rooms');
      },
    });
  };

  const streamTitle = sessionData?.session_title || room?.title || t('screens.liveRoom.defaultTitle');
  const streamDescription = sessionData?.session_description || room?.description;

  if (!roomId) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-xl mb-4">{t('screens.community.roomNotFound')}</p>
            <Button onClick={() => navigate('/comm/live-rooms')}>
              {t('screens.community.backLiveRooms')}
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show ended state
  if (hasEnded) {
    return (
      <>
        <SEO title={t('screens.community.roomEnded')} />
        <AppLayout>
          {!isMobile && <SubNavigation items={communityNavigation} />}
          <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
            <Card className="p-8 text-center max-w-md">
              <h2 className="text-2xl font-bold mb-4">{t('screens.community.thisRoomHasEnded')}</h2>
              <p className="text-muted-foreground mb-6">{t('screens.community.sessionStreamtitleHasConcluded', { streamTitle })}
              </p>
              {recordingData && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">{t('screens.community.streamReplay')}</h3>
                  <StreamRecordingPlayer recording={recordingData} />
                </div>
              )}
              <Button onClick={() => navigate('/comm/live-rooms')} className="min-h-11">
                <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
                {t('screens.community.backRooms')}
              </Button>
            </Card>
          </div>
        </AppLayout>
      </>
    );
  }

  const errorCopy = (code: EnterRoomErrorCode) => {
    switch (code) {
      case 'NOT_LIVE':
        return { title: t('screens.liveRoom.notLiveTitle'), desc: t('screens.liveRoom.notLiveDesc') };
      case 'PAYMENT_REQUIRED':
        return { title: t('screens.liveRoom.paymentRequiredTitle'), desc: t('screens.liveRoom.paymentRequiredDesc') };
      case 'UNAUTHENTICATED':
        return { title: t('screens.liveRoom.signInTitle'), desc: t('screens.liveRoom.signInDesc') };
      case 'NOT_FOUND':
        return { title: t('screens.community.roomNotFound'), desc: t('screens.liveRoom.notFoundDesc') };
      default:
        return { title: t('screens.community.videoRoomUnavailable'), desc: t('screens.community.videoRoomUnavailableHint') };
    }
  };

  return (
    <>
      <SEO
        title={t('screens.liveRoom.seoTitle', { title: streamTitle })}
        description={streamDescription || t('screens.liveRoom.seoDescription', { name: effectiveUserName })}
      />
      <AppLayout>
        {!isMobile && !roomMode && <SubNavigation items={communityNavigation} />}

        <div
          data-testid="live-room-viewer"
          className={cn(
            "flex flex-col",
            roomMode
              ? cn(
                  isMobile ? "h-[100dvh]" : "h-[calc(100vh-3rem)]",
                  "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
                )
              : "h-[calc(100vh-8rem)]"
          )}
        >
          {/* App-level header — always present, so there is always a way out
              (also while connecting, on errors, or over a black iframe). */}
          <header
            data-testid="live-room-header"
            className="flex items-center gap-2 px-2 py-1 min-h-[56px] border-b shrink-0 bg-background"
          >
            <Button
              variant="ghost"
              onClick={handleLeave}
              className="h-11 min-w-11 px-3 gap-2 shrink-0"
              data-testid="live-room-exit"
              aria-label={roomMode ? t('screens.liveRoom.leaveRoom') : t('screens.liveRoom.backToRooms')}
            >
              <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
              <span className="text-sm font-medium">
                {roomMode ? t('screens.liveRoom.leave') : t('screens.liveRoom.back')}
              </span>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold truncate text-start">{streamTitle}</h1>
              <div className="flex items-center gap-2">
                {isLive && (
                  <Badge variant="destructive" className="animate-pulse">{t('screens.community.live')}</Badge>
                )}
                {typeof inRoomCount === 'number' && (
                  <span
                    data-testid="live-room-viewer-count"
                    className="flex items-center gap-1 text-xs text-muted-foreground"
                  >
                    <Users className="h-3.5 w-3.5" />
                    {t('screens.liveRoom.inRoomCount', { count: inRoomCount })}
                  </span>
                )}
              </div>
            </div>
            {isRoomHost && entry && (
              <Button
                variant="destructive"
                size="sm"
                className="h-11 shrink-0"
                onClick={() => setEndConfirmOpen(true)}
                disabled={isEnding}
                data-testid="live-room-end"
              >
                {t('screens.liveRoom.endForEveryone')}
              </Button>
            )}
          </header>

          {/* Main Content */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {!roomMode ? (
              /* Entry Screen */
              <div className="flex-1 flex items-center justify-center bg-muted/50 p-4">
                {isHostResolving ? (
                  <Card className="p-8 text-center max-w-md">
                    <div className="animate-pulse text-muted-foreground">{t('screens.community.loading')}</div>
                  </Card>
                ) : (
                  <Card className="p-8 text-center max-w-md w-full">
                    <h2 className="text-2xl font-bold mb-4">
                      {effectiveIsHost ? t('screens.liveRoom.readyToStart') : t('screens.liveRoom.readyToJoin')}
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      {effectiveIsHost ? t('screens.liveRoom.startHint') : t('screens.liveRoom.joinHint')}
                    </p>
                    <Button size="lg" onClick={handleEnter} className="w-full min-h-11" data-testid="live-room-enter">
                      {effectiveIsHost ? t('screens.liveRoom.startStream') : t('screens.liveRoom.joinStream')}
                    </Button>
                  </Card>
                )}
              </div>
            ) : entry ? (
              <div className="flex-1 min-h-0 flex flex-col bg-black relative">
                <DailyVideoRoom
                  roomUrl={entry.daily_room_url}
                  token={entry.token}
                  onJoined={() => {
                    if (isRoomHost && roomId) {
                      liveRoomService.hostPresent(roomId).catch(console.warn);
                    }
                  }}
                  onLeft={() => {
                    // Daily's own Leave button: leave the room, never end it.
                    if (isRoomHost && roomId) {
                      liveRoomService.hostAbsent(roomId).catch(console.warn);
                    }
                    handleLeave();
                  }}
                  onError={(err) => {
                    console.error('[Daily] Error:', err);
                    notifyError('toasts.community.videoError');
                  }}
                />
                {isRecording && (
                  <div className="absolute top-4 end-4 flex items-center gap-2 bg-destructive text-destructive-foreground px-3 py-1 rounded-full animate-pulse z-10">
                    <div className="w-3 h-3 bg-destructive-foreground rounded-full" />
                    {t('screens.community.recording')}
                  </div>
                )}
              </div>
            ) : enterError ? (
              <div className="flex-1 flex items-center justify-center p-6" data-testid="live-room-error">
                <div className="text-center max-w-sm">
                  <h3 className="text-lg font-semibold mb-1">{errorCopy(enterError).title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{errorCopy(enterError).desc}</p>
                  {enterError !== 'UNAUTHENTICATED' && enterError !== 'NOT_FOUND' && (
                    <Button onClick={handleEnter} className="min-h-11">
                      {t('screens.community.retry')}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center" data-testid="live-room-entering">
                <div className="text-center text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                  <p>{t('screens.community.settingUpVideoRoom')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </AppLayout>

      <ResponsiveConfirmDialog open={endConfirmOpen} onOpenChange={setEndConfirmOpen}>
        <ResponsiveConfirmDialogContent>
          <ResponsiveConfirmDialogHeader>
            <ResponsiveConfirmDialogTitle>{t('screens.liveRoom.endConfirmTitle')}</ResponsiveConfirmDialogTitle>
            <ResponsiveConfirmDialogDescription>
              {t('screens.liveRoom.endConfirmDesc')}
            </ResponsiveConfirmDialogDescription>
          </ResponsiveConfirmDialogHeader>
          <ResponsiveConfirmDialogFooter>
            <ResponsiveConfirmDialogCancel>{t('screens.community.cancel')}</ResponsiveConfirmDialogCancel>
            <ResponsiveConfirmDialogAction
              onClick={handleEndForEveryone}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="live-room-end-confirm"
            >
              {t('screens.liveRoom.endForEveryone')}
            </ResponsiveConfirmDialogAction>
          </ResponsiveConfirmDialogFooter>
        </ResponsiveConfirmDialogContent>
      </ResponsiveConfirmDialog>
    </>
  );
}
