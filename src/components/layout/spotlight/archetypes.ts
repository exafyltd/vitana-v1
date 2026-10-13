/**
 * VTID-05105 — the nine Spotlight screen archetypes (docs/plans/desktop-spotlight,
 * contract §A). Every route maps to exactly one; the archetype decides the
 * layout width and whether a context rail exists.
 */
export const ARCHETYPES = [
  'focus-feed',
  'storefront',
  'detail',
  'collection',
  'dashboard',
  'conversation',
  'form',
  'workspace',
  'immersive',
] as const;

export type Archetype = (typeof ARCHETYPES)[number];

/** stage-rail = stage + optional context rail; wide = stage+gap+rail span; form = 680 px; full = whole main area. */
export type SpotlightWidth = 'stage-rail' | 'wide' | 'form' | 'full';

export const ARCHETYPE_WIDTH: Record<Archetype, SpotlightWidth> = {
  'focus-feed': 'stage-rail',
  storefront: 'wide',
  detail: 'stage-rail',
  collection: 'wide',
  dashboard: 'stage-rail',
  conversation: 'full',
  form: 'form',
  workspace: 'full',
  immersive: 'full',
};

/** Archetypes that must show exactly one `spotlight` VCard in the first viewport (SR-06). */
export const SINGLE_SPOTLIGHT_ARCHETYPES: readonly Archetype[] = ['focus-feed', 'storefront', 'detail', 'dashboard'];

export function isArchetype(value: unknown): value is Archetype {
  return typeof value === 'string' && (ARCHETYPES as readonly string[]).includes(value);
}
