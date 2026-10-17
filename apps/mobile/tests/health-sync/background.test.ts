/**
 * VTID-05184 — background delivery and scheduling (N5a plan change 10).
 */
const mockTm = { defineTask: jest.fn() };
const mockBt = { registerTaskAsync: jest.fn(async () => undefined), unregisterTaskAsync: jest.fn(async () => undefined), BackgroundTaskResult: { Success: 1, Failed: 2 } };
const mockHk = { configureBackgroundTypes: jest.fn(async () => true), clearBackgroundTypes: jest.fn(async () => true), subscribeToChanges: jest.fn(() => ({ remove: jest.fn(() => true) })) };
jest.mock('expo-task-manager', () => mockTm);
jest.mock('expo-background-task', () => mockBt);
jest.mock('@kingstinct/react-native-healthkit', () => mockHk);

import { BACKGROUND_BUDGET_MS, BACKGROUND_INTERVAL_MIN, BACKGROUND_TASK, createScheduler } from '../../src/health-sync/background';

describe('scheduler', () => {
  it('iOS: one task (60 min), hourly HealthKit observers for the consented categories, a bounded pass per wake', async () => {
    const run = jest.fn(async () => undefined);
    const s = createScheduler('ios', run);
    await s.register(['sleep', 'body']);
    expect(mockTm.defineTask).toHaveBeenCalledWith(BACKGROUND_TASK, expect.any(Function));
    expect(mockBt.registerTaskAsync).toHaveBeenCalledWith(BACKGROUND_TASK, { minimumInterval: BACKGROUND_INTERVAL_MIN });
    expect(BACKGROUND_INTERVAL_MIN).toBe(60);
    expect(mockHk.configureBackgroundTypes).toHaveBeenCalledWith(['HKCategoryTypeIdentifierSleepAnalysis', 'HKQuantityTypeIdentifierBodyMass', 'HKQuantityTypeIdentifierBodyFatPercentage'], 2);
    const [, cb] = (mockHk.subscribeToChanges.mock.calls[0] as unknown) as [string, () => void];
    cb();
    expect(run).toHaveBeenCalledWith({ background: true, budgetMs: BACKGROUND_BUDGET_MS });
    const task = mockTm.defineTask.mock.calls[0][1] as () => Promise<number>;
    expect(await task()).toBe(mockBt.BackgroundTaskResult.Success);
    await s.clear();
    expect(mockBt.unregisterTaskAsync).toHaveBeenCalledWith(BACKGROUND_TASK);
    expect(mockHk.clearBackgroundTypes).toHaveBeenCalled();
  });
  it('Android: the WorkManager task only, no HealthKit', async () => {
    mockHk.configureBackgroundTypes.mockClear();
    const s = createScheduler('android', jest.fn(async () => undefined));
    await s.register(['activity']);
    expect(mockHk.configureBackgroundTypes).not.toHaveBeenCalled();
  });
});
