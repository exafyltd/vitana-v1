/** VTID-05649 — the start payload carries `guided_topic_id` only when a topic is focused (orb-widget.js:2594). */
import { buildStartPayload } from '../../../src/orb/protocol';

const base = { lang: 'de-DE', timeZone: 'Europe/Berlin', currentRoute: '/home' };

describe('buildStartPayload guided topic', () => {
  it('adds guided_topic_id when a topic is given', () => {
    expect(buildStartPayload({ ...base, guidedTopicId: 't1' })).toMatchObject({ guided_topic_id: 't1' });
  });

  it('without a topic the payload equals today’s payload (no key at all)', () => {
    const p = buildStartPayload(base);
    expect('guided_topic_id' in p).toBe(false);
    expect(buildStartPayload({ ...base, guidedTopicId: '' })).toEqual(p);
  });
});
