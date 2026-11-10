/**
 * VTID-05670 — a one-to-one conversation opens at its newest message and does not
 * move again. The unread divider marks the first unread message but is never
 * scrolled to on open: that second scroll was the visible hiccup.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(__dirname, 'ConversationView.tsx'), 'utf8');

describe('ConversationView opens at the newest message (VTID-05670)', () => {
  it('does not scroll to the unread divider after opening', () => {
    expect(src).not.toMatch(/divider\.getBoundingClientRect\(\)/);
    expect(src).not.toMatch(/el\.scrollTop = Math\.max\(0, top\)/);
  });

  it('still renders the unread divider as a marker', () => {
    expect(src).toMatch(/unread-divider-/);
  });
});
