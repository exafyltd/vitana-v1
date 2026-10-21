/**
 * VTID-05315 (messenger-ux-v2/ui-emoji-recents) — recent emojis are per member,
 * update at once, survive the session when storage fails, and the device-wide
 * list of VTID-05202 is handed to the first member who signs in.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { EmojiPicker, recentEmojiKey, loadRecentEmojis, recordRecentEmoji } from './emoji-picker';
import { AuthContext, type AuthContextValue } from '@/context/AuthContext';

const DEVICE_KEY = 'vitana:emoji:recent:v1';

function asMember(id: string | null, children: React.ReactNode) {
  const value = { user: id ? { id } : null, session: null, loading: false, signOut: vi.fn() } as unknown as AuthContextValue;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
function openPicker(userId: string | null, onSelect = vi.fn()) {
  render(asMember(userId, <EmojiPicker onEmojiSelect={onSelect} />));
  fireEvent.click(screen.getAllByRole('button')[0]);
  return onSelect;
}
function recentGrid(): string[] {
  return Array.from(document.querySelectorAll('.grid-cols-8 button')).map((b) => b.textContent || '');
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('per-member recent emojis (VTID-05315)', () => {
  it('member A\'s picks never show for member B on the same device', () => {
    openPicker('user-a');
    fireEvent.click(screen.getAllByText('🔥')[0]);
    cleanup();
    expect(JSON.parse(localStorage.getItem(recentEmojiKey('user-a'))!)).toBeTruthy();
    openPicker('user-b');
    expect(localStorage.getItem(recentEmojiKey('user-b'))).toBeNull();
    expect(recentGrid()[0]).toBe('😊'); // B sees the seed, not A's pick
  });

  it('a pick moves to the front of the recent tab at once (same picker, no reopen)', () => {
    openPicker('user-e');
    expect(recentGrid()[0]).toBe('😊');
    fireEvent.click(screen.getAllByText('✨')[0]);
    expect(recentGrid()[0]).toBe('✨');
  });

  it('the device-wide list becomes the first signed-in member\'s, once', () => {
    localStorage.setItem(DEVICE_KEY, JSON.stringify(['🚀', '🌈']));
    expect(loadRecentEmojis('user-a').slice(0, 2)).toEqual(['🚀', '🌈']);
    expect(localStorage.getItem(DEVICE_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(recentEmojiKey('user-a'))!)).toEqual(['🚀', '🌈']);
    expect(loadRecentEmojis('user-b')[0]).toBe('😊');
  });

  it('when storage fails, picks are kept in memory for the session', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceeded'); });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    recordRecentEmoji('🦄', 'user-c');
    expect(loadRecentEmojis('user-c')[0]).toBe('🦄');
    expect(loadRecentEmojis('user-d')[0]).toBe('😊');
  });

  it('without a signed-in member the device key is used (VTID-05202 behaviour)', () => {
    recordRecentEmoji('🔥', null);
    expect(JSON.parse(localStorage.getItem(DEVICE_KEY)!)[0]).toBe('🔥');
  });
});
