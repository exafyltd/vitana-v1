/**
 * VTID-05585 — the chat container has no CSS smooth scrolling. A smooth rule
 * would animate every programmatic scrollTop write, so opening a conversation
 * would visibly glide to the newest message.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('chat scroll container (VTID-05585)', () => {
  const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');
  const block = css.match(/\.chat-scroll\s*\{([^}]*)\}/);

  it('defines the .chat-scroll rule', () => {
    expect(block).not.toBeNull();
  });

  it('does not set scroll-behavior on .chat-scroll', () => {
    expect(block?.[1] ?? '').not.toMatch(/(?<![\w-])scroll-behavior/);
  });

  it('keeps overscroll containment', () => {
    expect(block?.[1] ?? '').toMatch(/overscroll-behavior:\s*contain/);
  });
});
