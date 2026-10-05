// VTID-04900 — no What's New card promises a VTNA reward that does not pay.
//
// While the immediate Autopilot completion reward (AUTOPILOT_ACTION_REWARD_ENABLED,
// VTID-04899) and the sweep-paid live-room / Vitana Index rewards
// (REWARD_SWEEP_ENABLED, VTID-04896) are off in production, a card about them
// would announce earning that never happens — once, to every member, as a
// push. The VTID-04878 "vtna-earn-more-ways" entry was removed for that
// reason (owner decision 2026-10-05). When those rewards are switched on in
// production, announce them with a NEW entry (fresh id and `added` date) and
// update this guard in the same PR, deliberately.
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const DIR = path.resolve(__dirname, 'entries');
const entries = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({ file: f, json: JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) }));

const text = (e: { json: any }) =>
  JSON.stringify([e.json.title, e.json.description]).toLowerCase();

const MONEY = /vtna|verdien|earn|reward|belohn/;
const PAUSED = /autopilot|live[- ]?(room|raum)|vitana[- ]index|index[- ]best|bestmarke/;

describe('What\'s New never promises a paused VTNA reward', () => {
  it('the VTID-04878 "More ways to earn VTNA" card is gone', () => {
    expect(entries.map((e) => e.json.id)).not.toContain('vtna-earn-more-ways');
  });

  it('no entry pairs VTNA earning with an Autopilot, live-room or Vitana Index reward', () => {
    const offenders = entries.filter((e) => MONEY.test(text(e)) && PAUSED.test(text(e))).map((e) => e.file);
    expect(offenders).toEqual([]);
  });

  it('the guard itself catches the removed wording', () => {
    const removed = {
      json: {
        title: { en: 'More ways to earn VTNA', de: 'Mehr Wege, VTNA zu verdienen' },
        description: { en: 'Earn VTNA for Autopilot actions (up to 2 a day), 15 minutes with others in a live room…' },
      },
    };
    expect(MONEY.test(text(removed)) && PAUSED.test(text(removed))).toBe(true);
  });
});
