/**
 * VTID-04906 (LR-B) — rooms are private Daily rooms, so the join must carry
 * the meeting token from the gateway's `enter` call.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const join = vi.fn(() => Promise.resolve());
vi.mock('@daily-co/daily-js', () => ({
  default: {
    getCallInstance: () => null,
    createFrame: () => ({ on: vi.fn(), join, destroy: vi.fn() }),
  },
}));

import { DailyVideoRoom } from './DailyVideoRoom';

describe('DailyVideoRoom', () => {
  it('joins with url AND token', async () => {
    join.mockClear();
    render(<DailyVideoRoom roomUrl="https://x.daily.co/vitana-1" token="tok-1" />);
    await waitFor(() => expect(join).toHaveBeenCalledWith({ url: 'https://x.daily.co/vitana-1', token: 'tok-1' }));
  });

  it('joins with the url alone when no token is given', async () => {
    join.mockClear();
    render(<DailyVideoRoom roomUrl="https://x.daily.co/vitana-2" />);
    await waitFor(() => expect(join).toHaveBeenCalledWith({ url: 'https://x.daily.co/vitana-2' }));
  });
});
