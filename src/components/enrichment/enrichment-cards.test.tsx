/**
 * VTID-05085 — the 11 enrichment cards (E1–E11): each renders in the shared
 * shell, its button fires its action, and its X dismisses.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import type { ComponentType } from 'react';
import type { VitanaCardProps } from '@/components/vitana/card-props';

const refresh = vi.fn();
const instagram = vi.fn();
const facebook = vi.fn();
const pushInit = vi.fn();
const pushSubscribe = vi.fn();
const appilix = { on: false };
const registerIdentity = vi.fn();
const notifySuccess = vi.fn();
const notifyError = vi.fn();

vi.mock('@/hooks/useEnrichmentCards', () => ({
  useInvalidateEnrichmentCards: () => refresh,
  useEnrichmentCardDismiss: () => vi.fn(),
}));
vi.mock('@/hooks/useGoogleConnect', () => ({
  useStartInstagramConnect: () => ({ mutate: instagram, isPending: false }),
  useStartFacebookConnect: () => ({ mutate: facebook, isPending: false }),
}));
vi.mock('@/lib/pushNotifications', () => ({
  pushNotificationManager: { initialize: () => pushInit(), subscribe: () => pushSubscribe() },
}));
vi.mock('@/lib/appilix', () => ({ isAppilix: () => appilix.on, registerAppilixIdentity: (id: string) => registerIdentity(id) }));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/lib/i18n-toast', async (orig) => ({
  ...(await orig<typeof import('@/lib/i18n-toast')>()),
  notifySuccess: (...a: unknown[]) => notifySuccess(...a),
  notifyError: (...a: unknown[]) => notifyError(...a),
}));
vi.mock('@/components/CreateContentPopup', () => ({
  CreateContentPopup: ({ isOpen, initialType }: { isOpen: boolean; initialType?: string }) =>
    isOpen ? <div data-testid="composer-desktop">{initialType}</div> : null,
}));
vi.mock('@/components/profile/mobile/MobileCreatePostSheet', () => ({
  MobileCreatePostSheet: ({ open }: { open: boolean }) => (open ? <div data-testid="composer-mobile" /> : null),
}));
vi.mock('@/components/profile/InterestsPicker', () => ({
  InterestsPicker: ({ open, onSaved }: { open: boolean; onSaved?: () => void }) =>
    open ? (
      <button type="button" data-testid="interests-picker" onClick={() => onSaved?.()}>
        picker
      </button>
    ) : null,
}));

import { VITANA_CARD_REGISTRY } from '@/components/vitana/card-registry';
import { ENRICHMENT_CARD_TYPES, CARD_DEEP_LINKS, type VitanaCardType } from '@/components/vitana/vitana-card-catalog';
import de from '@/i18n/de/screens.json';

const deCards = (de as { screens: { vitanaCards: Record<string, { title: string; action: string }> } }).screens.vitanaCards;

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.hash}</div>;
}

function renderCard(type: VitanaCardType, props: VitanaCardProps = {}) {
  const Card = VITANA_CARD_REGISTRY[type] as ComponentType<VitanaCardProps>;
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <Routes>
        <Route path="/home" element={<Card {...props} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

const action = (type: VitanaCardType) => screen.getByTestId(`vitana-card-action-${type}`);

beforeEach(() => {
  [refresh, instagram, facebook, pushInit, pushSubscribe, registerIdentity, notifySuccess, notifyError].forEach((f) => f.mockReset());
  appilix.on = false;
});

describe('enrichment cards E1–E11', () => {
  it('every enrichment card type has a component', () => {
    for (const type of ENRICHMENT_CARD_TYPES) expect(VITANA_CARD_REGISTRY[type], type).toBeTruthy();
  });

  it.each(ENRICHMENT_CARD_TYPES)('%s renders in the Vitana shell with its German copy and an accessible action', (type) => {
    renderCard(type, { onDismiss: () => {} });
    expect(screen.getByText(deCards[type].title)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: deCards[type].action })).toBe(action(type));
    expect(screen.getByAltText('Vitana')).toBeInTheDocument();
  });

  it.each(ENRICHMENT_CARD_TYPES)('%s: the X calls onDismiss', (type) => {
    const onDismiss = vi.fn();
    renderCard(type, { onDismiss });
    fireEvent.click(screen.getByRole('button', { name: 'Karte ausblenden' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('a card without onDismiss shows no X', () => {
    renderCard('E1');
    expect(screen.queryByRole('button', { name: 'Karte ausblenden' })).toBeNull();
  });

  it('the server-localized title and description win over the catalog copy', () => {
    renderCard('E2', { title: 'Server title', description: 'Server text' });
    expect(screen.getByText('Server title')).toBeInTheDocument();
    expect(screen.getByText('Server text')).toBeInTheDocument();
  });

  it.each(['E1', 'E2', 'E5', 'E8', 'E9', 'E11'] as const)('%s navigates to its deep link', (type) => {
    renderCard(type);
    fireEvent.click(action(type));
    expect(screen.getByTestId('where').textContent).toBe(CARD_DEEP_LINKS[type]);
  });

  it('E3 opens the existing post composer (no route)', () => {
    renderCard('E3');
    fireEvent.click(action('E3'));
    expect(screen.getByTestId('composer-desktop').textContent).toBe('post');
  });

  it('E4 opens the interests picker; saving re-reads the card state', () => {
    renderCard('E4');
    fireEvent.click(action('E4'));
    fireEvent.click(screen.getByTestId('interests-picker'));
    expect(refresh).toHaveBeenCalled();
  });

  it('E6 / E7 start the Instagram / Facebook OAuth flow', () => {
    renderCard('E6');
    fireEvent.click(action('E6'));
    expect(instagram).toHaveBeenCalledTimes(1);
    renderCard('E7');
    fireEvent.click(action('E7'));
    expect(facebook).toHaveBeenCalledTimes(1);
  });

  it('E6: a failed OAuth start shows a translated error', () => {
    instagram.mockImplementation((_v: unknown, opts: { onError: () => void }) => opts.onError());
    renderCard('E6');
    fireEvent.click(action('E6'));
    expect(notifyError).toHaveBeenCalledWith('toasts.vitanaCards.connectFailed');
  });

  it('E10 in a browser: initialize + subscribe, success toast, card state re-read', async () => {
    pushInit.mockResolvedValue(true);
    pushSubscribe.mockResolvedValue('fcm-token');
    renderCard('E10');
    fireEvent.click(action('E10'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('toasts.vitanaCards.notificationsEnabled'));
    expect(pushInit).toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
  });

  it('E10 in the Appilix app: re-sends the identity and subscribes', async () => {
    appilix.on = true;
    pushSubscribe.mockResolvedValue(null);
    renderCard('E10');
    fireEvent.click(action('E10'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('toasts.vitanaCards.notificationsFailed'));
    expect(registerIdentity).toHaveBeenCalledWith('user-1');
    expect(pushInit).not.toHaveBeenCalled();
  });

  it('tapping the card body runs the same action as the button', () => {
    renderCard('E1');
    fireEvent.click(screen.getByText(deCards.E1.title));
    expect(screen.getByTestId('where').textContent).toBe('/me/profile#avatar');
  });
});
