/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — the in-screen
 * Health Sync affordance: the "Connect Device" / "Connect API" entry points
 * the web renders inside the health screens (`src/pages/health/MyBiology.tsx:337-340`
 * and `:354-357`, the medical / omics panes; `:527-530`, `:593-596` in the
 * mobile branch). This lane owns the component (plan decision 3); the
 * biology lane mounts it through src/ports/health-data.ts. The mobile-web
 * /health dashboard itself renders no connect entry point (Health.tsx:284-436),
 * so the native dashboard does not mount it either (R1.1: no UI the mobile
 * web does not show).
 *
 * The tap delegates to the Health Sync module's public read-only-until-enabled
 * entry (`src/ports/health-sync.ts`, the pinned interface). Today that is the
 * typed stub behind the ingest-off flag: `connect()` answers `flag_off` and
 * nothing else happens. The affordance itself never requests an OS
 * permission, never reads a health store and never ingests — that is the
 * N5a module's job (VTID-05184). The web tap only logs an activity row
 * (`useHealthLogger.ts:48-54`, a write), which the native twin does not do.
 */
import { useState, useSyncExternalStore, type ReactElement } from 'react';
import { Button } from '../../../ports/ui';
import { HealthButtonIcon } from '../../../ports/health';
import { getHealthSync, type HealthSyncEntry, type HealthSyncPassResult } from '../../../ports/health-sync';
import { useHealthText } from '../text';

export type HealthSyncAffordanceKind = 'device' | 'api';

const LABEL_KEY: Record<HealthSyncAffordanceKind, string> = {
  device: 'screens.health.connectDevice',
  api: 'screens.health.connectApi',
};

export function HealthSyncAffordance({
  kind,
  entry = getHealthSync(),
  onResult,
  testID,
}: {
  kind: HealthSyncAffordanceKind;
  entry?: HealthSyncEntry;
  onResult?: (r: HealthSyncPassResult) => void;
  testID?: string;
}): ReactElement {
  const { t } = useHealthText();
  const state = useSyncExternalStore(entry.onStateChange, entry.snapshot, entry.snapshot);
  const [busy, setBusy] = useState(false);
  const press = async () => {
    setBusy(true);
    try {
      onResult?.(await entry.connect());
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button
      testID={testID ?? `health-sync-connect-${kind}`}
      variant="outline"
      size="sm"
      disabled={busy}
      accessibilityHint={state.flag ? undefined : t('healthNative.sync.notEnabledHint')}
      onPress={() => void press()}
    >
      <HealthButtonIcon name="Activity" />
      {t(LABEL_KEY[kind])}
    </Button>
  );
}
