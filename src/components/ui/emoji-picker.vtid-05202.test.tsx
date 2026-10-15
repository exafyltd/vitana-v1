/**
 * VTID-05202 (chat-ux) — the emoji picker's "recent" tab is a persisted
 * most-recently-used list that always fills at least two rows.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { EmojiPicker } from './emoji-picker';

const KEY = 'vitana:emoji:recent:v1';

function openPicker(onSelect = vi.fn()) {
  render(<EmojiPicker onEmojiSelect={onSelect} />);
  fireEvent.click(screen.getAllByRole('button')[0]);
  return onSelect;
}

beforeEach(() => localStorage.clear());

describe('EmojiPicker recents (VTID-05202)', () => {
  it('fills at least two rows (16) from the seed for a new user', () => {
    openPicker();
    expect(document.querySelectorAll('.grid-cols-8 button').length).toBeGreaterThanOrEqual(16);
  });

  it('moves a picked emoji to the front, de-duplicated, and persists it', () => {
    const onSelect = openPicker();
    fireEvent.click(screen.getAllByText('🔥')[0]);
    expect(onSelect).toHaveBeenCalledWith('🔥');
    const stored = JSON.parse(localStorage.getItem(KEY) as string) as string[];
    expect(stored[0]).toBe('🔥');
    expect(stored.filter((e) => e === '🔥')).toHaveLength(1);
    expect(stored.length).toBeLessThanOrEqual(24);
  });

  it('still works when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    const onSelect = openPicker();
    fireEvent.click(screen.getAllByText('🔥')[0]);
    expect(onSelect).toHaveBeenCalledWith('🔥');
    spy.mockRestore();
  });
});
