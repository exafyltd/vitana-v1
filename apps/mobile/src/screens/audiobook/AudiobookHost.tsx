/**
 * VTID-05460 (native-wave2-journey-autopilot-r2/autopilot-audiobook) — the
 * app-wide Audiobook mount, the native form of web App.tsx:809-810
 * (`<AudiobookPlayerProvider>` around the routes, `<AudiobookMiniPlayer />`
 * beside them): the player provider (which also fills My Journey's seams),
 * the `?audiobook=play` entry and the floating mini player. The root layout
 * mounts it once around the router, inside the ORB provider (Ask Vitana
 * opens the ORB) so playback continues while the member moves around.
 */
import type { ReactElement, ReactNode } from 'react';
import { AudiobookPlayerProvider } from './AudiobookPlayerProvider';
import { AudiobookMiniPlayer } from './AudiobookMiniPlayer';
import { AudiobookPlayParam } from './AudiobookDeepLink';

export function AudiobookHost({ children }: { children: ReactNode }): ReactElement {
  return (
    <AudiobookPlayerProvider>
      {children}
      <AudiobookPlayParam />
      <AudiobookMiniPlayer />
    </AudiobookPlayerProvider>
  );
}
