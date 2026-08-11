/**
 * Release Backlog & Versioning — frontend wire types (R4 from Phase 3a plan).
 *
 * Mirrors the JSON shape returned by `GET /api/v1/releases/overview` from the
 * vitana-platform gateway. See:
 *   - vitana-platform/specs/release-backlog-overview.md § 4
 *   - vitana-v1/docs/release-backlog-overview-screen.md § 6
 *
 * Used by:
 *   - src/pages/dev/DevReleases.tsx (Command Hub matrix view, R5)
 *   - src/pages/admin/Releases.tsx (tenant admin 3-tab screen, R10 — Phase 4)
 */

export type ReleaseChannel = 'internal' | 'beta' | 'stable';
export type Compatibility = 'ok' | 'behind' | 'breaking';
export type Surface =
  | 'command_hub'
  | 'web'
  | 'api'
  | 'sdk'
  | 'desktop'
  | 'ios'
  | 'android';

export type BacklogStatus =
  | 'proposed'
  | 'planned'
  | 'in_progress'
  | 'blocked'
  | 'done'
  | 'dropped';

export type BacklogVisibility = 'internal' | 'tenant' | 'public';

// -----------------------------------------------------------------------------
// Overview payload (Phase 2 endpoint)
// -----------------------------------------------------------------------------

export interface PlatformComponent {
  slug: string;
  display_name: string;
  current_version: string | null;
  current_channel: ReleaseChannel | null;
  current_released_at: string | null;
  pending_count: number;
}

export interface TenantSurface {
  slug: string;
  surface: Surface;
  current_version: string | null;
  current_channel: ReleaseChannel | null;
  min_platform_version: string | null;
  /** Computed server-side from platform.sdk version vs min/target pins (P2). */
  compatibility: Compatibility;
  pending_count: number;
}

export interface TenantRow {
  tenant_id: string;
  name: string;
  surfaces: TenantSurface[];
}

export interface ReleasesOverview {
  platform: PlatformComponent[];
  /** tenant_admin sees length 1 (self); developer/super-admin see all. */
  tenants: TenantRow[];
}

// -----------------------------------------------------------------------------
// History (Phase 4 endpoints)
// -----------------------------------------------------------------------------

export interface ReleaseHistoryEntry {
  id: string;
  component_slug: string;
  version: string;
  channel: ReleaseChannel;
  released_at: string;
  released_by_name: string | null;
  /** Markdown; published when channel='stable' AND component.public_changelog=TRUE. */
  changelog: string | null;
  /** Tenant role sees null — server strips. */
  internal_notes: string | null;
  artifact_url: string | null;
  rollback_of: string | null;
}

// -----------------------------------------------------------------------------
// Backlog items (Phase 4 endpoints)
// -----------------------------------------------------------------------------

export interface BacklogItem {
  id: string;
  component_slug: string;
  title: string;
  summary: string | null;
  vtid: string | null;
  /**
   * Effective status (P1: read-through for VTID-linked items).
   *   - vtid IS NULL  → local status field
   *   - vtid NOT NULL → vtid_ledger.status (read-only on this read path;
   *                     PATCH on this row's status returns 409)
   */
  effective_status: BacklogStatus;
  /** Whether this item is VTID-linked (UI uses this to disable status edit). */
  vtid_linked: boolean;
  target_version: string | null;
  target_channel: ReleaseChannel | null;
  /** Tenant role only sees 'tenant' | 'public' (server filters). */
  visibility: BacklogVisibility;
  priority: number;
}
