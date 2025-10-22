import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { StreamMetadata } from '@/types/chat';

interface UseStreamLifecycleProps {
  roomId: string;
  isHost: boolean;
  viewerCount: number;
  messageCount: number;
  streamStatus?: string;
}

export const useStreamLifecycle = ({
  roomId,
  isHost,
  viewerCount,
  messageCount,
  streamStatus,
}: UseStreamLifecycleProps) => {
  const peakViewersRef = useRef(0);
  const updateIntervalRef = useRef<NodeJS.Timeout>();

  // Update stream to "live" when host joins
  useEffect(() => {
    if (isHost && streamStatus === 'pending') {
      supabase
        .from('community_live_streams')
        .update({
          status: 'live',
          started_at: new Date().toISOString(),
        })
        .eq('id', roomId)
        .then(({ error }) => {
          if (error) console.error('Failed to update stream status:', error);
        });
    }
  }, [isHost, roomId, streamStatus]);

  // Periodic viewer count updates
  useEffect(() => {
    if (!isHost) return;

    peakViewersRef.current = Math.max(peakViewersRef.current, viewerCount);

    updateIntervalRef.current = setInterval(() => {
      supabase
        .from('community_live_streams')
        .update({
          viewer_count: viewerCount,
          peak_viewers: peakViewersRef.current,
        })
        .eq('id', roomId)
        .then(({ error }) => {
          if (error) console.error('Failed to update viewer count:', error);
        });
    }, 5000); // Update every 5 seconds

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [isHost, roomId, viewerCount]);

  const endStream = async () => {
    await supabase
      .from('community_live_streams')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        total_messages: messageCount,
        peak_viewers: peakViewersRef.current,
      })
      .eq('id', roomId);
  };

  return {
    endStream,
  };
};
