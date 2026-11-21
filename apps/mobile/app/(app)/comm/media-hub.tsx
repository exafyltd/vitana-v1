/**
 * VTID-05677 — `/comm/media-hub` (ledger rows COMM.MEDIA_HUB / MEDIA_MUSIC /
 * MEDIA_PODCASTS / MEDIA_SHORTS: one screen, the `tab` and `short` params pick
 * the mode). Provides the real `MediaHubData` to the screen.
 */
import { MediaHubDataProvider } from '../../../src/ports/media';
import { realMediaHubData } from '../../../src/screens/media/data';
import { MediaHubScreen } from '../../../src/screens/media/MediaHubScreen';

export default function MediaHubRoute() {
  return (
    <MediaHubDataProvider value={realMediaHubData}>
      <MediaHubScreen />
    </MediaHubDataProvider>
  );
}
