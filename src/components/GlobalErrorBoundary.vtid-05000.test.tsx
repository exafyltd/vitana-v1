// VTID-05000 — the error boundary's actions go through the stale-bundle recovery.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const recover = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/stale-bundle-recovery', () => ({
  autoRecoveryAllowed: vi.fn(() => false),
  markAutoRecovery: vi.fn(),
  clearAutoRecoveryMark: vi.fn(),
  recoverFromStaleBundle: (...a: unknown[]) => recover(...a),
}));
vi.mock('@/lib/notifDiag', () => ({ reportReactError: vi.fn() }));
vi.mock('@/lib/i18n-toast', () => ({ t: (k: string) => k }));

import { GlobalErrorBoundary } from './GlobalErrorBoundary';
import { autoRecoveryAllowed, markAutoRecovery } from '@/lib/stale-bundle-recovery';
import { reportReactError } from '@/lib/notifDiag';

function Boom(): never {
  throw new Error('Failed to fetch dynamically imported module: /assets/x.js');
}

describe('GlobalErrorBoundary recovery', () => {
  beforeEach(() => {
    recover.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('shows the translated chunk-error copy; Reload and Go Home use the recovery helper', () => {
    render(<GlobalErrorBoundary><Boom /></GlobalErrorBoundary>);
    expect(screen.getByText('screens.common.appUpdatedTitle')).toBeTruthy();
    expect(screen.getByText('screens.common.appUpdatedBody')).toBeTruthy();

    fireEvent.click(screen.getByText('screens.common.reloadPage'));
    expect(recover).toHaveBeenLastCalledWith();
    fireEvent.click(screen.getByText('screens.common.goHome'));
    expect(recover).toHaveBeenLastCalledWith('/');
  });

  it('does not auto-recover when the guard window is spent, and reports recovery_attempt=false', () => {
    render(<GlobalErrorBoundary><Boom /></GlobalErrorBoundary>);
    expect(recover).not.toHaveBeenCalled();
    expect(markAutoRecovery).not.toHaveBeenCalled();
    expect(vi.mocked(reportReactError).mock.calls.at(-1)?.[2]).toMatchObject({ recovery_attempt: false });
  });

  it('auto-recovers once when the guard allows it', () => {
    vi.mocked(autoRecoveryAllowed).mockReturnValueOnce(true);
    render(<GlobalErrorBoundary><Boom /></GlobalErrorBoundary>);
    expect(markAutoRecovery).toHaveBeenCalledTimes(1);
    expect(recover).toHaveBeenCalledTimes(1);
    expect(vi.mocked(reportReactError).mock.calls.at(-1)?.[2]).toMatchObject({ recovery_attempt: true });
  });
});
