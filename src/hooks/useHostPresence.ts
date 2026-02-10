/**
 * Host presence signals - fires host-present on mount, host-absent on unmount
 * VTID-01228
 */

import { useEffect } from 'react';
import { liveRoomService } from '@/services/liveRoomService';

export function useHostPresence(roomId: string | undefined, isHost: boolean) {
  useEffect(() => {
    if (!roomId || !isHost) return;

    liveRoomService.hostPresent(roomId).catch((err) =>
      console.warn('[HostPresence] present signal failed:', err.message)
    );

    return () => {
      liveRoomService.hostAbsent(roomId).catch((err) =>
        console.warn('[HostPresence] absent signal failed:', err.message)
      );
    };
  }, [roomId, isHost]);
}
