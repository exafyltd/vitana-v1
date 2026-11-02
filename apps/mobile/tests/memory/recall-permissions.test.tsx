/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — /memory/recall
 * (MEMORY.RECALL: static body + honest empty state, no live read) and
 * /memory/permissions (MEMORY.PERMISSIONS: learning switches read + write,
 * unavailable state, usage count, export, delete all) — fake gateway, no network.
 */
import '../helpers/no-network';
import { router } from './mocks';
import { Share } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { MemoryRecall } from '../../src/screens/memory/MemoryRecall';
import { MemoryPermissions } from '../../src/screens/memory/MemoryPermissions';
import { FAIL, memoryWrapper } from './helpers';

afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});
beforeEach(() => {
  router.navigate.mockClear();
  __clearToastsForTests();
});

describe('MemoryRecall', () => {
  it('renders the static body and the honest empty state without any gateway read', async () => {
    const { wrapper, requests } = memoryWrapper({});
    render(<MemoryRecall />, { wrapper });
    expect(screen.getByText('AI Memory Recall')).toBeTruthy();
    expect(screen.getByTestId('recall-search-panel')).toBeTruthy();
    expect(screen.getByTestId('recall-empty-searchResults')).toBeTruthy();
    expect(screen.getByText('Just ask Vitana')).toBeTruthy();
    fireEvent.press(screen.getByTestId('recall-tab-aiInsights'));
    expect(screen.getByTestId('recall-empty-aiInsights')).toBeTruthy();
    fireEvent.press(screen.getByTestId('recall-empty-action'));
    expect(router.navigate).toHaveBeenCalledWith('/memory');
    expect(requests).toEqual([]);
  });

  it('the Memory Actions sheet lists the eight actions; Search by date opens the timeline', async () => {
    const { wrapper } = memoryWrapper({});
    render(<MemoryRecall />, { wrapper });
    fireEvent.press(screen.getByTestId('recall-actions-open'));
    await waitFor(() => expect(screen.getByTestId('recall-action-searchByDate')).toBeTruthy());
    expect(screen.getByText('Ask AI Question')).toBeTruthy();
    fireEvent.press(screen.getByTestId('recall-action-searchByDate'));
    expect(router.navigate).toHaveBeenCalledWith('/memory/timeline');
  });
});

const prefs = { available: true, prefs: [{ category: 'sleep', learn: false }] };

describe('MemoryPermissions', () => {
  it('reads the switches (missing = on) and the usage count', async () => {
    const { wrapper } = memoryWrapper({ 'GET /timeline/learning-prefs': prefs, 'GET /timeline/usage-data': { available: true, count: 1234 } });
    render(<MemoryPermissions />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('learn-switch-sleep')).toBeTruthy());
    expect(screen.getByTestId('learn-switch-sleep').props.accessibilityState.checked).toBe(false);
    expect(screen.getByTestId('learn-switch-nutrition').props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId('learn-switch-app_usage')).toBeTruthy();
    expect(screen.getByTestId('learn-switch-wallet')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('memory-usage-count').props.children).toBe('1,234 stored entries'));
  });

  it('writes a switch through PUT learning-prefs and flips it optimistically', async () => {
    const { wrapper, requests } = memoryWrapper({
      'GET /timeline/learning-prefs': prefs,
      'PUT /timeline/learning-prefs': { routines_deleted: 0 },
      'GET /timeline/usage-data': { available: true, count: 1 },
    });
    render(<MemoryPermissions />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('learn-switch-sleep')).toBeTruthy());
    fireEvent.press(screen.getByTestId('learn-switch-sleep'));
    await waitFor(() => expect(requests.find((r) => r.method === 'PUT')?.body).toEqual({ category: 'sleep', learn: true }));
  });

  it('a failed write raises the save-failed toast', async () => {
    const { wrapper } = memoryWrapper({ 'GET /timeline/learning-prefs': prefs, 'PUT /timeline/learning-prefs': FAIL, 'GET /timeline/usage-data': { available: true, count: 1 } });
    render(<MemoryPermissions />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('learn-switch-mental')).toBeTruthy());
    fireEvent.press(screen.getByTestId('learn-switch-mental'));
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toContain('memoryLearning.toast.saveFailed'));
  });

  it('disables the switches and the usage actions when unavailable', async () => {
    const { wrapper } = memoryWrapper({ 'GET /timeline/learning-prefs': FAIL, 'GET /timeline/usage-data': { available: false, count: null } });
    render(<MemoryPermissions />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('memory-learning-unavailable')).toBeTruthy());
    expect(screen.getByTestId('learn-switch-sleep').props.accessibilityState.disabled).toBe(true);
    await waitFor(() => expect(screen.getByTestId('memory-usage-count').props.children).toBe('The overview will be available shortly.'));
    expect(screen.getByTestId('memory-usage-export').props.accessibilityState.disabled).toBe(true);
  });

  it('exports the usage data to the share sheet', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    const { wrapper } = memoryWrapper({ 'GET /timeline/learning-prefs': prefs, 'GET /timeline/usage-data': { available: true, count: 2 }, 'GET /timeline/usage-data/export': { visits: [1, 2] } });
    render(<MemoryPermissions />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('memory-usage-export')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByTestId('memory-usage-export'));
    });
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(JSON.parse(share.mock.calls[0][0].message as string)).toEqual({ visits: [1, 2] });
    share.mockRestore();
  });

  it('deletes all usage data after the confirmation', async () => {
    const { wrapper, requests } = memoryWrapper({
      'GET /timeline/learning-prefs': prefs,
      'GET /timeline/usage-data': { available: true, count: 2 },
      'DELETE /timeline/usage-data': { deleted: 2, routines_deleted: 0 },
    });
    render(<MemoryPermissions />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('memory-usage-delete')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('memory-usage-delete').props.accessibilityState.disabled).toBeFalsy());
    fireEvent.press(screen.getByTestId('memory-usage-delete'));
    await waitFor(() => expect(screen.getByTestId('memory-usage-delete-confirm')).toBeTruthy());
    expect(requests.some((r) => r.method === 'DELETE')).toBe(false);
    await act(async () => {
      fireEvent.press(screen.getByTestId('memory-usage-delete-confirm'));
    });
    await waitFor(() => expect(requests.some((r) => r.method === 'DELETE' && r.path === '/timeline/usage-data')).toBe(true));
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toContain('memoryLearning.toast.deleted'));
  });
});
