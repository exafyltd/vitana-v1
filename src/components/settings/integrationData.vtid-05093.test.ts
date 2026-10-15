/**
 * VTID-05093 (Health Hub D10, WP2): the mobile Connected Apps health list gets
 * its lab partners from the gateway (GET /api/v1/health/consents `partners`),
 * each connected only with an active per-partner consent.
 */
import { describe, it, expect } from 'vitest';
import { healthIntegrations, mergeLabPartners } from './integrationData';

const SYNC = 'Lab results and biomarkers';

describe('mergeLabPartners (VTID-05093)', () => {
  const catalogueLab = healthIntegrations.find((i) => i.labPartner)!;

  it('keeps a catalogue partner only while the gateway lists it, and appends every other listed partner', () => {
    const merged = mergeLabPartners(
      healthIntegrations,
      [
        { partner_key: catalogueLab.id, display_name: 'Listed Name' },
        { partner_key: 'labnord', display_name: 'Labor Nord' },
      ],
      (key) => key === 'labnord',
      SYNC,
    );
    const labs = merged.filter((i) => i.labPartner);
    expect(labs.map((i) => [i.id, i.name, i.connected])).toEqual([
      [catalogueLab.id, 'Listed Name', false],
      ['labnord', 'Labor Nord', true],
    ]);
    expect(labs.find((i) => i.id === 'labnord')).toMatchObject({ category: 'health', comingSoon: false, syncData: SYNC });
    // Non-partner entries are untouched.
    expect(merged.filter((i) => !i.labPartner)).toEqual(healthIntegrations.filter((i) => !i.labPartner));
  });

  it('shows no partner at all when the gateway lists none (fail closed, never assumed connected)', () => {
    const merged = mergeLabPartners(healthIntegrations, [], () => true, SYNC);
    expect(merged.some((i) => i.labPartner)).toBe(false);
  });
});
