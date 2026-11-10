/**
 * The Vitana Index sheet has one app-wide host (the signed-in layout), so the
 * `vitana:open-index` event opens it from any screen, e.g. the Index card in
 * Talk to Vitana. HealthScreen does not mount a second copy under the host.
 */
import '../helpers/no-network';
import './mocks';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { overlayBus } from '../../src/navigation/overlay-bus';
import { VitanaIndexHost } from '../../src/screens/health/VitanaIndexHost';
import { HealthScreen } from '../../src/screens/health/HealthScreen';
import { healthWrapper } from './helpers';

afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

describe('app-wide Vitana Index host', () => {
  it('the bus event opens the sheet from a screen that is not Health', async () => {
    const { wrapper } = healthWrapper();
    render(<VitanaIndexHost>{null}</VitanaIndexHost>, { wrapper });
    expect(overlayBus.listenerCount('vitana:open-index')).toBe(1);
    act(() => overlayBus.emit('vitana:open-index'));
    await waitFor(() => expect(screen.getByTestId('vitana-index-sheet-content')).toBeTruthy());
  });

  it('HealthScreen under the host does not add a second listener', () => {
    const { wrapper } = healthWrapper();
    render(
      <VitanaIndexHost>
        <HealthScreen />
      </VitanaIndexHost>,
      { wrapper },
    );
    expect(overlayBus.listenerCount('vitana:open-index')).toBe(1);
  });
});
