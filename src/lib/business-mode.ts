/**
 * VTID-03999 — business modes on mobile.
 *
 * A business membership (`partner_organization_members.role`, read via
 * `GET /api/v1/partner-orgs/mine`) is an axis of its own, deliberately never
 * mapped onto the Vitana role ladder: the platform's `staff` role passes
 * `AdminGuard` (Community Supervision) and enables news-post moderation, so
 * handing it to an external business's employee would leak platform powers
 * (owner decision, 2026-09-17). Instead a business role is a switchable
 * MODE whose home is the business area of the app, and "being in that mode"
 * is route-based: on a business route with an active org selected.
 *
 * Everything here is pure so it can be unit-tested and shared by the
 * switcher sheet, the drawer and the bottom bar without three copies
 * drifting apart (the VTID-03644 lesson).
 */
import { FlaskConical, Inbox, LayoutDashboard, Mail, Settings, Users, type LucideIcon } from 'lucide-react';

export type BusinessRole = 'org_admin' | 'staff' | 'professional';

export interface BusinessOrgLike {
  id: string;
  display_name: string;
  role: string;
}

export interface BusinessNavItem {
  id: string;
  path: string;
  icon: LucideIcon;
  i18nKey: string;
  /** Match the path exactly (NavLink `end`) — the orders item must not light up on its /inbox child. */
  exact?: boolean;
}

export const BUSINESS_ROUTES = {
  overview: '/commerce',
  team: '/commerce/team',
  orders: '/commerce/health-orders',
  ordersInbox: '/commerce/health-orders/inbox',
} as const;

/** Routes that are part of the business area. `/commerce/join` (sign-in) and `/commerce/invites/*` (accept landing) are not a mode. */
const NON_MODE_COMMERCE_PREFIXES = ['/commerce/join', '/commerce/invites'];

export function isBusinessRoute(pathname: string): boolean {
  if (pathname !== '/commerce' && !pathname.startsWith('/commerce/')) return false;
  return !NON_MODE_COMMERCE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function isBusinessRole(role: string): role is BusinessRole {
  return role === 'org_admin' || role === 'staff' || role === 'professional';
}

/** Where a switch into a business mode lands: the admin on the team (invitations), everyone else on the orders. */
export function businessHomeFor(role: string): string {
  return role === 'org_admin' ? BUSINESS_ROUTES.team : BUSINESS_ROUTES.orders;
}

/** `org_admin` → `screens.commerceportal.orgOnboarding.roleOrgAdmin` (same PascalCase rule as MyOrgCard/PartnerOrgRoster). */
export function businessRoleLabelKey(role: string): string {
  const pascal = role
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
  return `screens.commerceportal.orgOnboarding.role${pascal}`;
}

const OVERVIEW: BusinessNavItem = { id: 'business-overview', path: BUSINESS_ROUTES.overview, icon: LayoutDashboard, i18nKey: 'mobileNav.overview', exact: true };
const TEAM: BusinessNavItem = { id: 'business-team', path: BUSINESS_ROUTES.team, icon: Users, i18nKey: 'mobileNav.team' };
const ORDERS: BusinessNavItem = { id: 'business-orders', path: BUSINESS_ROUTES.orders, icon: FlaskConical, i18nKey: 'mobileNav.orders', exact: true };
const RESULTS_INBOX: BusinessNavItem = { id: 'business-inbox', path: BUSINESS_ROUTES.ordersInbox, icon: Inbox, i18nKey: 'mobileNav.resultsInbox' };
const MESSAGES: BusinessNavItem = { id: 'inbox', path: '/inbox', icon: Mail, i18nKey: 'mobileNav.inbox' };
const SETTINGS: BusinessNavItem = { id: 'settings', path: '/settings', icon: Settings, i18nKey: 'mobileNav.settings' };

/** The four bottom-bar items for a business role. Unknown role → the professional (least-privileged) bar. */
export function resolveBusinessBottomNav(role: string): BusinessNavItem[] {
  if (role === 'org_admin') return [OVERVIEW, TEAM, ORDERS, SETTINGS];
  if (role === 'staff') return [OVERVIEW, ORDERS, RESULTS_INBOX, SETTINGS];
  return [OVERVIEW, ORDERS, MESSAGES, SETTINGS];
}

/** Drawer rows of the business section (settings/support/logout are cross-mode rows the drawer adds itself). */
export function businessDrawerItems(role: string): BusinessNavItem[] {
  if (role === 'org_admin') return [OVERVIEW, TEAM, ORDERS, RESULTS_INBOX];
  if (role === 'staff') return [OVERVIEW, ORDERS, RESULTS_INBOX];
  return [OVERVIEW, ORDERS];
}

export const ACTIVE_ORG_STORAGE_KEY = 'vitana.businessOrgId';

// Per-viewer convenience only (which of my businesses the phone is currently
// showing). Storage can be missing or throw (private mode, Appilix webview),
// so every access is guarded and a miss just means "first org".
export function readActiveOrgId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeActiveOrgId(id: string | null): void {
  try {
    if (id) window.localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, id);
    else window.localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
  } catch {
    /* ignore — the in-memory store below still carries the value for this session */
  }
}

/** The stored org if it is still one of mine, else the first membership, else null. */
export function pickActiveOrg<T extends { id: string }>(orgs: readonly T[], storedId: string | null): T | null {
  if (orgs.length === 0) return null;
  return orgs.find((o) => o.id === storedId) ?? orgs[0];
}

// Tiny shared store so every hook instance (sheet, drawer, bottom bar) sees
// one active-org value without prop drilling; localStorage is the backing
// persistence, this is the in-session source of truth.
type Listener = () => void;
const listeners = new Set<Listener>();
let activeOrgIdMemory: string | null | undefined;

export function getActiveOrgIdSnapshot(): string | null {
  if (activeOrgIdMemory === undefined) activeOrgIdMemory = readActiveOrgId();
  return activeOrgIdMemory;
}

export function setActiveOrgId(id: string | null): void {
  activeOrgIdMemory = id;
  writeActiveOrgId(id);
  listeners.forEach((l) => l());
}

export function subscribeActiveOrgId(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test hook: forget the in-memory value so the next snapshot re-reads storage. */
export function __resetActiveOrgIdForTests(): void {
  activeOrgIdMemory = undefined;
  listeners.clear();
}
