import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import SEO from '@/components/SEO';
import AppLayout from '@/components/AppLayout';
import SubNavigation from '@/components/SubNavigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Users, 
  Settings,
  Share2,
} from 'lucide-react';
import { communityNavigation } from '@/config/navigation';
import { DailyVideoRoom } from '@/components/liverooms/DailyVideoRoom';

import { useStreamRecording } from '@/hooks/useStreamRecording';
import { StreamRecordingPlayer } from '@/components/StreamRecordingPlayer';
import { liveRoomService } from '@/services/liveRoomService';
import { useAuth } from '@/context/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useRoomState, useEndRoom } from '@/hooks/useMyRoom';
import { useHostPresence } from '@/hooks/useHostPresence';
import { useIsMobile } from '@/hooks/use-mobile';
import { notify, notifyError, t } from '@/lib/i18n-toast';

export default function LiveRoomViewer() {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Get state passed from navigation
  const { userId, userName, userAvatar, room, isHost, daily_room_url: navDailyRoomUrl } = location.state || {};

  // Use auth context as fallback if navigation state is missing
  const effectiveUserId = userId || user?.id;
  const effectiveUserName = userName || user?.email?.split('@')[0] || 'Guest';
  const effectiveUserAvatar = userAvatar;

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

  // Entry gate: host clicks "Start Stream", viewer clicks "Join Stream"
  const [isInRoom, setIsInRoom] = useState(false);

  // Room state polling (every 5s while live)
  const { data: roomState } = useRoomState(roomId, true);
  const roomStatus = roomState?.room?.status || room?.status;
  const sessionData = roomState?.session;
  const viewerCounts = roomState?.counts;

  // Host presence signals
  useHostPresence(roomId, effectiveIsHost);

  // End room mutation (gateway)
  const { mutate: endRoomMutation, isPending: isEnding } = useEndRoom();

  // Fallback: end room directly via Supabase if gateway fails
  const endRoomFallback = async (id: string) => {
    try {
      await supabase
        .from('live_rooms')
        .update({ status: 'idle', current_session_id: null, ends_at: new Date().toISOString() })
        .eq('id', id);
      await supabase
        .from('live_room_sessions')
        .update({ status: 'ended', ends_at: new Date().toISOString() })
        .eq('room_id', id)
        .in('status', ['lobby', 'live', 'scheduled']);
      await supabase
        .from('community_live_streams')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', id);
      notify('toasts.community.roomEnded', 'toasts.community.yourSessionHasEnded');
      navigate('/comm/live-rooms');
    } catch (err) {
      console.error('[EndRoom] Fallback also failed:', err);
      notifyError('toasts.community.failedEndRoom');
    }
  };

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


  // Daily.co room URL: navigation state first (from GoLivePopup), DB metadata as fallback
  const dailyRoomUrlFromDb = (dbRoom?.metadata as Record<string, unknown>)?.daily_room_url as string | null ?? null;
  // On-demand provisioned URL — when none of the known sources have a Daily room
  // yet, we mint/fetch one from the gateway (idempotent) so a viewer can still
  // join instead of hitting a bare "Videofehler".
  const [provisionedDailyUrl, setProvisionedDailyUrl] = useState<string | null>(null);
  const [isProvisioningDaily, setIsProvisioningDaily] = useState(false);
  const [provisionFailed, setProvisionFailed] = useState(false);
  // Bumped by the Retry button to re-fire provisioning when nothing else changed.
  const [retryNonce, setRetryNonce] = useState(0);
  // In-flight guard kept in a ref (NOT effect deps) so starting a request never
  // re-runs the effect and cancels its own in-flight POST.
  const provisioningRef = useRef(false);
  const dailyRoomUrl = navDailyRoomUrl
    || ((roomState?.room?.metadata as Record<string, unknown>)?.daily_room_url as string | null)
    || dailyRoomUrlFromDb
    || provisionedDailyUrl
    || null;

  // If we're in the room and still have no Daily URL, provision one on demand.
  // `createDailyRoom` is idempotent on the gateway (returns the existing room
  // when one already exists), so this is safe for both host and viewers.
  useEffect(() => {
    if (!isInRoom || !roomId) return;
    if (dailyRoomUrl || provisioningRef.current) return;
    provisioningRef.current = true;
    setIsProvisioningDaily(true);
    setProvisionFailed(false);
    liveRoomService
      .createDailyRoom(roomId)
      .then((res) => {
        if (res?.daily_room_url) {
          setProvisionedDailyUrl(res.daily_room_url);
        } else {
          setProvisionFailed(true);
        }
      })
      .catch((err) => {
        console.error('[LiveRoomViewer] Daily provision failed:', err);
        setProvisionFailed(true);
      })
      .finally(() => {
        provisioningRef.current = false;
        setIsProvisioningDaily(false);
      });
    // retryNonce is a dependency so the Retry button can re-trigger this.
  }, [isInRoom, roomId, dailyRoomUrl, retryNonce]);

  useEffect(() => {
    console.log('[LiveRoomViewer] dailyRoomUrl debug:', {
      navDailyRoomUrl,
      roomStateMetadata: roomState?.room?.metadata,
      dailyRoomUrlFromDb,
      resolved: dailyRoomUrl,
      roomStateExists: !!roomState,
      roomId,
    });
  }, [navDailyRoomUrl, roomState, dailyRoomUrlFromDb, dailyRoomUrl, roomId]);

  // Recording hook
  const { isRecording, stopRecording } = useStreamRecording({
    streamId: roomId || '',
    localStream: null,
    isHost: effectiveIsHost,
    enabled: sessionData?.enable_recording ?? false,
  });

  // Redirect if no proper state
  useEffect(() => {
    if (!effectiveUserId) {
      notifyError('toasts.community.invalidAccess', 'toasts.community.pleaseSignJoinLiveRooms');
      navigate('/comm/live-rooms');
    }
  }, [effectiveUserId, navigate, toast]);

  const handleLeaveRoom = async () => {
    if (effectiveIsHost && roomId) {
      if (isRecording) {
        await stopRecording();
      }
      endRoomMutation(roomId, {
        onError: () => {
          console.warn('[LiveRoomViewer] Gateway end failed, using Supabase fallback');
          endRoomFallback(roomId);
        },
      });
      notify('toasts.community.streamEnded', 'toasts.community.yourLiveStreamHasEnded');
    }
    navigate('/comm/live-rooms');
  };

  const streamTitle = sessionData?.session_title || room?.title || 'Live Room';
  const streamDescription = sessionData?.session_description || room?.description;
  const isLive = roomStatus === 'live' || roomStatus === 'lobby';
  const hasEnded = roomStatus === 'ended' || roomStatus === 'idle';

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
              <Button onClick={() => navigate('/comm/live-rooms')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('screens.community.backRooms')}
              </Button>
            </Card>
          </div>
        </AppLayout>
      </>
    );
  }

  return (
    <>
      <SEO 
        title={`${streamTitle} - Live Room`}
        description={streamDescription || `Join ${effectiveUserName}'s live stream`}
      />
      <AppLayout>
        {!isMobile && !isInRoom && <SubNavigation items={communityNavigation} />}
        
        <div className={cn(
          "flex flex-col",
          isInRoom
            ? (isMobile ? "h-[100dvh]" : "h-[calc(100vh-3rem)]")
            : "h-[calc(100vh-8rem)]"
        )}>
          {/* Header - hide when in room (Daily.co provides its own controls) */}
          {!isInRoom && <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/comm/live-rooms')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{streamTitle}</h1>
                <div className="flex items-center gap-2 mt-1">
                  {isLive && (
                    <Badge variant="destructive" className="animate-pulse">{t('screens.community.live')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon">
                <Share2 className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>}

          {/* Main Content - Full Width */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!isInRoom ? (
              /* Entry Screen */
              <div className="flex-1 flex items-center justify-center bg-muted/50">
              {isHostResolving ? (
                <Card className="p-8 text-center max-w-md">
                  <div className="animate-pulse text-muted-foreground">{t('screens.community.loading')}</div>
                </Card>
              ) : (
                <Card className="p-8 text-center max-w-md">
                  <h2 className="text-2xl font-bold mb-4">
                    {effectiveIsHost ? 'Ready to start?' : 'Ready to join?'}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {effectiveIsHost
                      ? 'Click below to start your live stream'
                      : 'Click below to join the live stream'}
                  </p>
                  <Button size="lg" onClick={() => setIsInRoom(true)} className="w-full">
                    {effectiveIsHost ? 'Start Stream' : 'Join Stream'}
                  </Button>
                </Card>
              )}
              </div>
            ) : (
              <>
                <div className="flex-1 flex flex-col bg-muted/50 relative">
                  {dailyRoomUrl ? (
                    <DailyVideoRoom
                      roomUrl={dailyRoomUrl}
                      onJoined={() => {
                        console.log('[Daily] Joined meeting');
                        if (effectiveIsHost && roomId) {
                          liveRoomService.hostPresent(roomId).catch(console.warn);
                        }
                      }}
                      onLeft={() => {
                        if (effectiveIsHost && roomId) {
                          liveRoomService.hostAbsent(roomId).catch(console.warn);
                        }
                        handleLeaveRoom();
                      }}
                      onError={(err) => {
                        console.error('[Daily] Error:', err);
                        notifyError('toasts.community.videoError');
                      }}
                    />
                  ) : provisionFailed ? (
                    <div className="flex-1 flex items-center justify-center p-6">
                      <div className="text-center max-w-sm">
                        <h3 className="text-lg font-semibold mb-1">
                          {t('screens.community.videoRoomUnavailable')}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {t('screens.community.videoRoomUnavailableHint')}
                        </p>
                        <Button
                          onClick={() => {
                            setProvisionFailed(false);
                            setProvisionedDailyUrl(null);
                            // Bump the nonce so the provisioning effect re-runs
                            // even though isInRoom/roomId/dailyRoomUrl are unchanged.
                            setRetryNonce((n) => n + 1);
                          }}
                        >
                          {t('screens.community.retry')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                        <p>{t('screens.community.settingUpVideoRoom')}</p>
                      </div>
                    </div>
                  )}
                  {isRecording && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 bg-destructive text-destructive-foreground px-3 py-1 rounded-full animate-pulse z-10">
                      <div className="w-3 h-3 bg-destructive-foreground rounded-full" />
                      {t('screens.community.recording')}
                    </div>
                  )}
                </div>

              </>
            )}
          </div>
        </div>
      </AppLayout>
    </>
  );
}
