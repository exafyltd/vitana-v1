/** VTID-04795 — business-level sales setup sends only what the supplier set. */
import { describe, expect, it } from 'vitest';
import { deliveryFromSimple, salesDraftValid, salesPayload, verticalForOrgType, EMPTY_DELIVERY } from './commerce-sales';
import { addOrgProduct } from './commerce-catalogue';

const blank = { storefrontUrl: '', network: null, advertiserId: '', delivery: EMPTY_DELIVERY };

describe('salesPayload', () => {
  it('sends nothing for an untouched sheet — an existing Awin setup can never be reset', () => {
    expect(salesPayload(blank)).toEqual({});
  });
  it('sends the shop website, network and id only when given', () => {
    expect(salesPayload({ ...blank, storefrontUrl: 'https://a.example', network: 'awin', advertiserId: ' 123 ' })).toEqual({
      storefront_url: 'https://a.example', affiliate_network: 'awin', affiliate_advertiser_id: '123',
    });
    expect(salesPayload({ ...blank, network: 'other' })).toEqual({ affiliate_network: 'other' });
  });
  it('a named network needs its advertiser id', () => {
    expect(salesDraftValid({ ...blank, network: 'admitad' })).toBe(false);
    expect(salesDraftValid({ ...blank, network: 'other' })).toBe(true);
    expect(salesDraftValid(blank)).toBe(true);
  });
});

describe('deliveryFromSimple', () => {
  it('one typical time applies to the regions chosen', () => {
    expect(deliveryFromSimple(['eu'], '3', null)).toEqual({ eu: '3', us: '', mena: '' });
  });
  it('worldwide means every stored region', () => {
    expect(deliveryFromSimple(['world'], '7', null)).toEqual({ eu: '7', us: '7', mena: '7' });
  });
  it('per-region overrides only where given, the typical time elsewhere', () => {
    expect(deliveryFromSimple(['eu', 'us'], '3', { eu: '', us: '9', mena: '20' })).toEqual({ eu: '3', us: '9', mena: '' });
  });
  it('ends up as whole days in the merchant columns', () => {
    expect(salesPayload({ ...blank, delivery: deliveryFromSimple(['world'], '5', null) })).toEqual({
      avg_delivery_days_eu: 5, avg_delivery_days_us: 5, avg_delivery_days_mena: 5,
    });
  });
});

describe('verticalForOrgType', () => {
  it('maps what the business offers to a catalog vertical, never failing on unknown', () => {
    expect(verticalForOrgType('supplements_nutrition')).toBe('supplements');
    expect(verticalForOrgType('travel_tourism')).toBe('services');
    expect(verticalForOrgType('general_commerce')).toBe('other');
    expect(verticalForOrgType(null)).toBe('other');
  });
});

describe('addOrgProduct', () => {
  it('saves to the business; creates its shop record only when missing, then retries once', async () => {
    const calls: string[] = [];
    let first = true;
    await addOrgProduct('o1', { title: 'x' }, 'supplements', async (path, init) => {
      calls.push(`${init?.method} ${path}`);
      if (path.endsWith('/products') && first) { first = false; throw new Error('NO_MERCHANT'); }
      return {};
    });
    expect(calls).toEqual([
      'POST /api/v1/partner-onboarding/o1/catalogue/products',
      'PUT /api/v1/partner-onboarding/o1/catalogue/merchant',
      'POST /api/v1/partner-onboarding/o1/catalogue/products',
    ]);
  });
  it('any other error surfaces as is', async () => {
    await expect(addOrgProduct('o1', {}, 'other', async () => { throw new Error('invalid_product'); })).rejects.toThrow('invalid_product');
  });
});
