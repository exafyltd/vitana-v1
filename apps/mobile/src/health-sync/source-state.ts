/**
 * VTID-05184 — "OS permission revoked → source paused" (N5a, plan change 11).
 *
 * Android: a consented category whose READ permissions are all gone is not
 * read any more. Only when NO consented category is permitted (or Health
 * Connect is gone) does the module POST `os_permission_revoked` — once; when
 * permissions come back, `active`. A partial loss posts nothing, because the
 * server pauses the whole source for any `os_permission_revoked`.
 * iOS: HealthKit hides read denial, so iOS never posts.
 */
import { entriesFor, type Category } from './contract/v1/catalogue';
import type { SourceKind } from './contract/v1/wire';
import { PATHS, type GatewayClient, type SourceStateBody } from './gateway';
import type { PlatformReader } from './readers/types';
import type { HealthStore } from './store/store';
import type { Scope } from './store/types';

export interface OsPermissionResult {
  permitted: Category[];
  history: boolean;
  background: boolean;
  posted: 'os_permission_revoked' | 'active' | null;
}

export async function reconcileOsPermission(args: {
  reader: PlatformReader;
  gateway: GatewayClient;
  store: HealthStore;
  scope: Scope;
  kind: SourceKind;
  consented: readonly Category[];
}): Promise<OsPermissionResult> {
  const { reader, gateway, store, scope, kind, consented } = args;
  if (reader.platform !== 'android') return { permitted: [...consented], history: true, background: true, posted: null };
  const available = await reader.available();
  const granted = available ? await reader.permitted() : null;
  const permitted = consented.filter((cat) =>
    entriesFor('android', [cat]).some((e) => e.hcRecordType !== null && granted?.types.has(e.hcRecordType) === true),
  );
  const last = await store.getState<'revoked' | 'active'>(scope, 'os_permission_posted');
  let target: SourceStateBody['state'] | null = null;
  if (consented.length > 0 && permitted.length === 0 && last !== 'revoked') target = 'os_permission_revoked';
  else if (permitted.length > 0 && last === 'revoked') target = 'active';
  let posted: OsPermissionResult['posted'] = null;
  if (target) {
    const body: SourceStateBody = { source_kind: kind, install_id: scope.install_id, state: target, permitted_categories: target === 'active' ? permitted : [] };
    const res = await gateway.postJson(PATHS.sourceState, body);
    // 200 (changed or not, incl. `not_connected`) settles it; 409 INGEST_DISABLED and 503s retry on the next pass.
    if (!('error' in res) && res.status === 200) {
      await store.setState(scope, 'os_permission_posted', target === 'active' ? 'active' : 'revoked');
      posted = target;
    }
  }
  return { permitted, history: granted?.history ?? false, background: granted?.background ?? false, posted };
}
