/**
 * VTID-03982 — dev/automation accounts (claude-code-agent@exafy.io,
 * operator-autopilot@exafy.io) must never surface as a community member's
 * chat thread. A 2026-09-16 bootstrap step had each of those two accounts
 * send a "Hello! My name is ..." intro DM to every community member,
 * landing a dev-only thread in 222+ real users' inboxes.
 *
 * `isRealPeer()` gates all three thread-building sources in this file
 * (legacy `global_message_threads`, the direct `chat_messages` fallback,
 * and the gateway `/conversations` response) — pinned at the source level,
 * matching this file's established test pattern (see the sibling
 * useGlobalMessages.legacy-threads-error-logging.test.ts).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'useGlobalMessages.ts'), 'utf8');

describe('useGlobalMessages — dev/automation account filtering', () => {
  it('imports isDevServiceAccount from the shared devServiceAccounts module', () => {
    expect(SRC).toContain("import { isDevServiceAccount } from '@/lib/devServiceAccounts';");
  });

  it('isRealPeer() rejects a dev/automation account before anything else', () => {
    const idx = SRC.indexOf('function isRealPeer(');
    expect(idx).toBeGreaterThan(-1);
    const body = SRC.slice(idx, idx + 500);
    expect(body).toMatch(/if \(!peerId\) return false;\s*\n\s*if \(isDevServiceAccount\(peerId\)\) return false;/);
  });

  it('stripUnknownUserThreads() also drops a cached/persisted dev-account thread', () => {
    const idx = SRC.indexOf('function stripUnknownUserThreads');
    expect(idx).toBeGreaterThan(-1);
    const body = SRC.slice(idx, idx + 700);
    expect(body).toContain('if (isDevServiceAccount(peer.user_id)) return false;');
  });
});
