/**
 * VTID-05457 (native-wave2-health-biology-r3/vitana-index-biology) — the
 * native biology screen (HEALTH.MY_BIOLOGY /health/my-biology, ?tab=omics
 * HEALTH.BIOLOGY_OMICS, ?tab=supplements HEALTH.BIOLOGY_SUPPLEMENTS): the
 * `tab` param (default, unknown, write-back), the chrome (sub-navigation,
 * phone header, utility rail incl. the IAP rule), medical / omics loaded /
 * empty / error + retry, the report cards, the upload sheet with the right
 * category, the in-screen Health Sync affordance, supplements loaded / empty
 * / filtered / active-category chips, the add / edit dialog (write-disabled)
 * and Biomarker Actions. Recording Supabase + fake gateway, no network.
 */
import '../../helpers/no-network';
import { router, searchParams } from '../mocks';
import { Platform } from 'react-native';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { __setGatewayForTests } from '../../../src/auth/gateway';
import { __setHealthSyncForTests, healthSyncInitialState, type HealthSyncPassResult } from '../../../src/ports/health-sync';
import { MyBiologyScreen, isMedical, isOmics } from '../../../src/screens/health/MyBiologyScreen';
import { overlayBus } from '../../../src/navigation/overlay-bus';
import { fullTables, labReports, supplements, USER_ID } from '../helpers';
import { biologyWrapper } from './fixtures';

const originalOS = Platform.OS;
beforeEach(() => {
  searchParams.current = {};
  jest.clearAllMocks();
  overlayBus.clear();
  Platform.OS = 'android';
});
afterAll(() => {
  Platform.OS = originalOS;
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
  __setHealthSyncForTests(null);
});

/** An overlay closes after its exit animation (motion.dialogMs / sheetMs): let it run inside act, then check it unmounted. */
async function gone(testID: string) {
  await act(async () => {
    await new Promise((res) => setTimeout(res, 450));
  });
  await waitFor(() => expect(screen.queryByTestId(testID)).toBeNull(), { timeout: 5000 });
}

describe('tabs (?tab=, useUrlTab("tab", "medical"))', () => {
  it.each([
    [undefined, 'medical'],
    ['medical', 'medical'],
    ['omics', 'omics'],
    ['supplements', 'supplements'],
    ['nope', 'medical'],
  ])('?tab=%p opens %s', (tab, expected) => {
    searchParams.current = tab ? { tab } : {};
    const { wrapper } = biologyWrapper();
    render(<MyBiologyScreen />, { wrapper });
    expect(screen.getByTestId(`biology-pane-${expected}`)).toBeTruthy();
    expect(screen.getByTestId(`biology-tabs-${expected}`).props.accessibilityState).toEqual({ selected: true });
  });

  it('a tab change writes ?tab= back and keeps the default out of the URL', () => {
    const { wrapper } = biologyWrapper();
    render(<MyBiologyScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('biology-tabs-omics'));
    expect(router.setParams).toHaveBeenLastCalledWith({ tab: 'omics' });
    expect(screen.getByTestId('biology-pane-omics')).toBeTruthy();
    fireEvent.press(screen.getByTestId('biology-tabs-supplements'));
    expect(router.setParams).toHaveBeenLastCalledWith({ tab: 'supplements' });
    fireEvent.press(screen.getByTestId('biology-tabs-medical'));
    expect(router.setParams).toHaveBeenLastCalledWith({ tab: undefined });
  });
});

describe('chrome', () => {
  it('health sub-navigation (My Biology active), phone header, utility rail in web order', () => {
    const { wrapper } = biologyWrapper();
    render(<MyBiologyScreen />, { wrapper });
    expect(screen.getByTestId('biology-subnav-my-biology').props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(screen.getByTestId('biology-subnav-plans'));
    expect(router.navigate).toHaveBeenCalledWith('/health/plans');
    expect(within(screen.getByTestId('biology-header')).getByText('Your Biology Central Hub')).toBeTruthy();
    const rail = screen.getByTestId('biology-utility-bar');
    expect(within(rail).getByTestId('health-search-button')).toBeTruthy();
    expect(within(rail).getByTestId('health-calendar-button')).toBeTruthy();
    expect(within(rail).getByText('Add Data')).toBeTruthy();
    expect(within(rail).getByText('Life Compass')).toBeTruthy();
    expect(within(rail).getByText('Gift Voucher')).toBeTruthy();
    fireEvent.press(screen.getByTestId('health-search-button'));
    expect(screen.getByTestId('health-search-input').props.placeholder).toBe('Search for biomarkers, tests, or supplements...');
  });

  it('iOS: the Gift Voucher button is hidden (IAP rule, never loosened); Life Compass emits its event', () => {
    Platform.OS = 'ios';
    const heard = jest.fn();
    overlayBus.on('vitana:open-life-compass', heard);
    const { wrapper } = biologyWrapper();
    render(<MyBiologyScreen />, { wrapper });
    expect(screen.queryByTestId('biology-gift-voucher-button')).toBeNull();
    fireEvent.press(screen.getByTestId('biology-life-compass-button'));
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('"Add Data" opens Biomarker Actions: order → services hub, trends → health tracker, download closes, Close closes', async () => {
    const { wrapper } = biologyWrapper();
    render(<MyBiologyScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('biology-add-data'));
    await waitFor(() => expect(screen.getByTestId('biomarker-actions-popup-content')).toBeTruthy());
    expect(screen.getByText('Biomarker Actions')).toBeTruthy();
    expect(screen.getByText('Order New Lab Test')).toBeTruthy();
    fireEvent.press(screen.getByTestId('biomarker-action-orderLabTest'));
    expect(router.navigate).toHaveBeenCalledWith('/health/services-hub');
    await gone('biomarker-actions-popup-content');
    fireEvent.press(screen.getByTestId('biology-add-data'));
    await waitFor(() => expect(screen.getByTestId('biomarker-action-trackTrends')).toBeTruthy());
    fireEvent.press(screen.getByTestId('biomarker-action-trackTrends'));
    expect(router.navigate).toHaveBeenCalledWith('/health-tracker');
    fireEvent.press(screen.getByTestId('biology-add-data'));
    await waitFor(() => expect(screen.getByTestId('biomarker-action-downloadResults')).toBeTruthy());
    router.navigate.mockClear();
    fireEvent.press(screen.getByTestId('biomarker-action-downloadResults'));
    expect(router.navigate).not.toHaveBeenCalled();
    await gone('biomarker-actions-popup-content');
    fireEvent.press(screen.getByTestId('biology-add-data'));
    await waitFor(() => expect(screen.getByTestId('biomarker-actions-close')).toBeTruthy());
    fireEvent.press(screen.getByTestId('biomarker-actions-close'));
    await gone('biomarker-actions-popup-content');
  }, 30_000);
});

describe('medical / omics', () => {
  it('medical lists the member’s medical reports only (type + status badges, date, provider)', async () => {
    const { wrapper } = biologyWrapper();
    render(<MyBiologyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('biology-report-r1')).toBeTruthy());
    const card = screen.getByTestId('biology-report-r1');
    expect(within(card).getByText('Annual bloods')).toBeTruthy();
    expect(within(card).getByText('Blood panel')).toBeTruthy();
    expect(within(card).getByText('Quest')).toBeTruthy();
    expect(within(screen.getByTestId('biology-report-status-r1')).getByText('Uploaded')).toBeTruthy();
    expect(screen.getByTestId('biology-report-date-r1').props.children).toMatch(/2026/);
    expect(screen.queryByTestId('biology-report-r2')).toBeNull();
    expect(screen.queryByTestId('biology-report-other')).toBeNull();
  });

  it('omics lists genomics with the fallback title and provider', async () => {
    searchParams.current = { tab: 'omics' };
    const { wrapper } = biologyWrapper();
    render(<MyBiologyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('biology-report-r2')).toBeTruthy());
    expect(within(screen.getByTestId('biology-report-r2')).getByText('Health report')).toBeTruthy();
    expect(within(screen.getByTestId('biology-report-r2')).getByText('Genomics')).toBeTruthy();
    expect(within(screen.getByTestId('biology-report-r2')).getByText('Unknown provider')).toBeTruthy();
    expect(screen.queryByTestId('biology-report-r1')).toBeNull();
  });

  it('split rules (MyBiology.tsx:136-145)', () => {
    expect(labReports.filter(isMedical as never).map((r) => r.id)).toEqual(['r1', 'other']);
    expect(labReports.filter(isOmics as never).map((r) => r.id)).toEqual(['r2']);
    expect(isMedical({ id: 'x', report_type: null })).toBe(true);
  });

  it('empty: the empty state; its CTA opens the upload sheet with the pane’s category', async () => {
    for (const [tab, category, cta] of [
      ['medical', 'blood_panel', 'Upload Blood Panel'],
      ['omics', 'genomics', 'Upload Omics Report'],
    ] as const) {
      searchParams.current = { tab };
      const { wrapper } = biologyWrapper({ tables: { ...fullTables(), lab_reports: [] } });
      const r = render(<MyBiologyScreen />, { wrapper });
      await waitFor(() => expect(screen.getByTestId(`biology-${tab}-empty`)).toBeTruthy());
      expect(screen.getByText(cta)).toBeTruthy();
      fireEvent.press(screen.getByTestId(`biology-${tab}-empty-upload`));
      await waitFor(() => expect(screen.getByTestId('health-upload-sheet-content')).toBeTruthy());
      expect(screen.getByTestId(`health-upload-category-${category}`).props.accessibilityState).toEqual({ checked: true });
      expect(screen.getByTestId('health-upload-submit').props.accessibilityState).toMatchObject({ disabled: true });
      r.unmount();
    }
  }, 30_000);

  it('error: the error state; retry re-reads lab_reports', async () => {
    const { wrapper, sb } = biologyWrapper({ tables: { ...fullTables(), lab_reports: { error: 'down' } } });
    render(<MyBiologyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('biology-medical-error')).toBeTruthy());
    expect(screen.getByText("Couldn't load your reports")).toBeTruthy();
    const before = sb.requests.filter((r) => r.table === 'lab_reports').length;
    fireEvent.press(screen.getByTestId('biology-medical-retry'));
    await waitFor(() => expect(sb.requests.filter((r) => r.table === 'lab_reports').length).toBeGreaterThan(before));
  });

  it('"Upload PDF" / "Upload Results" open the sheet with blood_panel / genomics', async () => {
    const { wrapper } = biologyWrapper();
    render(<MyBiologyScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('biology-medical-upload'));
    await waitFor(() => expect(screen.getByTestId('health-upload-category-blood_panel').props.accessibilityState).toEqual({ checked: true }));
    fireEvent.press(screen.getByTestId('health-upload-sheet-close'));
    await gone('health-upload-sheet-content');
    fireEvent.press(screen.getByTestId('biology-tabs-omics'));
    fireEvent.press(screen.getByTestId('biology-omics-upload'));
    await waitFor(() => expect(screen.getByTestId('health-upload-category-genomics').props.accessibilityState).toEqual({ checked: true }));
  }, 30_000);

  it('"Connect Device" / "Connect API" delegate to the Health Sync entry (ingest off) and nothing else', async () => {
    const connect = jest.fn(async (): Promise<HealthSyncPassResult> => ({ ran: false, reason: 'flag_off' }));
    const state = healthSyncInitialState();
    __setHealthSyncForTests({ snapshot: () => state, onStateChange: () => () => undefined, connect });
    const { wrapper, gw } = biologyWrapper();
    render(<MyBiologyScreen />, { wrapper });
    expect(within(screen.getByTestId('biology-medical-connect')).getByText('Connect Device')).toBeTruthy();
    fireEvent.press(screen.getByTestId('biology-medical-connect'));
    await waitFor(() => expect(connect).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByTestId('biology-tabs-omics'));
    expect(within(screen.getByTestId('biology-omics-connect')).getByText('Connect API')).toBeTruthy();
    fireEvent.press(screen.getByTestId('biology-omics-connect'));
    await waitFor(() => expect(connect).toHaveBeenCalledTimes(2));
    expect(gw.requests.filter((r) => r.method !== 'GET')).toEqual([]);
    __setHealthSyncForTests(null);
  });
});

describe('supplements', () => {
  beforeEach(() => {
    searchParams.current = { tab: 'supplements' };
  });

  it('loaded: cards (inactive badge, dosage, frequency, start date, notes), active categories', async () => {
    const { wrapper } = biologyWrapper();
    render(<MyBiologyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('biology-supplement-s1')).toBeTruthy());
    expect(within(screen.getByTestId('biology-supplement-s1')).getByText('2000 IU')).toBeTruthy();
    expect(within(screen.getByTestId('biology-supplement-s1')).getByText('With breakfast')).toBeTruthy();
    expect(within(screen.getByTestId('biology-supplement-s2')).getByText('Inactive')).toBeTruthy();
    expect(within(screen.getByTestId('biology-active-categories')).getByText('Vitamins (1)')).toBeTruthy();
    expect(screen.getByTestId('biology-supplement-delete-s1').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('loading shows the loading text', () => {
    const { wrapper } = biologyWrapper();
    render(<MyBiologyScreen />, { wrapper });
    expect(screen.getByText('Loading supplements...')).toBeTruthy();
  });

  it('empty: the web empty text, no active-categories box', async () => {
    const { wrapper } = biologyWrapper({ tables: { ...fullTables(), user_supplements: [] } });
    render(<MyBiologyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('biology-supplements-empty')).toBeTruthy());
    expect(screen.getByText("No supplements added yet. Tap 'Add Supplement' to get started.")).toBeTruthy();
    expect(screen.queryByTestId('biology-active-categories')).toBeNull();
  });

  it('the category filter (all + every catalogue category with its count) and the active-category chips', async () => {
    const { wrapper } = biologyWrapper();
    render(<MyBiologyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('biology-supplement-s1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('biology-supplements-filter'));
    await waitFor(() => expect(screen.getByTestId('biology-filter-all')).toBeTruthy());
    expect(within(screen.getByTestId('biology-filter-all')).getByText('All Categories (2)')).toBeTruthy();
    expect(within(screen.getByTestId('biology-filter-Vitamin D')).getByText('Vitamin D (0)')).toBeTruthy();
    fireEvent.press(screen.getByTestId('biology-filter-Vitamin D'));
    await waitFor(() => expect(screen.getByText('No supplements in Vitamin D category.')).toBeTruthy());
    fireEvent.press(screen.getByTestId('biology-active-category-Minerals'));
    await waitFor(() => expect(screen.getByTestId('biology-supplement-s2')).toBeTruthy());
    expect(screen.queryByTestId('biology-supplement-s1')).toBeNull();
  });

  it('"Add Supplement" opens the empty form; the pencil opens it pre-filled; submit is write-disabled', async () => {
    const { wrapper, sb } = biologyWrapper();
    render(<MyBiologyScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('biology-supplements-add'));
    await waitFor(() => expect(screen.getByTestId('add-supplement-dialog-content')).toBeTruthy());
    expect(screen.getByText('Add a new supplement to your regimen')).toBeTruthy();
    expect(screen.getByTestId('supplement-form-name').props.value).toBe('');
    fireEvent.changeText(screen.getByTestId('supplement-form-name'), 'Zinc');
    expect(screen.getByTestId('supplement-form-submit').props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(screen.getByTestId('supplement-form-category'));
    await waitFor(() => expect(screen.getByText('Fatty Acids')).toBeTruthy());
    fireEvent.press(screen.getByTestId('supplement-form-cancel'));
    await gone('add-supplement-dialog-content');
    await waitFor(() => expect(screen.getByTestId('biology-supplement-edit-s1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('biology-supplement-edit-s1'));
    await waitFor(() => expect(screen.getByTestId('add-supplement-dialog-content')).toBeTruthy());
    expect(screen.getByText('Edit Supplement')).toBeTruthy();
    expect(screen.getByTestId('supplement-form-name').props.value).toBe(supplements[0].name);
    expect(screen.getByTestId('supplement-form-dosage').props.value).toBe('2000 IU');
    expect(screen.getByTestId('supplement-form-start-date').props.value).toBe('2026-01-10');
    expect(within(screen.getByTestId('supplement-form-submit')).getByText('Update Supplement')).toBeTruthy();
    fireEvent.press(screen.getByTestId('supplement-form-submit'));
    expect(sb.requests.filter((r) => r.method !== 'select')).toEqual([]);
    expect(sb.requests.filter((r) => r.table === 'user_supplements').every((r) => r.filters.some(([op, c, v]) => op === 'eq' && c === 'user_id' && v === USER_ID))).toBe(true);
  }, 30_000);
});
