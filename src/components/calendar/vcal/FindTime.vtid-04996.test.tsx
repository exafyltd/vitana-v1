// VTID-04996 — "Find a time": asks for the form's length, offers what comes back,
// hands the pick to the form, says so when nothing fits or the call fails.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const fetchMock = vi.fn();
let failNext = false;
vi.mock('@/lib/calendar-window-client', () => ({
  fetchFreeSlots: (...a: unknown[]) => (failNext ? Promise.reject(new Error('down')) : fetchMock(...a)),
}));
vi.mock('@/lib/i18n-toast', () => ({ t: (k: string) => k, getI18nLocale: () => 'en' }));

import { FindTime } from './FindTime';

const slot = (start: string, end: string) => ({ start, end, duration_minutes: 60, free_until: end });

beforeEach(() => {
  fetchMock.mockReset();
  failNext = false;
});

describe('FindTime (VTID-04996)', () => {
  it('asks only when the member taps, with the form length and role', async () => {
    fetchMock.mockResolvedValue([]);
    render(<FindTime durationMin={45} role="community" onPick={() => {}} />);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('vcal-find-time-ask'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(45, 'community'));
    expect(await screen.findByText('vcal.findTime.none')).toBeTruthy();
  });

  it('offers each slot and hands the picked one to the form', async () => {
    const a = slot('2026-10-12T08:00:00', '2026-10-12T09:00:00');
    const b = slot('2026-10-13T08:00:00', '2026-10-13T09:00:00');
    fetchMock.mockResolvedValue([a, b]);
    const onPick = vi.fn();
    render(<FindTime durationMin={60} role={null} onPick={onPick} />);
    fireEvent.click(screen.getByTestId('vcal-find-time-ask'));
    const chips = await screen.findAllByTestId('vcal-find-time-slot');
    expect(chips).toHaveLength(2);
    fireEvent.click(chips[1]);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0][0].getTime()).toBe(new Date(b.start).getTime());
    expect(onPick.mock.calls[0][1].getTime()).toBe(new Date(b.end).getTime());
  });

  it('leaves out a slot that runs past midnight (the form holds one date)', async () => {
    fetchMock.mockResolvedValue([slot('2026-10-12T23:30:00', '2026-10-13T00:30:00'), slot('2026-10-13T08:00:00', '2026-10-13T09:00:00')]);
    render(<FindTime durationMin={60} role={null} onPick={() => {}} />);
    fireEvent.click(screen.getByTestId('vcal-find-time-ask'));
    expect(await screen.findAllByTestId('vcal-find-time-slot')).toHaveLength(1);
  });

  it('says so when the call fails', async () => {
    failNext = true;
    render(<FindTime durationMin={60} role={null} onPick={() => {}} />);
    fireEvent.click(screen.getByTestId('vcal-find-time-ask'));
    expect(await screen.findByText('vcal.findTime.error')).toBeTruthy();
  });
});
