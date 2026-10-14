/**
 * VTID-05182 — `useOrbSession()`: binds the ORB controller (session.ts +
 * AudioPipeline + VitanaVoice) to React (native N6d, plan Change 15).
 *
 * Mounted once in app/_layout.tsx inside the shell root, so the FAB in N3's
 * bottom-bar slot and the full-screen overlay share one controller. Route and
 * role changes are fed to it (Change 18); directives navigate through
 * nav-directive.ts (Change 17).
 */
import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { Linking } from 'react-native';
import Constants from 'expo-constants';
import { router, usePathname } from 'expo-router';
import { getVitanaVoice } from '../../../modules/vitana-voice/src/VitanaVoice';
import { config, requireUrl } from '../../config/env';
import { getAccessToken } from '../../auth/client';
import { useI18n } from '../../i18n/I18nProvider';
import { useRole } from '../../identity/useRole';
import { overlayBus } from '../../navigation/overlay-bus';
import { resolveWebPath } from '../../navigation/resolve';
import { runNativeNavigation } from '../nav-directive';
import { createOrbSession } from '../session';
import { devTransportOverride } from '../select-transport';
import { createOrbController, type OrbController, type OrbUiState } from './orb-controller';

const OrbContext = createContext<OrbController | null>(null);

/** The build's gateway, or null (no URL in this build, or a refused host). */
export function orbGatewayUrl(): string | null {
  try {
    return requireUrl(config, 'gatewayUrl');
  } catch {
    return null;
  }
}

function appProfile(): string | undefined {
  return (Constants.expoConfig?.extra as { profile?: string } | undefined)?.profile;
}

/** The app's controller: real module, real session, router + overlay bus for directives. */
export function createAppOrbController(lang: () => string): OrbController {
  return createOrbController({
    gatewayUrl: orbGatewayUrl(),
    voice: getVitanaVoice,
    createSession: createOrbSession,
    getAccessToken,
    navigate: (route, ctx) =>
      runNativeNavigation(route, ctx, {
        resolve: resolveWebPath,
        push: (href) => router.push(href as never),
        overlayListeners: (event) => overlayBus.listenerCount(event),
        emitOverlay: (event, detail) => overlayBus.emit(event, detail),
      }),
    lang,
    appVersion: Constants.expoConfig?.version ?? '0.0.0',
    transportOverride: devTransportOverride(appProfile(), process.env.EXPO_PUBLIC_ORB_TRANSPORT),
    openUrl: (url) => {
      if (/^https:\/\//i.test(url)) void Linking.openURL(url).catch(() => undefined);
    },
    openSettings: () => {
      void Linking.openSettings().catch(() => undefined);
    },
  });
}

/** Feeds route and role changes to the controller (Change 18). */
function ContextFeed({ controller }: { controller: OrbController }) {
  const pathname = usePathname();
  const { dbRole } = useRole();
  useEffect(() => {
    controller.setContext({ route: pathname || '/', role: dbRole });
  }, [controller, pathname, dbRole]);
  return null;
}

export function OrbProvider({ children, controller: injected }: { children: ReactNode; controller?: OrbController }) {
  const { language } = useI18n();
  const languageRef = useRef(language);
  languageRef.current = language;
  const controller = useMemo(() => injected ?? createAppOrbController(() => languageRef.current), [injected]);
  useEffect(() => () => controller.dispose(), [controller]);
  return (
    <OrbContext.Provider value={controller}>
      <ContextFeed controller={controller} />
      {children}
    </OrbContext.Provider>
  );
}

const CLOSED: OrbUiState = { open: false, phase: null, muted: false, liveText: null, snapshot: null };
const noop = () => () => undefined;

/** The controller and its state; outside an OrbProvider, a closed ORB and no controller. */
export function useOrbSession(): { controller: OrbController | null; state: OrbUiState } {
  const controller = useContext(OrbContext);
  const state = useSyncExternalStore(controller ? controller.subscribe : noop, controller ? controller.getState : () => CLOSED);
  return { controller, state };
}
