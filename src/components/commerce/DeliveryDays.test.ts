/**
 * VTID-03894 — delivery times, and the distinction that makes this worth a test.
 *
 * "The supplier did not answer" and "the supplier delivers same day" are
 * different facts. The form holds strings, the column holds an integer, and
 * the naive conversion (`Number('')` is 0) turns the first into the second —
 * silently promising every buyer same-day delivery from a merchant who simply
 * skipped an optional field.
 *
 * So an unanswered region is OMITTED from the payload entirely, leaving the
 * column null, which is what every merchant row holds today.
 *
 * Bounds mirror catalog-ingest's own schema (0-120, integer) so a
 * supplier-entered value and a feed-entered value cannot disagree about what
 * is legal.
 */
import { describe, expect, it } from 'vitest';
import { deliveryDaysPayload } from './AddProductSheet';

const NONE = { eu: '', us: '', mena: '' };

describe('delivery days payload', () => {
  it('omits an unanswered region rather than sending 0', () => {
    // The whole point: Number('') === 0, and 0 means "same day".
    expect(deliveryDaysPayload(NONE)).toEqual({});
  });

  it('sends only the regions actually answered', () => {
    expect(deliveryDaysPayload({ ...NONE, eu: '3' })).toEqual({ avg_delivery_days_eu: 3 });
  });

  it('maps each region to its own column', () => {
    expect(deliveryDaysPayload({ eu: '2', us: '9', mena: '14' })).toEqual({
      avg_delivery_days_eu: 2,
      avg_delivery_days_us: 9,
      avg_delivery_days_mena: 14,
    });
  });

  it('keeps a real zero — same-day delivery is a legitimate answer', () => {
    // Distinct from the blank case above, and the reason blank is not 0.
    expect(deliveryDaysPayload({ ...NONE, eu: '0' })).toEqual({ avg_delivery_days_eu: 0 });
  });

  it('tolerates whitespace around a number', () => {
    expect(deliveryDaysPayload({ ...NONE, us: '  5  ' })).toEqual({ avg_delivery_days_us: 5 });
  });

  it('drops anything the gateway would reject rather than sending a 400', () => {
    // Its zod schema is int, 0..120. Sending 1.5 or 999 fails the whole
    // merchant save, taking the product with it — over one optional field.
    expect(deliveryDaysPayload({ ...NONE, eu: '1.5' })).toEqual({});
    expect(deliveryDaysPayload({ ...NONE, eu: '121' })).toEqual({});
    expect(deliveryDaysPayload({ ...NONE, eu: '-1' })).toEqual({});
    expect(deliveryDaysPayload({ ...NONE, eu: 'soon' })).toEqual({});
  });

  it('drops only the bad region, keeping the good ones', () => {
    expect(deliveryDaysPayload({ eu: '4', us: 'nope', mena: '' })).toEqual({
      avg_delivery_days_eu: 4,
    });
  });

  it('accepts the exact bounds', () => {
    expect(deliveryDaysPayload({ ...NONE, mena: '120' })).toEqual({ avg_delivery_days_mena: 120 });
  });
});
