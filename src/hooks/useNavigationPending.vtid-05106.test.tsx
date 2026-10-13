/**
 * VTID-05106 — useNavigationPending + NavProgressBar under the real
 * <BrowserRouter future={{ v7_startTransition: true }}>: pending while a lazy
 * route chunk loads (old screen still shown), cleared once it commits; the bar
 * only appears when the switch is slower than its delay.
 */
import { lazy, Suspense, type ComponentType } from 'react';
import { act, render, screen } from '@testing-library/react';
import { BrowserRouter, Link, Routes, Route } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { useNavigationPending } from './useNavigationPending';
import { NavProgressBar } from '@/components/layout/NavProgressBar';

function Probe() {
  const pending = useNavigationPending('/');
  return (
    <>
      <output data-testid="pending">{String(pending)}</output>
      <NavProgressBar pending={pending} delayMs={20} />
    </>
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

afterEach(() => window.history.replaceState(null, '', '/'));

describe('VTID-05106: useNavigationPending', () => {
  it('is true while the lazy route loads and false once it commits; the bar shows only for slow switches', async () => {
    window.history.replaceState(null, '', '/');
    let resolve!: (m: { default: ComponentType }) => void;
    const chunk = new Promise<{ default: ComponentType }>((r) => (resolve = r));
    const Next = lazy(() => chunk);

    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Probe />
        <Suspense fallback={<p>route fallback</p>}>
          <Routes>
            <Route path="/" element={<Link to="/next">go</Link>} />
            <Route path="/next" element={<Next />} />
          </Routes>
        </Suspense>
      </BrowserRouter>,
    );
    expect(screen.getByTestId('pending').textContent).toBe('false');

    await act(async () => {
      screen.getByRole('link', { name: 'go' }).click();
      await wait(5);
    });
    expect(screen.getByTestId('pending').textContent).toBe('true');
    expect(screen.getByRole('link', { name: 'go' })).toBeVisible();
    expect(screen.queryByText('route fallback')).toBeNull();
    expect(screen.queryByTestId('nav-progress')).toBeNull();

    await act(async () => {
      await wait(40);
    });
    expect(screen.getByTestId('nav-progress').dataset.phase).toBe('running');

    await act(async () => {
      resolve({ default: () => <p>next page</p> });
      await chunk;
      await wait(5);
    });
    expect(screen.getByText('next page')).toBeTruthy();
    expect(screen.getByTestId('pending').textContent).toBe('false');
    await act(async () => {
      await wait(300);
    });
    expect(screen.queryByTestId('nav-progress')).toBeNull();
  });
});
