/**
 * VTID-05584 — avatars beside messages (owner decision 2026-11-06):
 * direct chats show none; in groups, own messages show none and other
 * people's first bubble keeps its avatar. The compact header keeps the
 * existing actions. Source guards: the rules are wired where they belong.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');
const conversation = read('./ConversationView.tsx');
const bubble = read('./MessageBubble.tsx');

describe('avatars beside messages (VTID-05584)', () => {
  it('ConversationView hides bubble avatars in direct threads', () => {
    expect(conversation).toMatch(/showAvatar=\{isGroupThread\}/);
  });

  it('MessageBubble never draws the sender avatar on own messages', () => {
    expect(bubble).toMatch(/showSenderHeader && !isOwnMessage && \(/);
  });
});

describe('compact conversation header (VTID-05584)', () => {
  it('uses a 32 px avatar in the header', () => {
    expect(conversation).toMatch(/className="h-8 w-8 shrink-0"/);
  });

  it('flips the back arrow in right-to-left layouts', () => {
    expect(conversation).toMatch(/<ArrowLeft className="w-4 h-4 rtl:rotate-180" \/>/);
  });

  it('keeps the direct-chat search action', () => {
    expect(conversation).toMatch(/data-testid="conversation-search-button"/);
  });
});
