/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — the window events
 * the web health surfaces dispatch, on the native overlay bus (same names):
 *
 *  - `vitana:open-index` (`VITANA_INDEX_OPEN_EVENT`, VitanaIndexSheet.tsx:22):
 *    the snapshot and the chip open the Index sheet; the ORB's `vitana_index`
 *    overlay directive uses the same event (src/navigation/orb-navigation.ts:38).
 *  - `autopilot:open` (VitanaIndexSheet.tsx:310-312): the Autopilot popup is
 *    the journey-autopilot lane's surface. While no native screen has
 *    registered it on the bus, the native twin opens that lane's destination,
 *    `/autopilot` (the web "View My Journey" target, Health.tsx:386), so the
 *    tap is never dead.
 *  - `vitana:open-life-compass` (LifeCompassPopupContext.tsx:14).
 */
import { overlayBus } from '../../navigation/overlay-bus';
import { navigateToWebPath } from '../../navigation/navigate';

export const VITANA_INDEX_OPEN_EVENT = 'vitana:open-index';
export const AUTOPILOT_OPEN_EVENT = 'autopilot:open';
export const LIFE_COMPASS_OPEN_EVENT = 'vitana:open-life-compass';

export function openVitanaIndex(): void {
  overlayBus.emit(VITANA_INDEX_OPEN_EVENT);
}

export function openAutopilot(): void {
  if (overlayBus.listenerCount(AUTOPILOT_OPEN_EVENT) > 0) overlayBus.emit(AUTOPILOT_OPEN_EVENT);
  else navigateToWebPath('/autopilot');
}

export function openLifeCompass(): void {
  overlayBus.emit(LIFE_COMPASS_OPEN_EVENT);
}
