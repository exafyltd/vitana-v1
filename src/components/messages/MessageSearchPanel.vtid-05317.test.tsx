/**
 * VTID-05317 (messenger-ux-v2/ui-message-search, R12) — the search panel:
 * filters reach the search, a chosen result is handed on (global: the panel
 * closes so the inbox can open it), keyboard, empty / error / too-short.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { MessageSearchFilters, MessageSearchResult, SearchStatus } from '@/hooks/useMessageSearch';

interface HookState {
  results: MessageSearchResult[];
  status: SearchStatus;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  tooShort: boolean;
}
const calls: Array<{ query: string; filters: MessageSearchFilters; enabled: boolean }> = [];
let state: HookState;
vi.mock('@/hooks/useMessageSearch', async (orig) => ({
  ...(await orig<typeof import('@/hooks/useMessageSearch')>()),
  useMessageSearch: (query: string, filters: MessageSearchFilters, enabled: boolean) => {
    calls.push({ query, filters, enabled });
    return state;
  },
}));

import MessageSearchPanel, { highlight } from './MessageSearchPanel';

const row = (id: string, key = 'dm:peer-1', snippet = `see the Hello note ${id}`): MessageSearchResult => ({
  message_id: id, conversation_key: key, sender_id: 'peer-1', created_at: '2026-10-20T10:00:00.000Z', snippet, message_type: 'text',
});
const last = () => calls[calls.length - 1];

beforeEach(() => {
  calls.length = 0;
  state = { results: [], status: 'idle', error: null, hasMore: false, loadMore: vi.fn(async () => undefined), tooShort: false };
});

function renderPanel(props: Partial<React.ComponentProps<typeof MessageSearchPanel>> = {}) {
  const onSelect = vi.fn();
  const onOpenChange = vi.fn();
  const utils = render(
    <MessageSearchPanel open scope="all" onSelect={onSelect} onOpenChange={onOpenChange} {...props} />,
  );
  return { ...utils, onSelect, onOpenChange };
}

describe('MessageSearchPanel', () => {
  it('passes the query, the scope and every filter to the search', () => {
    renderPanel({ scope: 'group:g1' });
    fireEvent.change(screen.getByTestId('message-search-input'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByTestId('message-search-filters-toggle')); // folded away in a conversation
    fireEvent.change(screen.getByTestId('message-search-type'), { target: { value: 'image' } });
    fireEvent.change(screen.getByTestId('message-search-from'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByTestId('message-search-to'), { target: { value: '2026-10-05' } });
    expect(last()).toEqual({
      query: 'hello',
      filters: { scope: 'group:g1', type: 'image', from: '2026-10-01', to: '2026-10-05' },
      enabled: true,
    });
  });

  it('global: shows each hit with its conversation and closes after handing the chosen one on', () => {
    state = { ...state, status: 'done', results: [row('m1'), row('m2', 'group:g1')] };
    const { onSelect, onOpenChange } = renderPanel({ conversationLabel: (k) => (k === 'group:g1' ? 'Hiking club' : 'Alex') });
    const items = screen.getAllByTestId('message-search-result');
    expect(items).toHaveLength(2);
    expect(items[1].textContent).toContain('Hiking club');
    fireEvent.click(items[1]);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ message_id: 'm2', conversation_key: 'group:g1' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keyboard: ↓ / ↑ move the selection, Enter opens it', () => {
    state = { ...state, status: 'done', results: [row('m1'), row('m2'), row('m3')] };
    const { onSelect } = renderPanel();
    const input = screen.getByTestId('message-search-input');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getAllByTestId('message-search-result')[1].getAttribute('aria-selected')).toBe('true');
    expect(input.getAttribute('aria-activedescendant')).toBe('message-search-result-1');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ message_id: 'm2' }));
  });

  it('in a conversation: older / newer step through the hits and the panel stays open', () => {
    state = { ...state, status: 'done', results: [row('newest'), row('middle'), row('oldest')] };
    const { onSelect, onOpenChange } = renderPanel({ scope: 'dm:peer-1' });
    fireEvent.click(screen.getByTestId('message-search-older'));
    fireEvent.click(screen.getByTestId('message-search-older'));
    fireEvent.click(screen.getByTestId('message-search-older'));
    // at the oldest hit with nothing more to load, "older" is disabled
    expect(screen.getByTestId('message-search-older')).toBeDisabled();
    fireEvent.click(screen.getByTestId('message-search-older'));
    fireEvent.click(screen.getByTestId('message-search-newer'));
    expect(onSelect.mock.calls.map(([r]) => r.message_id)).toEqual(['newest', 'middle', 'oldest', 'middle']);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('in a conversation: older past the last loaded hit fetches the next page, then selects it', () => {
    state = { ...state, status: 'done', results: [row('newest')], hasMore: true };
    const { onSelect, rerender } = renderPanel({ scope: 'dm:peer-1' });
    fireEvent.click(screen.getByTestId('message-search-older'));
    fireEvent.click(screen.getByTestId('message-search-older'));
    expect(state.loadMore).toHaveBeenCalledTimes(1);
    state = { ...state, status: 'loading' };
    rerender(<MessageSearchPanel open scope="dm:peer-1" onSelect={onSelect} onOpenChange={vi.fn()} />);
    state = { ...state, status: 'done', results: [row('newest'), row('older')], hasMore: false };
    rerender(<MessageSearchPanel open scope="dm:peer-1" onSelect={onSelect} onOpenChange={vi.fn()} />);
    expect(onSelect.mock.calls.map(([r]) => r.message_id)).toEqual(['newest', 'older']);
    expect(screen.getByTestId('message-search-older')).toBeDisabled();
  });

  it('in a conversation the panel is non-modal: no overlay over the messages', () => {
    renderPanel({ scope: 'dm:peer-1' });
    expect(document.querySelector('.bg-black\\/80')).toBeNull();
  });

  it('in a conversation: filters start folded, and a visible button closes the panel (touch has no Escape)', () => {
    const { onOpenChange } = renderPanel({ scope: 'dm:peer-1' });
    expect(screen.queryByTestId('message-search-filters')).toBeNull();
    fireEvent.click(screen.getByTestId('message-search-filters-toggle'));
    expect(screen.getByTestId('message-search-filters')).toBeTruthy();
    fireEvent.click(screen.getByTestId('message-search-close'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('global: the filters are shown', () => {
    renderPanel();
    expect(screen.getByTestId('message-search-filters')).toBeTruthy();
  });

  it('a pending "older" step is dropped when the query changes before the page lands', () => {
    state = { ...state, status: 'done', results: [row('a')], hasMore: true };
    const { onSelect, rerender } = renderPanel({ scope: 'dm:peer-1' });
    fireEvent.click(screen.getByTestId('message-search-older')); // selects a
    fireEvent.click(screen.getByTestId('message-search-older')); // asks for the next page
    fireEvent.change(screen.getByTestId('message-search-input'), { target: { value: 'other' } });
    state = { ...state, status: 'loading' };
    rerender(<MessageSearchPanel open scope="dm:peer-1" onSelect={onSelect} onOpenChange={vi.fn()} />);
    state = { ...state, status: 'done', results: [row('x'), row('y'), row('z')], hasMore: false };
    rerender(<MessageSearchPanel open scope="dm:peer-1" onSelect={onSelect} onOpenChange={vi.fn()} />);
    expect(onSelect.mock.calls.map(([r]) => r.message_id)).toEqual(['a']);
  });

  it('"Show more" keeps the keyboard position', () => {
    state = { ...state, status: 'done', results: [row('m1'), row('m2')], hasMore: true };
    const { rerender } = renderPanel();
    const input = screen.getByTestId('message-search-input');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    state = { ...state, results: [row('m1'), row('m2'), row('m3')], hasMore: false };
    rerender(<MessageSearchPanel open scope="all" onSelect={vi.fn()} onOpenChange={vi.fn()} />);
    expect(screen.getAllByTestId('message-search-result')[1].getAttribute('aria-selected')).toBe('true');
  });

  it('is a combobox over the result listbox, with a short live count', () => {
    state = { ...state, status: 'done', results: [row('m1')] };
    renderPanel();
    const input = screen.getByTestId('message-search-input');
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe('message-search-results');
    expect(screen.getByRole('status').textContent).toMatch(/: 1$/);
  });

  it('an empty page with more to load shows "Show more", not "no messages"', () => {
    state = { ...state, status: 'done', results: [], hasMore: true };
    renderPanel();
    expect(screen.queryByTestId('message-search-empty')).toBeNull();
    expect(screen.getByTestId('message-search-more')).toBeTruthy();
  });

  it('shows the empty, error and too-short states', () => {
    state = { ...state, status: 'done', results: [] };
    const { rerender } = renderPanel();
    expect(screen.getByTestId('message-search-empty')).toBeTruthy();

    state = { ...state, status: 'error', error: 'boom' };
    rerender(<MessageSearchPanel open scope="all" onSelect={vi.fn()} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('message-search-error')).toBeTruthy();
    expect(screen.queryByTestId('message-search-empty')).toBeNull();

    state = { ...state, status: 'idle', error: null, tooShort: true };
    rerender(<MessageSearchPanel open scope="all" onSelect={vi.fn()} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('message-search-too-short')).toBeTruthy();
  });

  it('"Show more" loads the next page', () => {
    state = { ...state, status: 'done', results: [row('m1')], hasMore: true };
    renderPanel();
    fireEvent.click(screen.getByTestId('message-search-more'));
    expect(state.loadMore).toHaveBeenCalledTimes(1);
  });

  it('does not search while closed', () => {
    renderPanel({ open: false });
    expect(calls.every((c) => c.enabled === false)).toBe(true);
  });
});

describe('highlight', () => {
  it('marks every case-insensitive occurrence, literally', () => {
    const { container } = render(<p>{highlight('Hello there, hello (again)', 'hello')}</p>);
    expect(Array.from(container.querySelectorAll('mark')).map((m) => m.textContent)).toEqual(['Hello', 'hello']);
    const { container: c2 } = render(<p>{highlight('a (b) c', '(b)')}</p>);
    expect(c2.querySelector('mark')?.textContent).toBe('(b)');
  });

  it('keeps the marks on the original text when lower-casing changes its length (Turkish İ)', () => {
    const { container } = render(<p>{highlight('İstanbul merhaba', 'merhaba')}</p>);
    expect(container.querySelector('mark')?.textContent).toBe('merhaba');
    expect(container.textContent).toBe('İstanbul merhaba');
  });
});
