/**
 * VTID-04859 — Founding 1000 celebration.
 *
 * Pins when the celebration shows (a seated member who has not seen it, never
 * during onboarding or on work surfaces) and that its only write — marking it
 * seen — happens when the member closes it, never on its own: staging writes
 * reach production data, and a read-only staging suite must not trigger it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { shouldCelebrate, isFoundingCelebrationSuppressed } from './founding-celebration-logic';

const SRC = readFileSync(join(__dirname, 'FoundingCelebration.tsx'), 'utf8');

describe('shouldCelebrate', () => {
  it('a seated member who has not seen it', () => {
    expect(shouldCelebrate({ ok: true, founding: true, max_seats: 1000, seat_number: 7, celebrated: false })).toBe(true);
  });
  it('never twice, never without a seat', () => {
    expect(shouldCelebrate({ ok: true, founding: true, max_seats: 1000, seat_number: 7, celebrated: true })).toBe(false);
    expect(shouldCelebrate({ ok: true, founding: false, max_seats: 1000 })).toBe(false);
    expect(shouldCelebrate(undefined)).toBe(false);
  });
});

describe('isFoundingCelebrationSuppressed', () => {
  it('waits until onboarding is finished', () => {
    expect(isFoundingCelebrationSuppressed('/onboarding/welcome')).toBe(true);
    expect(isFoundingCelebrationSuppressed('/_intro/maxina')).toBe(true);
  });
  it('stays off work surfaces', () => {
    for (const p of ['/commerce', '/admin/users', '/dev', '/staff/queue']) expect(isFoundingCelebrationSuppressed(p)).toBe(true);
  });
  it('shows on member screens', () => {
    for (const p of ['/home', '/wallet', '/community']) expect(isFoundingCelebrationSuppressed(p)).toBe(false);
  });
  it('matches whole segments only', () => {
    expect(isFoundingCelebrationSuppressed('/administration-guide')).toBe(false);
  });
});

describe('writes only on close', () => {
  it('marks the celebration only inside close()', () => {
    const calls = SRC.split('markFoundingCelebrated()').length - 1;
    expect(calls).toBe(1);
    const closeBody = SRC.slice(SRC.indexOf('const close = '), SRC.indexOf('if (!data || !shouldCelebrate(data))'));
    expect(closeBody).toContain('markFoundingCelebrated()');
  });
  it('waits for a signed-in member before reading', () => {
    expect(SRC).toContain('enabled: !!user?.id');
  });
  it('respects reduced motion', () => {
    expect(SRC).toContain('if (!reduceMotion) fireConfetti()');
  });
});
