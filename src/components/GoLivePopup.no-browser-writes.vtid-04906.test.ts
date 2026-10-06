/**
 * VTID-04906 (LR-B) / VTID-04907 (LR-C) — Go Live recovers a stuck room
 * through the gateway `/cancel` only and surfaces its error; it no longer
 * force-resets live_rooms / live_room_sessions from the browser (a silent
 * no-op under RLS), no longer provisions a public Daily URL, and no longer
 * offers "Followers only" (rejected by the gateway and the DB check).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ACCESS_LEVEL_IDS } from './GoLivePopup';

const SRC = readFileSync(join(__dirname, 'GoLivePopup.tsx'), 'utf8');

describe('GoLivePopup', () => {
  it('never writes live_rooms or live_room_sessions from the browser', () => {
    expect(SRC).not.toMatch(/\.from\('live_room_sessions'\)/);
    expect(SRC).not.toMatch(/\.from\('live_rooms'\)/);
  });

  it('surfaces the gateway cancel error instead of swallowing it', () => {
    const idx = SRC.indexOf('cancelRoom(effectiveRoomId');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 900);
    expect(after).toContain("'liveRooms.goLivePopup.errors.cancelFailedDesc'");
    expect(after).toContain('return;');
  });

  it('leaves the Daily room to the viewer (enter), not a public /daily URL', () => {
    expect(SRC).not.toContain('createDailyRoom');
    expect(SRC).not.toContain('daily_room_url: dailyUrl');
  });

  it('offers only public and group access', () => {
    expect([...ACCESS_LEVEL_IDS]).toEqual(['public', 'group']);
  });

  it('has no hardcoded English toast text or default title', () => {
    expect(SRC).not.toContain('Live with [Name]');
    expect(SRC).not.toContain('Room stuck');
    expect(SRC).not.toContain('`Failed to create permanent room');
  });
});
