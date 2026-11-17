/**
 * Full emoji reactions — web. Pins the shared list (identical copies in
 * apps/mobile and the gateway); update all three together.
 */
import { describe, expect, it } from 'vitest';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { normalizeReactionEmoji, QUICK_REACTIONS, REACTION_EMOJIS, MAX_DISTINCT_REACTIONS_PER_USER } from './reactionEmoji';

const PINNED_SHA256 = 'cfc4c44c2c4b320462275ea7d8b428cc737fe2e88ce5b922e8a61555d5f5d1ae';

describe('reaction emoji set (web)', () => {
  it('matches the pinned shared list', () => {
    const raw = readFileSync(join(__dirname, 'reaction-emojis.json'));
    expect(createHash('sha256').update(raw).digest('hex')).toBe(PINNED_SHA256);
  });

  it('has the six quick reactions, the cap of six, and no duplicates', () => {
    expect(QUICK_REACTIONS).toEqual(['👍', '❤️', '😂', '😮', '🙏', '🎉']);
    expect(MAX_DISTINCT_REACTIONS_PER_USER).toBe(6);
    expect(new Set(REACTION_EMOJIS).size).toBe(REACTION_EMOJIS.length);
  });

  it('normalizes the legacy bare heart to the canonical heart', () => {
    expect(normalizeReactionEmoji('❤')).toBe('❤️');
    expect(normalizeReactionEmoji('🍎')).toBe('🍎');
    expect(normalizeReactionEmoji('nope')).toBeNull();
  });
});
