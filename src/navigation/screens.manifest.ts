/**
 * VTID-02783: Screen Manifest — single source of truth for vitanaland routes.
 *
 * ▶ Adding a new screen — three steps, NO manual catalog edits:
 *
 *   1. Append a `ScreenManifestEntry` to `SCREEN_MANIFEST` below.
 *      Optional: `npm run nav:draft -- --path /comm/X --component XPage`
 *      drafts the i18n + aliases via Gemini Flash.
 *   2. Open a PR with your route registration in App.tsx + this manifest entry.
 *   3. After merge, the vitana-platform codegen workflow opens a follow-up
 *      PR with the regenerated navigation-catalog.ts block. Approve & merge.
 *
 * The codegen replaces hand-editing `vitana-platform/services/gateway/src/lib/
 * navigation-catalog.ts` for new community-surface entries. Hand-curated
 * entries (legacy + DEVHUB) stay outside the auto-managed markers.
 *
 * ▶ Seeding policy: This manifest seeds only NEW community screens going
 * forward (not the entire 150+ catalog). The hand-curated catalog block
 * remains the canonical record for everything pre-VTID-02783. As manifest
 * entries land, the codegen UNIONs them with the hand-curated block —
 * duplicate screen_ids cause CI to fail loud.
 *
 * ▶ Type contract: keep `screen-manifest-types.ts` in sync with
 * `services/gateway/src/lib/screen-manifest-types.ts` in vitana-platform.
 * CI fails the PR if they diverge.
 */

import type { ScreenManifestEntry } from './screen-manifest-types';

export const SCREEN_MANIFEST: ScreenManifestEntry[] = [
  // ── Example seed entry. Replace / append as new screens ship. ───────────
  // The codegen filters entries with screen_id starting `EXAMPLE.` so this
  // template never lands in the catalog. Replace with a real entry when the
  // first manifest-driven screen ships.
  {
    screen_id: 'EXAMPLE.MANIFEST_TEMPLATE',
    path: '/_manifest-template-do-not-route',
    category: 'community',
    access: 'authenticated',
    anonymous_safe: false,
    aliases: ['manifest-template'],
    priority: 0,
    i18n: {
      en: {
        title: 'Manifest Template (Example)',
        description:
          'Reference entry showing the shape required for new screens. Filtered out by codegen — never lands in the catalog.',
        when_to_visit:
          'Never. This is documentation. Real entries replace this when a developer adds the first manifest-driven screen.',
      },
      de: {
        title: 'Manifest-Vorlage (Beispiel)',
        description:
          'Referenz-Eintrag, der die für neue Bildschirme erforderliche Form zeigt. Wird vom Codegen herausgefiltert — landet nie im Katalog.',
        when_to_visit:
          'Niemals. Dies ist Dokumentation. Echte Einträge ersetzen dies, sobald ein Entwickler die erste manifestgesteuerte Anzeige hinzufügt.',
      },
    },
  },
];

export type { ScreenManifestEntry } from './screen-manifest-types';
