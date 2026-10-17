/**
 * VTID-05184 — background delivery and scheduling (N5a, plan change 10).
 *
 * iOS: `configureBackgroundTypes(types of consented categories, hourly)`
 * registers HealthKit observers natively at launch (they survive
 * termination); the JS observer handler (`subscribeToChanges`, the library's
 * observer-query wrapper) runs one bounded pass. expo-background-task
 * (`minimumInterval` 60 min: BGTaskScheduler / WorkManager) drains the queue
 * and, on Android with BackgroundAccessPermission, reads too.
 * Everything here is required lazily and only once the flag is on.
 */
import { entriesFor, type Category, type SyncPlatform } from './contract/v1/catalogue';
import type { SchedulerPort } from './ports';

export const BACKGROUND_TASK = 'vitana-health-sync';
export const BACKGROUND_INTERVAL_MIN = 60;
/** iOS gives a background wake about 30 s; a pass stops sending after this budget. */
export const BACKGROUND_BUDGET_MS = 25_000;

export type PassRunner = (opts: { background: boolean; budgetMs: number }) => Promise<unknown>;

let defined = false;

/** Defines the task once. Call from the app entry (global scope) when the Health lane wires the module. */
export function defineHealthSyncTask(run: PassRunner): void {
  if (defined) return;
  /* eslint-disable @typescript-eslint/no-require-imports */
  const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');
  const BackgroundTask = require('expo-background-task') as typeof import('expo-background-task');
  /* eslint-enable @typescript-eslint/no-require-imports */
  TaskManager.defineTask(BACKGROUND_TASK, async () => {
    try {
      await run({ background: true, budgetMs: BACKGROUND_BUDGET_MS });
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
  defined = true;
}

interface ObserverApi {
  subscribeToChanges?(id: string, cb: (args: { typeIdentifier: string; errorMessage?: string }) => void): { remove: () => boolean };
  configureBackgroundTypes?(ids: string[], frequency: unknown): Promise<boolean>;
  clearBackgroundTypes?(): Promise<boolean>;
}

/** HKUpdateFrequency.hourly */
const HOURLY = 2;

export function createScheduler(platform: SyncPlatform, run: PassRunner): SchedulerPort {
  let subs: { remove: () => boolean }[] = [];
  return {
    async register(categories: readonly Category[]) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const BackgroundTask = require('expo-background-task') as typeof import('expo-background-task');
      defineHealthSyncTask(run);
      await BackgroundTask.registerTaskAsync(BACKGROUND_TASK, { minimumInterval: BACKGROUND_INTERVAL_MIN });
      if (platform !== 'ios') return;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const hk = require('@kingstinct/react-native-healthkit') as ObserverApi;
      const ids = entriesFor('ios', categories).map((e) => e.healthkit).filter((x): x is string => !!x);
      subs.forEach((s) => s.remove());
      subs = [];
      if (ids.length === 0) {
        await hk.clearBackgroundTypes?.();
        return;
      }
      await hk.configureBackgroundTypes?.(ids, HOURLY);
      for (const id of ids) {
        const sub = hk.subscribeToChanges?.(id, () => {
          void run({ background: true, budgetMs: BACKGROUND_BUDGET_MS });
        });
        if (sub) subs.push(sub);
      }
    },
    async clear() {
      subs.forEach((s) => s.remove());
      subs = [];
      if (!defined) return;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const BackgroundTask = require('expo-background-task') as typeof import('expo-background-task');
      await BackgroundTask.unregisterTaskAsync(BACKGROUND_TASK).catch(() => undefined);
      if (platform === 'ios') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const hk = require('@kingstinct/react-native-healthkit') as ObserverApi;
        await hk.clearBackgroundTypes?.();
      }
    },
  };
}
