/**
 * VTID-05460 (native-wave2-journey-autopilot-r2/autopilot-audiobook) — the
 * two Audiobook entries of the web dashboard (AutopilotDashboard.tsx:167-189):
 *
 *  - `/autopilot/audiobook` (VTID-04763, the daily reminder push; a plain
 *    path because the Android wrapper drops notification URLs with a query):
 *    renders My Journey (the journey lane's screen, through the dashboard
 *    port — web App.tsx:1544-1548 renders `AutopilotDashboard`), and once the
 *    member is known switches to Guided mode, starts the player unless it is
 *    already playing, and settles on `/autopilot` (replace);
 *  - `/autopilot?audiobook=play` (VTID-04761, the welcome's "Play Episode 1",
 *    Vitana's first-time CTA): `AudiobookPlayParam`, mounted next to the
 *    player, sends it through the same deep link, so it ends the same way
 *    (Guided, playing, `/autopilot` without the parameter).
 *
 * The mode switch is the journey's own provider (`setMode('guided')`: cache
 * + `POST /journey/mode`); the redirect waits for it so `/autopilot` opens in
 * Guided mode. The web fires `setMode` before the mode is known (its cache is
 * synchronous); here the stored mode is read first so a late resolution
 * cannot undo the switch.
 */
import { useEffect, useRef, type ReactElement } from 'react';
import { router, useGlobalSearchParams, usePathname } from 'expo-router';
import { useAuth } from '../../auth/AuthProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { GuidedModeProvider, JourneyScreen, useGuidedMode } from '../../ports/journey-dashboard';
import { useAudiobookPlayer } from './AudiobookPlayerProvider';

export const AUDIOBOOK_DEEP_LINK = '/autopilot/audiobook';

function AudiobookDeepLinkStart(): null {
  const player = useAudiobookPlayer();
  const { user } = useAuth();
  const { mode, loading, setMode } = useGuidedMode();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !player || !user || loading) return;
    done.current = true;
    const switching = mode !== 'guided' ? setMode('guided') : Promise.resolve();
    if (!player.active) void player.start();
    void switching.finally(() => navigateToWebPath('/autopilot', { replace: true }));
  }, [player, user, loading, mode, setMode]);
  return null;
}

/** The `/autopilot/audiobook` route body. */
export function AudiobookDeepLinkScreen(): ReactElement {
  return (
    <>
      <JourneyScreen />
      <GuidedModeProvider>
        <AudiobookDeepLinkStart />
      </GuidedModeProvider>
    </>
  );
}

/** `/autopilot?audiobook=play` → the deep link above. */
export function AudiobookPlayParam(): null {
  const pathname = usePathname();
  const { audiobook } = useGlobalSearchParams<{ audiobook?: string }>();
  const { user } = useAuth();
  const player = useAudiobookPlayer();
  useEffect(() => {
    if (pathname.replace(/\/$/, '') !== '/autopilot' || audiobook !== 'play' || !user || !player) return;
    router.replace(AUDIOBOOK_DEEP_LINK as never);
  }, [pathname, audiobook, user, player]);
  return null;
}
