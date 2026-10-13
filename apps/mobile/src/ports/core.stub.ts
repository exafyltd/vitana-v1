// STUB(N1): replace with @vitana/core/{nav,business-mode,roles,tenants,language,registry,supabase,gateway,config,storage} — awaits packages/core (VTID-05183)
/**
 * VTID-05186 (N3, plan change 2 / Interfaces I-N1.1–I-N1.3) — BRANCH-ONLY stub.
 *
 * Hand re-implementation of exactly the names N1's `@vitana/core` exports
 * (N1 branch claude/health-data-integration-plan-dbxyld-n1, commit 6c179f53d, packages/core/src/*), so the shell builds and
 * its unit tests run while N1 is in review. It is imported ONLY by
 * `src/ports/core.ts`; no shell file imports it (tests/ports.test.ts). It is
 * deleted when the port points at `@vitana/core`, before PR-S merges
 * (plan Meta "merge order"), so no hand copy ever reaches main.
 *
 * Every value below is copied from the web file named in its comment
 * (origin/main d7109abf2). Icons are lucide component NAMES (N1 "split data
 * from icons", EXTRACTION-ANALYSIS F7), never components.
 */
import { createClient, type SupabaseClient, type SupportedStorage } from '@supabase/supabase-js';
import ledger from '../../parity/ledger.json';

// ── @vitana/core/storage ────────────────────────────────────────────────
/** The supabase-js storage shape: sync or async. */
export interface KeyValueStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export function createMemoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { readonly data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => (data.has(key) ? (data.get(key) as string) : null),
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

// ── @vitana/core/config ─────────────────────────────────────────────────
export interface CoreEndpoints {
  gatewayOrigin: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  dataApiUrl?: string;
}

/** Same normalisation as the web resolveGatewayBase; empty input throws (no fallback origin). */
export function gatewayApiUrl(origin: string): string {
  const trimmed = (origin ?? '').trim();
  if (!trimmed) throw new Error('gatewayApiUrl: empty origin (no fallback)');
  const base = trimmed.replace(/\/+$/, '').replace(/\/api\/v1$/, '').replace(/\/+$/, '');
  return `${base}/api/v1`;
}

// ── @vitana/core/gateway ────────────────────────────────────────────────
export type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

export interface GatewayFetchOptions {
  origin: string;
  getAccessToken: () => string | null | undefined | Promise<string | null | undefined>;
  fetchImpl: FetchImpl;
}

export type GatewayFetch = (path: string, init?: RequestInit) => Promise<Response>;

export function createGatewayFetch({ origin, getAccessToken, fetchImpl }: GatewayFetchOptions): GatewayFetch {
  if (typeof fetchImpl !== 'function') throw new Error('createGatewayFetch: fetchImpl is required (no global fetch by default)');
  if (typeof getAccessToken !== 'function') throw new Error('createGatewayFetch: getAccessToken is required');
  const api = gatewayApiUrl(origin);
  return async (path, init = {}) => {
    const rel = path.startsWith('/') ? path : `/${path}`;
    const headers: Record<string, string> = { ...((init.headers as Record<string, string>) ?? {}) };
    const token = await getAccessToken();
    if (token) headers.authorization = `Bearer ${token}`;
    return fetchImpl(`${api}${rel}`, { ...init, headers });
  };
}

export class GatewayError extends Error {
  readonly status: number;
  readonly key?: string;
  readonly params?: Record<string, unknown>;
  readonly body: unknown;
  constructor(status: number, body: unknown) {
    const b = (body && typeof body === 'object' ? body : {}) as { key?: unknown; params?: unknown };
    const key = typeof b.key === 'string' ? b.key : undefined;
    super(`Gateway request failed with status ${status}${key ? ` (${key})` : ''}`);
    this.name = 'GatewayError';
    this.status = status;
    this.key = key;
    this.params = b.params && typeof b.params === 'object' ? (b.params as Record<string, unknown>) : undefined;
    this.body = body;
  }
}

export async function gatewayJson<T>(gatewayFetch: GatewayFetch, path: string, init?: RequestInit): Promise<T> {
  const res = await gatewayFetch(path, init);
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) throw new GatewayError(res.status, body);
  return body as T;
}

// ── @vitana/core/supabase ───────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the generated Database type is N1's
export type Database = any;

export interface SupabaseClientOptions {
  url: string;
  publishableKey: string;
  dataApiUrl?: string;
  storage: KeyValueStorage;
  fetchImpl?: typeof fetch;
  /**
   * Request to N1 (Interfaces I-N1.1, additive, still open): passed through to
   * supabase-js for the Android Apple PKCE flow. N1's factory does not take it
   * yet; until it does, the port must keep passing it (see src/ports/core.ts).
   */
  auth?: { flowType?: 'pkce' | 'implicit' };
}

export type VitanaSupabaseClient = SupabaseClient<Database>;

/** N1's factory, minus createDataFetch (the data-API routing); `auth` is the I-N1.1 request. */
export function createSupabaseClient({ url, publishableKey, storage, fetchImpl, auth }: SupabaseClientOptions): VitanaSupabaseClient {
  if (!url || !url.trim()) throw new Error('createSupabaseClient: url is required (no default project)');
  if (!publishableKey || !publishableKey.trim()) throw new Error('createSupabaseClient: publishableKey is required');
  if (!storage || typeof storage.getItem !== 'function') throw new Error('createSupabaseClient: storage is required');
  const base: typeof fetch = fetchImpl ?? ((input, init) => fetch(input, init));
  return createClient<Database>(url.trim(), publishableKey.trim(), {
    auth: {
      storage: storage as SupportedStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      ...(auth?.flowType ? { flowType: auth.flowType } : {}),
    },
    global: { fetch: base },
    realtime: { params: { eventsPerSecond: 10 } },
  });
}

// ── @vitana/core/roles (src/hooks/useRole.tsx, useRoleSwitch.ts, role-switch-destination.ts, role-navigation.ts) ──
export type UserRole = 'community' | 'patient' | 'professional' | 'staff' | 'backoffice' | 'admin' | 'developer' | 'infra';

export const ROLE_LADDER: UserRole[] = ['community', 'patient', 'professional', 'staff', 'backoffice', 'admin', 'developer', 'infra'];
export const ALL_ROLES_SUPER_ADMIN: UserRole[] = ROLE_LADDER;
export const MOBILE_EXCLUDED_ROLES: UserRole[] = ['backoffice', 'developer', 'infra'];

export const isUserRole = (r: string): r is UserRole => (ROLE_LADDER as string[]).includes(r);

export function computeAvailableRoles(input: {
  granted: readonly string[] | undefined;
  isExafyAdmin: boolean;
  isPatient: boolean;
  isMobile: boolean;
}): UserRole[] {
  const set = new Set<UserRole>(input.isExafyAdmin ? ALL_ROLES_SUPER_ADMIN : (input.granted ?? []).filter(isUserRole));
  set.add('community');
  if (input.isPatient) set.add('patient');
  return ROLE_LADDER.filter((r) => set.has(r) && !(input.isMobile && MOBILE_EXCLUDED_ROLES.includes(r)));
}

export interface BusinessSwitchEntry {
  orgId: string;
  orgName: string;
  role: string;
}

export function computeBusinessEntries(orgs: ReadonlyArray<{ id: string; display_name: string; role: string }>): BusinessSwitchEntry[] {
  return orgs.map((o) => ({ orgId: o.id, orgName: o.display_name, role: o.role }));
}

/** developer/infra: N1 stubs the Command Hub branch; no mobile input reaches it (MOBILE_EXCLUDED_ROLES). */
export function getRoleSwitchDestination(role: UserRole): string {
  switch (role) {
    case 'admin':
    case 'staff':
      return '/admin';
    case 'backoffice':
      return '/backoffice/dashboard';
    case 'professional':
      return '/professional/dashboard';
    case 'patient':
      return '/patient/dashboard';
    case 'developer':
    case 'infra':
    case 'community':
    default:
      return '/home';
  }
}

export function isExternalRoleSwitchDestination(destination: string): boolean {
  return /^https?:\/\//.test(destination);
}

export interface NavigationItem {
  title: string;
  path: string;
  icon: IconName;
  i18nKey?: string;
}

export const patientNavigation: NavigationItem[] = [
  { title: 'Dashboard', path: '/patient/dashboard', icon: 'LayoutDashboard', i18nKey: 'sidebar.dashboard' },
  { title: 'My Health', path: '/patient/health', icon: 'Heart', i18nKey: 'sidebar.myHealth' },
  { title: 'Appointments', path: '/patient/appointments', icon: 'Calendar', i18nKey: 'sidebar.appointments' },
  { title: 'Test Results', path: '/patient/results', icon: 'TestTube', i18nKey: 'sidebar.testResults' },
  { title: 'Care Team', path: '/patient/care-team', icon: 'Users', i18nKey: 'sidebar.careTeam' },
  { title: 'Health Goals', path: '/patient/goals', icon: 'Target', i18nKey: 'sidebar.healthGoals' },
  { title: 'Insurance', path: '/patient/insurance', icon: 'Shield', i18nKey: 'sidebar.insurance' },
  { title: 'Notifications', path: '/patient/notifications', icon: 'Bell', i18nKey: 'sidebar.notifications' },
  { title: 'Settings', path: '/settings', icon: 'Settings', i18nKey: 'sidebar.settings' },
];

export const professionalNavigation: NavigationItem[] = [
  { title: 'Dashboard', path: '/professional/dashboard', icon: 'LayoutDashboard', i18nKey: 'sidebar.dashboard' },
  { title: 'My Patients', path: '/professional/patients', icon: 'Users', i18nKey: 'sidebar.myPatients' },
  { title: 'Schedule', path: '/professional/schedule', icon: 'Calendar', i18nKey: 'sidebar.schedule' },
  { title: 'Clinical Tools', path: '/professional/tools', icon: 'Stethoscope', i18nKey: 'sidebar.clinicalTools' },
  { title: 'Referrals', path: '/professional/referrals', icon: 'FileText', i18nKey: 'sidebar.referrals' },
  { title: 'Billing', path: '/professional/billing', icon: 'Wallet', i18nKey: 'sidebar.billing' },
  { title: 'Professional Profile', path: '/professional/profile', icon: 'UserCheck', i18nKey: 'sidebar.professionalProfile' },
  { title: 'Education', path: '/professional/education', icon: 'BookOpen', i18nKey: 'sidebar.education' },
  { title: 'Settings', path: '/settings', icon: 'Settings', i18nKey: 'sidebar.settings' },
];

export const staffNavigation: NavigationItem[] = [
  { title: 'Dashboard', path: '/staff/dashboard', icon: 'LayoutDashboard', i18nKey: 'sidebar.dashboard' },
  { title: 'Patient Queue', path: '/staff/queue', icon: 'ClipboardList', i18nKey: 'sidebar.patientQueue' },
  { title: 'Daily Tasks', path: '/staff/tasks', icon: 'Activity', i18nKey: 'sidebar.dailyTasks' },
  { title: 'Schedule', path: '/staff/schedule', icon: 'Calendar', i18nKey: 'sidebar.schedule' },
  { title: 'Reports', path: '/staff/reports', icon: 'BarChart3', i18nKey: 'sidebar.reports' },
  { title: 'Communications', path: '/staff/communications', icon: 'MessageSquare', i18nKey: 'sidebar.communications' },
  { title: 'Staff Tools', path: '/staff/tools', icon: 'Zap', i18nKey: 'sidebar.staffTools' },
  { title: 'Time Tracking', path: '/staff/time', icon: 'Clock', i18nKey: 'sidebar.timeTracking' },
  { title: 'Settings', path: '/settings', icon: 'Settings', i18nKey: 'sidebar.settings' },
];

// ── @vitana/core/nav (src/components/mobile/MobileBottomNav.tsx, SideDrawerNav.tsx, src/config/drawer-nav.config.ts) ──
export const ICON_NAMES = [
  'Activity', 'BarChart3', 'Bell', 'BookOpen', 'Briefcase', 'Calendar', 'ClipboardList', 'Clock', 'Compass', 'FileText',
  'FlaskConical', 'Heart', 'HeartPulse', 'Inbox', 'LayoutDashboard', 'LayoutGrid', 'LifeBuoy', 'LogOut', 'Mail',
  'MessageSquare', 'Newspaper', 'Plug', 'Settings', 'Settings2', 'Shield', 'ShoppingBag', 'Stethoscope', 'Store', 'Target',
  'TestTube', 'UserCheck', 'Users', 'Video', 'Wallet', 'Zap',
] as const;
export type IconName = (typeof ICON_NAMES)[number];

export type BottomNavItem = {
  id: string;
  icon: IconName;
  label: string;
  path: string;
  i18nKey: string;
  exact?: boolean;
};

/** MobileBottomNav.tsx `navItems`. */
export const communityBottomNav: BottomNavItem[] = [
  { id: 'news', icon: 'Newspaper', label: 'News', path: '/home', i18nKey: 'mobileNav.news' },
  { id: 'inbox', icon: 'Mail', label: 'Inbox', path: '/inbox', i18nKey: 'mobileNav.inbox' },
  { id: 'journey', icon: 'Compass', label: 'Journey', path: '/autopilot', i18nKey: 'mobileNav.myJourney' },
  { id: 'events', icon: 'Calendar', label: 'Events', path: '/comm/events-meetups', i18nKey: 'mobileNav.events' },
];

export const ROLE_NAV_ITEMS: Partial<Record<UserRole, BottomNavItem[]>> = {
  patient: [
    { id: 'patient-dashboard', icon: 'LayoutDashboard', label: 'Dashboard', path: '/patient/dashboard', i18nKey: 'mobileNav.dashboard' },
    { id: 'patient-results', icon: 'TestTube', label: 'Results', path: '/patient/results', i18nKey: 'mobileNav.results' },
    { id: 'patient-health', icon: 'Heart', label: 'Health', path: '/patient/health', i18nKey: 'mobileNav.health' },
    { id: 'patient-appointments', icon: 'Calendar', label: 'Appointments', path: '/patient/appointments', i18nKey: 'mobileNav.appointments' },
  ],
  professional: [
    { id: 'professional-dashboard', icon: 'LayoutDashboard', label: 'Dashboard', path: '/professional/dashboard', i18nKey: 'mobileNav.dashboard' },
    { id: 'professional-patients', icon: 'Users', label: 'Patients', path: '/professional/patients', i18nKey: 'mobileNav.patients' },
    { id: 'professional-schedule', icon: 'Calendar', label: 'Schedule', path: '/professional/schedule', i18nKey: 'mobileNav.schedule' },
    { id: 'settings', icon: 'Settings', label: 'Settings', path: '/settings', i18nKey: 'mobileNav.settings' },
  ],
};

export function resolveRoleBottomNav(dbRole: UserRole | null | undefined): BottomNavItem[] | null {
  return (dbRole && ROLE_NAV_ITEMS[dbRole]) || null;
}

/** MobileBottomNav#hideNavRoutes. */
export const hideNavRoutes: string[] = [
  '/_intro', '/maxina', '/auth', '/login', '/register', '/video-player', '/live-classes', '/camera-capture',
  '/meditation-player', '/onboarding', '/comm/live-rooms/', '/news/', '/payment-checkout', '/kyc-verification',
];

/** MobileBottomNav#roleSectionRoutes. */
export const roleSectionRoutes: string[] = ['/admin', '/backoffice', '/staff', '/professional', '/patient'];

export interface DrawerNavItem {
  id: string;
  route: string;
  icon: IconName;
  translationKey: string;
}

export interface DrawerIconTone {
  base: string;
  active: string;
}

export const drawerNavIconTones: Record<string, DrawerIconTone> = {
  journey: { base: 'hsl(38 55% 55%)', active: 'hsl(38 62% 46%)' },
  news: { base: 'hsl(215 22% 52%)', active: 'hsl(215 28% 42%)' },
  events: { base: 'hsl(15 52% 58%)', active: 'hsl(15 58% 48%)' },
  'find-partner': { base: 'hsl(330 52% 60%)', active: 'hsl(330 60% 50%)' },
  live: { base: 'hsl(350 42% 58%)', active: 'hsl(350 50% 48%)' },
  media: { base: 'hsl(265 32% 60%)', active: 'hsl(265 38% 50%)' },
  business: { base: 'hsl(30 32% 48%)', active: 'hsl(30 40% 40%)' },
  discover: { base: 'hsl(185 38% 44%)', active: 'hsl(185 46% 36%)' },
  orders: { base: 'hsl(140 28% 48%)', active: 'hsl(140 34% 38%)' },
  wallet: { base: 'hsl(160 36% 44%)', active: 'hsl(160 42% 36%)' },
  health: { base: 'hsl(345 42% 60%)', active: 'hsl(345 48% 50%)' },
  'patient-results': { base: 'hsl(345 42% 60%)', active: 'hsl(345 48% 50%)' },
  'health-orders': { base: 'hsl(185 38% 44%)', active: 'hsl(185 46% 36%)' },
  commerce: { base: 'hsl(28 60% 52%)', active: 'hsl(28 66% 42%)' },
  diary: { base: 'hsl(240 26% 58%)', active: 'hsl(240 32% 48%)' },
  connectors: { base: 'hsl(195 38% 50%)', active: 'hsl(195 44% 40%)' },
  inbox: { base: 'hsl(210 46% 56%)', active: 'hsl(210 52% 46%)' },
  support: { base: 'hsl(0 60% 56%)', active: 'hsl(0 65% 46%)' },
  settings: { base: 'hsl(220 10% 52%)', active: 'hsl(220 12% 42%)' },
  patient: { base: 'hsl(345 42% 60%)', active: 'hsl(345 48% 50%)' },
  professional: { base: 'hsl(185 38% 44%)', active: 'hsl(185 46% 36%)' },
  staff: { base: 'hsl(215 22% 52%)', active: 'hsl(215 28% 42%)' },
  admin: { base: 'hsl(265 32% 60%)', active: 'hsl(265 38% 50%)' },
  'switch-community': { base: 'hsl(38 55% 55%)', active: 'hsl(38 62% 46%)' },
  'business-overview': { base: 'hsl(28 60% 52%)', active: 'hsl(28 66% 42%)' },
  'business-team': { base: 'hsl(28 60% 52%)', active: 'hsl(28 66% 42%)' },
  'business-orders': { base: 'hsl(185 38% 44%)', active: 'hsl(185 46% 36%)' },
  'business-inbox': { base: 'hsl(210 46% 56%)', active: 'hsl(210 52% 46%)' },
};

export const drawerNavItems: DrawerNavItem[] = [
  { id: 'journey', route: '/autopilot', icon: 'Zap', translationKey: 'drawerNav.journey' },
  { id: 'news', route: '/home', icon: 'Newspaper', translationKey: 'drawerNav.news' },
  { id: 'events', route: '/comm/events-meetups', icon: 'Calendar', translationKey: 'drawerNav.events' },
  { id: 'find-partner', route: '/comm/find-partner', icon: 'Users', translationKey: 'drawerNav.findPartner' },
  { id: 'live', route: '/comm/live-rooms', icon: 'Video', translationKey: 'drawerNav.live' },
  { id: 'media', route: '/comm/media-hub', icon: 'LayoutGrid', translationKey: 'drawerNav.media' },
  { id: 'business', route: '/business', icon: 'Briefcase', translationKey: 'drawerNav.business' },
  { id: 'discover', route: '/discover', icon: 'Compass', translationKey: 'drawerNav.discover' },
  { id: 'orders', route: '/discover/orders', icon: 'ShoppingBag', translationKey: 'drawerNav.orders' },
  { id: 'wallet', route: '/wallet', icon: 'Wallet', translationKey: 'drawerNav.wallet' },
  { id: 'health', route: '/health', icon: 'HeartPulse', translationKey: 'drawerNav.health' },
  { id: 'patient-results', route: '/patient/results', icon: 'ClipboardList', translationKey: 'drawerNav.patientResults' },
  { id: 'commerce', route: '/commerce', icon: 'Store', translationKey: 'drawerNav.commerce' },
  { id: 'health-orders', route: '/commerce/health-orders', icon: 'FlaskConical', translationKey: 'drawerNav.healthOrders' },
  { id: 'diary', route: '/daily-diary', icon: 'BookOpen', translationKey: 'drawerNav.diary' },
  { id: 'connectors', route: '/connectors', icon: 'Plug', translationKey: 'drawerNav.connectors' },
  { id: 'inbox', route: '/inbox', icon: 'Mail', translationKey: 'drawerNav.inbox' },
  { id: 'support', route: '/support', icon: 'LifeBuoy', translationKey: 'drawerNav.support' },
  { id: 'settings', route: '/settings', icon: 'Settings2', translationKey: 'drawerNav.settings' },
  { id: 'logout', route: '__logout__', icon: 'LogOut', translationKey: 'drawerNav.logout' },
];

/** SideDrawerNav.tsx `CROSS_MODE_IDS`. */
export const CROSS_MODE_IDS = ['commerce', 'patient-results', 'health-orders', 'support', 'settings', 'logout'];

/** SideDrawerNav.tsx `BUSINESS_DRAWER_KEYS`. */
export const BUSINESS_DRAWER_KEYS: Record<string, string> = {
  'business-overview': 'drawerNav.businessOverview',
  'business-team': 'drawerNav.businessTeam',
  'business-orders': 'drawerNav.businessOrders',
  'business-inbox': 'drawerNav.businessInbox',
};

// ── @vitana/core/business-mode (src/lib/business-mode.ts) ──────────────
export type BusinessRole = 'org_admin' | 'staff' | 'professional';

export interface BusinessNavItem {
  id: string;
  path: string;
  icon: IconName;
  i18nKey: string;
  exact?: boolean;
}

export const BUSINESS_ROUTES = {
  overview: '/commerce',
  team: '/commerce/team',
  orders: '/commerce/health-orders',
  ordersInbox: '/commerce/health-orders/inbox',
} as const;

export const NON_MODE_COMMERCE_PREFIXES = ['/commerce/join', '/commerce/invites'];

export function isBusinessRoute(pathname: string): boolean {
  if (pathname !== '/commerce' && !pathname.startsWith('/commerce/')) return false;
  return !NON_MODE_COMMERCE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function isBusinessRole(role: string): role is BusinessRole {
  return role === 'org_admin' || role === 'staff' || role === 'professional';
}

export function businessHomeFor(role: string): string {
  return role === 'org_admin' ? BUSINESS_ROUTES.team : BUSINESS_ROUTES.orders;
}

export function businessRoleLabelKey(role: string): string {
  const pascal = role
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
  return `screens.commerceportal.orgOnboarding.role${pascal}`;
}

export const OVERVIEW: BusinessNavItem = { id: 'business-overview', path: BUSINESS_ROUTES.overview, icon: 'LayoutDashboard', i18nKey: 'mobileNav.overview', exact: true };
export const TEAM: BusinessNavItem = { id: 'business-team', path: BUSINESS_ROUTES.team, icon: 'Users', i18nKey: 'mobileNav.team' };
export const ORDERS: BusinessNavItem = { id: 'business-orders', path: BUSINESS_ROUTES.orders, icon: 'FlaskConical', i18nKey: 'mobileNav.orders', exact: true };
export const RESULTS_INBOX: BusinessNavItem = { id: 'business-inbox', path: BUSINESS_ROUTES.ordersInbox, icon: 'Inbox', i18nKey: 'mobileNav.resultsInbox' };
export const MESSAGES: BusinessNavItem = { id: 'inbox', path: '/inbox', icon: 'Mail', i18nKey: 'mobileNav.inbox' };
export const SETTINGS: BusinessNavItem = { id: 'settings', path: '/settings', icon: 'Settings', i18nKey: 'mobileNav.settings' };

export function resolveBusinessBottomNav(role: string): BusinessNavItem[] {
  if (role === 'org_admin') return [OVERVIEW, TEAM, ORDERS, SETTINGS];
  if (role === 'staff') return [OVERVIEW, ORDERS, RESULTS_INBOX, SETTINGS];
  return [OVERVIEW, ORDERS, MESSAGES, SETTINGS];
}

export function businessDrawerItems(role: string): BusinessNavItem[] {
  if (role === 'org_admin') return [OVERVIEW, TEAM, ORDERS, RESULTS_INBOX];
  if (role === 'staff') return [OVERVIEW, ORDERS, RESULTS_INBOX];
  return [OVERVIEW, ORDERS];
}

export function pickActiveOrg<T extends { id: string }>(orgs: readonly T[], storedId: string | null): T | null {
  if (orgs.length === 0) return null;
  return orgs.find((o) => o.id === storedId) ?? orgs[0];
}

export const ACTIVE_ORG_STORAGE_KEY = 'vitana.businessOrgId';

export interface ActiveOrgStore {
  getSnapshot(): string | null;
  set(id: string | null): void;
  subscribe(listener: () => void): () => void;
}

/** business-mode.ts:118-139 over an injected storage; a throwing (or async) read is `null`. */
export function createActiveOrgStore(storage: KeyValueStorage): ActiveOrgStore {
  const listeners = new Set<() => void>();
  let memory: string | null | undefined;
  const read = (): string | null => {
    try {
      const v = storage.getItem(ACTIVE_ORG_STORAGE_KEY);
      return typeof v === 'string' ? v : null;
    } catch {
      return null;
    }
  };
  const write = (id: string | null) => {
    try {
      const r = id ? storage.setItem(ACTIVE_ORG_STORAGE_KEY, id) : storage.removeItem(ACTIVE_ORG_STORAGE_KEY);
      if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => undefined);
    } catch {
      /* the in-memory value still carries the session */
    }
  };
  return {
    getSnapshot() {
      if (memory === undefined) memory = read();
      return memory;
    },
    set(id) {
      memory = id;
      write(id);
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

// ── @vitana/core/tenants (src/lib/tenant-registry.ts VTID-05151, src/lib/retired-tenants.ts; N1 ab4c5f2ec) ──
export const RETIRED_TENANT_SLUGS: Readonly<Record<string, string>> = Object.freeze({ earthlinks: 'maxina', earthlings: 'maxina' });

export function canonicalTenantSlug(slug: string): string;
export function canonicalTenantSlug(slug: string | null | undefined): string | null;
export function canonicalTenantSlug(slug: string | null | undefined): string | null {
  if (!slug) return slug ?? null;
  return RETIRED_TENANT_SLUGS[slug.toLowerCase()] ?? slug;
}

export type TenantSlug = string;

/** The registry entry's brand (web `TenantBrand` in tenant-registry.ts). */
export interface TenantRegistryBrand {
  accent?: string;
  bg?: string;
  fg?: string;
  logo_path?: string;
  favicon_path?: string;
  og_image_path?: string;
}

export interface TenantLanding {
  tagline?: Record<string, string>;
  intro?: boolean;
  auto_switch_on_visit?: boolean;
  post_login_path?: string;
  oauth?: boolean;
}

export interface TenantEntry {
  tenant_id: string;
  slug: TenantSlug;
  name: string;
  display_name: string;
  open_signup: boolean;
  brand: TenantRegistryBrand;
  landing: TenantLanding;
  locales: string[] | null;
}

export type RegistrySource = 'rpc' | 'snapshot' | 'fallback';

export interface TenantRegistry {
  source: RegistrySource;
  tenants: TenantEntry[];
}

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;

export const COMPILED_MAXINA_FALLBACK: Readonly<TenantEntry> = Object.freeze({
  tenant_id: '',
  slug: 'maxina',
  name: 'Maxina',
  display_name: 'Maxina',
  open_signup: true,
  brand: Object.freeze({ accent: '#FF7BAC', bg: '#FFF5F8', fg: '#1A1A1A' }),
  landing: Object.freeze({ intro: true, auto_switch_on_visit: true, post_login_path: '/onboarding/welcome', oauth: true }),
  locales: null,
}) as Readonly<TenantEntry>;

export const FALLBACK_REGISTRY: TenantRegistry = Object.freeze({
  source: 'fallback',
  tenants: [COMPILED_MAXINA_FALLBACK as TenantEntry],
}) as TenantRegistry;

export interface ResolvedTenant {
  tenant_id: string;
  id: '';
  tenantId: string;
  slug: string;
  name: string;
  displayName: string;
  openSignup: boolean;
  landing: TenantLanding;
  brandAccent?: string;
  brandBg?: string;
  brandFg?: string;
}

export function safeHex(v: unknown): string | undefined {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : undefined;
}

export function safeInternalPath(p: unknown, fallback = '/home'): string {
  if (typeof p !== 'string') return fallback;
  const v = p.trim();
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\')) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(v)) return fallback;
  if (/^\/[^/?#]*:/.test(v)) return fallback;
  return v;
}

export function normalizeEntry(raw: unknown): TenantEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.slug !== 'string' || !SLUG_RE.test(r.slug)) return null;
  if (typeof r.tenant_id !== 'string' || typeof r.name !== 'string') return null;
  const b = (r.brand && typeof r.brand === 'object' ? r.brand : {}) as Record<string, unknown>;
  const l = (r.landing && typeof r.landing === 'object' ? r.landing : {}) as Record<string, unknown>;
  const landing: TenantLanding = {};
  if (l.tagline && typeof l.tagline === 'object') {
    const tag: Record<string, string> = {};
    for (const [k, v] of Object.entries(l.tagline as Record<string, unknown>)) if (typeof v === 'string') tag[k] = v;
    if (Object.keys(tag).length) landing.tagline = tag;
  }
  if (typeof l.intro === 'boolean') landing.intro = l.intro;
  if (typeof l.auto_switch_on_visit === 'boolean') landing.auto_switch_on_visit = l.auto_switch_on_visit;
  if (typeof l.post_login_path === 'string') landing.post_login_path = l.post_login_path;
  if (typeof l.oauth === 'boolean') landing.oauth = l.oauth;
  const brand: TenantRegistryBrand = {};
  const accent = safeHex(b.accent);
  const bg = safeHex(b.bg);
  const fg = safeHex(b.fg);
  if (accent) brand.accent = accent;
  if (bg) brand.bg = bg;
  if (fg) brand.fg = fg;
  for (const k of ['logo_path', 'favicon_path', 'og_image_path'] as const) if (typeof b[k] === 'string') brand[k] = b[k] as string;
  return {
    tenant_id: r.tenant_id,
    slug: r.slug,
    name: r.name,
    display_name: typeof r.display_name === 'string' && r.display_name ? r.display_name : r.name,
    open_signup: r.open_signup === true,
    brand,
    landing,
    locales: Array.isArray(r.locales) ? r.locales.filter((x): x is string => typeof x === 'string') : null,
  };
}

export function findBySlug(reg: TenantRegistry, slug: string | null | undefined): TenantEntry | undefined {
  if (!slug) return undefined;
  const s = canonicalTenantSlug(slug.trim().toLowerCase());
  return reg.tenants.find((t) => t.slug === s);
}

export function findById(reg: TenantRegistry, tenantId: string | null | undefined): TenantEntry | undefined {
  if (!tenantId) return undefined;
  return reg.tenants.find((t) => t.tenant_id && t.tenant_id === tenantId);
}

export function resolvedTenantFromEntry(entry: TenantEntry, tenantId: string): ResolvedTenant {
  return {
    tenant_id: tenantId,
    id: '',
    tenantId,
    slug: entry.slug,
    name: entry.display_name,
    displayName: entry.display_name,
    openSignup: entry.open_signup,
    landing: entry.landing,
    brandAccent: safeHex(entry.brand.accent),
    brandBg: safeHex(entry.brand.bg),
    brandFg: safeHex(entry.brand.fg),
  };
}

export function neutralTenant(row: { tenant_id: string; slug: string | null; name: string }): ResolvedTenant {
  return { tenant_id: row.tenant_id, id: '', tenantId: row.tenant_id, slug: row.slug ?? '', name: row.name, displayName: row.name, openSignup: false, landing: {} };
}

export function resolveActiveTenant(
  activeTenantId: string | null,
  reg: TenantRegistry,
  row: { tenant_id: string; slug: string | null; name: string } | null | undefined,
): ResolvedTenant | null {
  if (!activeTenantId) return null;
  const byId = findById(reg, activeTenantId);
  if (byId) return resolvedTenantFromEntry(byId, activeTenantId);
  if (!row) return null;
  const bySlug = findBySlug(reg, row.slug);
  if (bySlug && (!bySlug.tenant_id || bySlug.tenant_id === row.tenant_id)) return resolvedTenantFromEntry(bySlug, row.tenant_id);
  return neutralTenant(row);
}

/** packages/core/src/tenants.ts: the brand overlay for a listed tenant, null for an unlisted one. */
export interface TenantBrand {
  brandAccent?: string;
  brandBg?: string;
  brandFg?: string;
}

export function tenantBrand(slug: string | null | undefined, registry: TenantRegistry = FALLBACK_REGISTRY): TenantBrand | null {
  const entry = findBySlug(registry, slug);
  if (!entry) return null;
  return { brandAccent: safeHex(entry.brand.accent), brandBg: safeHex(entry.brand.bg), brandFg: safeHex(entry.brand.fg) };
}

// ── @vitana/core/language (src/contexts/LanguageContext.tsx, locale-presentation.ts, RTLProvider.tsx) ──
export const languageOptions: Array<{ label: string; value: string; status: 'ga' | 'beta' | 'draft' }> = [
  { label: 'German (DE)', value: 'de-DE', status: 'ga' },
  { label: 'English (EN)', value: 'en-US', status: 'ga' },
  { label: 'Spanish (ES)', value: 'es-ES', status: 'ga' },
  { label: 'Serbian (SR)', value: 'sr-RS', status: 'ga' },
  { label: 'French (FR)', value: 'fr-FR', status: 'ga' },
  { label: 'Portuguese (BR)', value: 'pt-BR', status: 'ga' },
  { label: 'Russian (RU)', value: 'ru-RU', status: 'ga' },
  { label: 'Polish (PL)', value: 'pl-PL', status: 'ga' },
  { label: 'Arabic (AR)', value: 'ar-XA', status: 'ga' },
  { label: 'Chinese (ZH)', value: 'zh-CN', status: 'ga' },
  { label: 'Turkish (TR)', value: 'tr-TR', status: 'ga' },
];

export interface LocalePresentation {
  /** N1: the asset PATH (rewrite (c)); resolved by flagAsset. */
  flag: string;
  endonym: string;
}

export const LOCALE_PRESENTATION: Record<string, LocalePresentation> = {
  'de-DE': { flag: 'src/assets/flags/de.png', endonym: 'Deutsch' },
  'en-US': { flag: 'src/assets/flags/gb.png', endonym: 'English' },
  'es-ES': { flag: 'src/assets/flags/es.png', endonym: 'Español' },
  'sr-RS': { flag: 'src/assets/flags/rs.png', endonym: 'Srpski' },
  'fr-FR': { flag: 'src/assets/flags/fr.png', endonym: 'Français' },
  'pt-BR': { flag: 'src/assets/flags/pt.png', endonym: 'Português (BR)' },
  'ru-RU': { flag: 'src/assets/flags/ru.png', endonym: 'Русский' },
  'pl-PL': { flag: 'src/assets/flags/pl.png', endonym: 'Polski' },
  'ar-XA': { flag: 'src/assets/flags/sa.png', endonym: 'العربية' },
  'zh-CN': { flag: 'src/assets/flags/cn.png', endonym: '简体中文' },
  'tr-TR': { flag: 'src/assets/flags/tr.png', endonym: 'Türkçe' },
};

/** N1 resolves the path through its generated asset map; the stub has no bundled flags. */
export function flagAsset(_path: string): number | undefined {
  return undefined;
}

export const RTL_BASE_LANGUAGES: ReadonlySet<string> = new Set(['ar', 'he', 'fa', 'ur']);

export function isRtlLanguage(language: string | null | undefined): boolean {
  const base = (language || '').toLowerCase().split(/[-_]/)[0];
  return RTL_BASE_LANGUAGES.has(base);
}

// ── @vitana/core/registry (src/navigation/registry/index.ts) ────────────
export interface ScreenDef {
  id: string;
  route: string;
  mobileRoute?: string;
  category?: string;
  access?: string;
  i18n?: Record<string, { title: string }>;
}

type LedgerRow = { key: string; web_path: string; source: string; kind: string; access?: string };

/**
 * Metro cannot read src/navigation/registry/screens.json from this project
 * (outside its watch folders until N1 wires @vitana/core), so the stub rebuilds
 * SCREENS from the parity ledger's registry rows, plus the 18 screens whose web
 * `route` differs from their `mobileRoute` (screens.json, origin/main). No
 * titles: screenTitle returns '' until the real registry is in.
 */
const ROUTE_WHERE_MOBILE_DIFFERS: Record<string, string> = {
  'COMM.OVERVIEW': '/comm',
  'DISCOVER.AI_PICKS': '/discover/ai-picks',
  'MEMORY.DIARY': '/memory/diary',
  'SETTINGS.BILLING': '/settings/billing',
  'SETTINGS.BILLING_CREATOR': '/settings/billing?section=creator',
  'SETTINGS.BILLING_INVOICES': '/settings/billing?section=invoices',
  'SETTINGS.BILLING_PAYMENT': '/settings/billing?section=payment',
  'SETTINGS.BILLING_PLAN': '/settings/billing?section=plan',
  'SETTINGS.CONNECTED_APPS': '/connectors',
  'SETTINGS.NOTIFICATIONS': '/settings/notifications',
  'SETTINGS.PREFERENCES': '/settings/preferences',
  'SETTINGS.PREFERENCES_APPEARANCE': '/settings/preferences?section=appearance',
  'SETTINGS.PREFERENCES_LANGUAGE': '/settings/preferences?section=language',
  'SETTINGS.PRIVACY': '/settings/privacy',
  'SETTINGS.PRIVACY_DATA': '/settings/privacy?section=data',
  'SETTINGS.PRIVACY_SECURITY': '/settings/privacy?section=security',
  'SETTINGS.PRIVACY_VISIBILITY': '/settings/privacy?section=visibility',
  'SETTINGS.SOCIAL': '/settings/social',
};

export const SCREENS: readonly ScreenDef[] = (ledger.rows as LedgerRow[])
  .filter((r) => r.source === 'registry')
  .map((r) => {
    const route = ROUTE_WHERE_MOBILE_DIFFERS[r.key];
    return route ? { id: r.key, route, mobileRoute: r.web_path } : { id: r.key, route: r.web_path };
  });

const BY_ID = new Map(SCREENS.map((s) => [s.id, s]));

export function getScreen(id: string): ScreenDef | undefined {
  return BY_ID.get(id);
}

export function screenTitle(s: ScreenDef, locale: string): string {
  return s.i18n?.[locale]?.title ?? s.i18n?.en?.title ?? '';
}
