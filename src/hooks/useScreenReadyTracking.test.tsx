import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';

vi.mock('@/lib/screen-ready', () => ({ onRouteChange: vi.fn() }));

import { onRouteChange } from '@/lib/screen-ready';
import { useScreenReadyTracking } from './useScreenReadyTracking';

let go: (to: string) => void = () => undefined;
let bump: () => void = () => undefined;

function Probe() {
  useScreenReadyTracking();
  const navigate = useNavigate();
  const [, setN] = useState(0);
  go = navigate;
  bump = () => setN((n) => n + 1);
  return null;
}

describe('useScreenReadyTracking', () => {
  it('reports each pathname change once, with the time the new location was first rendered', () => {
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    render(
      <MemoryRouter initialEntries={['/home']}>
        <Probe />
      </MemoryRouter>,
    );
    expect(onRouteChange).toHaveBeenCalledTimes(1);
    expect(onRouteChange).toHaveBeenLastCalledWith('/home', 1000);

    // Re-render without a location change → nothing new.
    vi.spyOn(performance, 'now').mockReturnValue(2000);
    act(() => bump());
    expect(onRouteChange).toHaveBeenCalledTimes(1);

    vi.spyOn(performance, 'now').mockReturnValue(3000);
    act(() => go('/inbox'));
    expect(onRouteChange).toHaveBeenCalledTimes(2);
    expect(onRouteChange).toHaveBeenLastCalledWith('/inbox', 3000);

    // A search-only change is the same screen.
    act(() => go('/inbox?tab=groups'));
    expect(onRouteChange).toHaveBeenCalledTimes(2);
  });
});
