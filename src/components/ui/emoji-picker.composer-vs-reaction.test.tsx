/**
 * The web composer picker (no `allowed`) shows every recent, including emojis outside the 181-emoji reaction set; a
 * reaction picker (`allowed={isSupportedReactionEmoji}`) hides them.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { EmojiPicker } from './emoji-picker';
import { isSupportedReactionEmoji } from '@/lib/reactions/reactionEmoji';

const SUNGLASSES = '\u{1F60E}';
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('vitana:emoji:recent:v1', JSON.stringify([SUNGLASSES, '\u{1F44D}']));
});

function open(allowed?: (e: string) => boolean) {
  render(<EmojiPicker onEmojiSelect={() => undefined} allowed={allowed} trigger={<button type="button">open</button>} />);
  fireEvent.click(screen.getByText('open'));
  return screen.getByTestId('emoji-picker-grid');
}

describe('web emoji picker: composer vs reaction', () => {
  it('composer (no filter) shows a recent outside the reaction set', () => {
    expect(within(open()).getByText(SUNGLASSES)).toBeTruthy();
  });
  it('reaction picker hides it and keeps supported recents', () => {
    const grid = open(isSupportedReactionEmoji);
    expect(within(grid).queryByText(SUNGLASSES)).toBeNull();
    expect(within(grid).getByText('\u{1F44D}')).toBeTruthy();
  });
});
