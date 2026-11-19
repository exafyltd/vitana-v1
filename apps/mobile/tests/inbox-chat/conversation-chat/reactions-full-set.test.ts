/**
 * Full emoji reactions — mobile. The supported set is data/reaction-emojis.json
 * (identical to vitana-v1 src/lib/reactions/reaction-emojis.json and the gateway).
 * The pin must match those copies; update all three together.
 */
import './mocks';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { normalizeReactionEmoji, QUICK_REACTIONS, REACTION_EMOJIS } from '../../../src/screens/chat/data/reactionEmoji';
import { RECENT_SEED, EMOJI_CATEGORIES } from '../../../src/screens/chat/data/emojiRecents';

const PINNED_SHA256 = 'cfc4c44c2c4b320462275ea7d8b428cc737fe2e88ce5b922e8a61555d5f5d1ae';

describe('reaction emoji set (mobile)', () => {
  it('matches the pinned shared list', () => {
    const raw = readFileSync(join(__dirname, '../../../src/screens/chat/data/reaction-emojis.json'));
    expect(createHash('sha256').update(raw).digest('hex')).toBe(PINNED_SHA256);
  });

  it('keeps the six quick reactions first and uses the same set as the category tabs', () => {
    expect(QUICK_REACTIONS).toEqual(['👍', '❤️', '😂', '😮', '🙏', '🎉']);
    const fromCategories = new Set(Object.values(EMOJI_CATEGORIES).flat());
    for (const e of REACTION_EMOJIS) expect(fromCategories.has(e) || QUICK_REACTIONS.includes(e)).toBe(true);
  });

  it('normalizes the legacy bare heart and rejects unsupported input', () => {
    expect(normalizeReactionEmoji('❤')).toBe('❤️');
    expect(normalizeReactionEmoji('🍎')).toBe('🍎');
    expect(normalizeReactionEmoji('nope')).toBeNull();
  });

  it('the composer seed is unchanged; its emojis outside the reaction set are filtered only by the reaction sheet', () => {
    expect(RECENT_SEED).toHaveLength(16);
    expect(RECENT_SEED.filter((e) => normalizeReactionEmoji(e) === null)).toEqual(['\u{1F60E}', '\u{1F44F}', '\u{1F64C}', '\u{1F4AF}', '\u2728']);
  });
});
