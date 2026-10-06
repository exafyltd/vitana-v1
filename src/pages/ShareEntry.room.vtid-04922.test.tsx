/**
 * VTID-04922 — ?share=room&id=<roomId> sends people into the Live Room, synchronously.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ShareEntry from './ShareEntry';

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
}

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/" element={<ShareEntry fallback={<div data-testid="fallback" />} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

describe('ShareEntry share=room', () => {
  it('goes to the Live Rooms page with the room selected and keeps UTM params', () => {
    renderAt('/?share=room&id=abc-123&utm_source=whatsapp');
    const text = screen.getByTestId('where').textContent!;
    expect(text.startsWith('/comm/live-rooms?')).toBe(true);
    expect(text).toContain('live=abc-123');
    expect(text).toContain('utm_source=whatsapp');
    expect(text).not.toContain('share=');
  });

  it('keeps the event branch unchanged (id → /pub/events/<id>)', () => {
    renderAt('/?share=event&id=abc-123');
    expect(screen.getByTestId('where').textContent).toBe('/pub/events/abc-123');
  });
});
