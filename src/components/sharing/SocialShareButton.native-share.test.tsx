/**
 * VTID-04919 — the Share button always tries the native share drawer first
 * (checked at tap time), and opens the custom sheet only as a fallback.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useSocialPlatforms', () => ({ useSocialPlatforms: () => ({ allPlatforms: [], loading: false }) }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (_k: string, d: string) => d }) }));
vi.mock('@/lib/analytics', () => ({ analytics: { trackShare: vi.fn() } }));
vi.mock('@/components/sharing/PersonalShareButtons', () => ({ PersonalShareButtons: () => null }));
vi.mock('@/components/sharing/InstagramShareModal', () => ({ InstagramShareModal: () => null }));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div data-testid="share-dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import SocialShareButton from './SocialShareButton';

const renderButton = () =>
  render(
    <SocialShareButton
      type="live_room"
      data={{ title: 'Mariia’s Live Room', description: 'See you', link: 'https://x.test/room' }}
      variant="icon"
    />,
  );

const original = Object.getOwnPropertyDescriptor(navigator, 'share');

beforeEach(() => {
  // @ts-expect-error — remove navigator.share for the "absent at mount" case
  delete navigator.share;
});

afterEach(() => {
  if (original) Object.defineProperty(navigator, 'share', original);
  // @ts-expect-error — clean up a test-defined share
  else delete navigator.share;
});

describe('SocialShareButton native share', () => {
  it('uses navigator.share when it only appears after mount (app shell injection), without opening the sheet', async () => {
    renderButton(); // navigator.share is absent at mount
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share.mock.calls[0][0]).toMatchObject({ title: 'Mariia’s Live Room', url: 'https://x.test/room' });
    expect(screen.queryByTestId('share-dialog')).toBeNull();
  });

  it('does nothing more when the user dismisses the native drawer (AbortError)', async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('dismissed'), { name: 'AbortError' }));
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    renderButton();
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('share-dialog')).toBeNull();
  });

  it('opens the custom sheet when the native call is not allowed', async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('nope'), { name: 'NotAllowedError' }));
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    renderButton();
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByTestId('share-dialog')).toBeTruthy();
  });

  it('opens the custom sheet on a generic error', async () => {
    const share = vi.fn().mockRejectedValue(new Error('boom'));
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    renderButton();
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByTestId('share-dialog')).toBeTruthy();
  });

  it('opens the custom sheet when native share does not exist at all', async () => {
    renderButton();
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByTestId('share-dialog')).toBeTruthy();
  });
});
