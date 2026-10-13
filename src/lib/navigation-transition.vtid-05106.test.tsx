/**
 * VTID-05106 — Phase 1b prototype gate (.kiro/specs/desktop-spotlight/tasks.md 1b.1).
 *
 * Proves, with the router and React versions this app ships, that
 * `future={{ v7_startTransition: true }}` keeps the current page mounted while a
 * lazy route chunk loads, so the route <Suspense> fallback (RouteFallback →
 * full-screen DelayedLoader) never replaces it. The control case pins the
 * opposite: without the flag the same navigation shows the fallback. If the
 * first case ever fails, Phase 1b stops and the plan is re-sparred.
 */
import { lazy, Suspense, type ComponentType } from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

function deferredChunk() {
  let resolve!: (mod: { default: ComponentType }) => void;
  const promise = new Promise<{ default: ComponentType }>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function Home() {
  const navigate = useNavigate();
  return (
    <div>
      <p>home page</p>
      <button type="button" onClick={() => navigate('/next')}>
        go
      </button>
    </div>
  );
}

function renderApp(startTransition: boolean) {
  const chunk = deferredChunk();
  const Next = lazy(() => chunk.promise);
  render(
    <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: startTransition, v7_relativeSplatPath: true }}>
      <Suspense fallback={<p>route fallback</p>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/next" element={<Next />} />
        </Routes>
      </Suspense>
    </MemoryRouter>,
  );
  return chunk;
}

describe('VTID-05106: v7_startTransition keeps the old screen during a lazy route load', () => {
  it('with the flag: the old page stays mounted and the route fallback never shows', async () => {
    const chunk = renderApp(true);
    await act(async () => {
      screen.getByRole('button', { name: 'go' }).click();
    });
    expect(screen.getByText('home page')).toBeVisible();
    expect(screen.queryByText('route fallback')).toBeNull();

    await act(async () => {
      chunk.resolve({ default: () => <p>next page</p> });
      await chunk.promise;
    });
    expect(await screen.findByText('next page')).toBeTruthy();
    expect(screen.queryByText('home page')).toBeNull();
    expect(screen.queryByText('route fallback')).toBeNull();
  });

  it('without the flag (control): the same navigation replaces the page with the fallback', async () => {
    const chunk = renderApp(false);
    await act(async () => {
      screen.getByRole('button', { name: 'go' }).click();
    });
    expect(screen.getByText('route fallback')).toBeVisible();
    // React 18 keeps the suspended subtree in the DOM but hides it (display: none).
    expect(screen.getByText('home page')).not.toBeVisible();

    await act(async () => {
      chunk.resolve({ default: () => <p>next page</p> });
      await chunk.promise;
    });
    expect(await screen.findByText('next page')).toBeTruthy();
  });
});
