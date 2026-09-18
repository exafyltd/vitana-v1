import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, Calendar, Bell, Plane, ShoppingCart, ChevronRight, ArrowLeftRight, Users, type LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { NotificationBadge } from '@/components/ui/notification-badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EnhancedCalendarPopup } from '@/components/calendar/EnhancedCalendarPopup';
import { AutopilotPopup } from '@/components/AutopilotPopup';
// Phase 0: CartSidebar retired from the buy path — cart action navigates to /universal-cart.
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel';
import { ResponsivePopover, ResponsivePopoverContent } from '@/components/ui/responsive-popover';
import { LanguageOptionsList } from '@/components/language/LanguageOptionsList';
import { LOCALE_PRESENTATION } from '@/components/language/locale-presentation';
import { drawerNavItems, drawerNavIconTones, type DrawerNavItem } from '@/config/drawer-nav.config';
import { getRoleNavigation } from '@/config/role-navigation';
import { useTranslation } from '@/hooks/useTranslation';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/context/AuthProvider';
import { useProfile } from '@/context/ProfileProvider';
import { useRole } from '@/hooks/useRole';
import { useMyPartnerOrgs } from '@/hooks/useOrgMembers';
import { usePatientAccess } from '@/hooks/usePatientAccess';
import { useRoleSwitch } from '@/hooks/useRoleSwitch';
import { useBusinessMode } from '@/hooks/useBusinessMode';
import { businessDrawerItems, businessRoleLabelKey } from '@/lib/business-mode';
import { RoleSwitcherSheet } from '@/components/mobile/RoleSwitcherSheet';
import { roleLabel as vitanaRoleLabel } from '@/lib/role-labels';
import { useChatUnreadCount } from '@/hooks/useChatUnreadCount';
import { useNotifications } from '@/hooks/useNotifications';
import { useUniversalCart } from '@/hooks/useUniversalCart';
import { avatarPositionStyle } from '@/lib/avatarPosition';
import { supabase } from '@/integrations/supabase/client';
import { isIAPRestricted } from '@/lib/appilix';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n-toast';
import { prefetchForPath, ROUTE_CHUNK_IMPORTERS } from '@/lib/prefetch-registry';

interface SideDrawerNavProps {
  open: boolean;
  onClose: () => void;
}

// VTID-03993: one drawer row. Community-mode rows come from drawer-nav.config;
// rows for any other mode are mapped from role-navigation.ts — the same
// source the desktop sidebar renders — so a mode's items cannot drift
// between viewports. `fallback` is the English title for keys the catalog
// may not carry; `action` marks the two rows that do not navigate.
type DrawerRow = DrawerNavItem & { fallback?: string; action?: 'logout' | 'switch-community'; exact?: boolean };

// Rows that stay in EVERY mode: the org axis (a business membership is
// independent of the active Vitana role — owner decision, VTID-03993), the
// patient-results door (VTID-03988), support, settings and logout. Rows whose
// route the role navigation already lists are not repeated.
const CROSS_MODE_IDS = ['commerce', 'patient-results', 'health-orders', 'support', 'settings', 'logout'];

// VTID-03999: drawer labels for the business-mode rows (the bottom bar uses
// the shorter mobileNav.* keys for the same items).
const BUSINESS_DRAWER_KEYS: Record<string, string> = {
  'business-overview': 'drawerNav.businessOverview',
  'business-team': 'drawerNav.businessTeam',
  'business-orders': 'drawerNav.businessOrders',
  'business-inbox': 'drawerNav.businessInbox',
};

export function SideDrawerNav({ open, onClose }: SideDrawerNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { translate } = useTranslation();
  const { tenant, isExafyAdmin, activeTenantId } = useTenant();
  const { signOut, user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  // De-dupe tap-intent warming per item, per drawer-open — avoids firing twice
  // for the pointerdown + touchstart pair some browsers send for one tap.
  const warmedItemsRef = useRef<Set<string>>(new Set());
  // Use unforced DB role: useRole() pins currentRole to "community" on mobile
  // for permissioning, but the drawer subtitle should reflect the real role.
  const { dbRole } = useRole();
  // Health Test Orders is gated on org membership (partner_organization_members),
  // an axis independent of dbRole — see CommerceHealthOrders.tsx's own header
  // comment for why. Not org_admin/staff-only: an assigned-only professional
  // member should still be able to find their own order queue.
  const myPartnerOrgsQuery = useMyPartnerOrgs();
  const isPartnerOrgMember = (myPartnerOrgsQuery.data?.length ?? 0) > 0;
  // VTID-03989: the org-scoped role (org_admin/staff/professional) is a
  // separate axis from dbRole — surface it in the header so a business owner
  // can see what they are, without touching the Vitana-wide role ladder.
  const primaryOrg = myPartnerOrgsQuery.data?.[0] ?? null;
  const orgRoleLabel = (role: string) =>
    t(`screens.commerceportal.orgOnboarding.role${role.split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')}`);
  // VTID-03988: "Meine Befunde" unlocks on the patient_profiles flag the
  // health-order trigger sets, not only on dbRole — mobile has no role
  // switcher, so dbRole stays 'community' here even after activation.
  const { isPatient } = usePatientAccess();
  // VTID-03993: the stored preference (dbRole) is the active MODE on every
  // viewport; the header pill opens the switcher, the sheet writes the same
  // set_role_preference the desktop <Select> does (one hook, one path).
  const roleSwitch = useRoleSwitch();
  // VTID-03999: business modes live on their own axis — on a business route
  // with an active org the drawer shows that business's rows and the header
  // names the business role, without any Vitana role having changed.
  const business = useBusinessMode();
  const inBusinessMode = business.isBusinessMode && business.activeOrg !== null;
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [results, setResults] = useState<Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>>([]);
  const [searching, setSearching] = useState(false);
  const { unreadCount } = useChatUnreadCount();
  // Bell badge only — the panel re-subscribes inside <NotificationsPanel />
  const { unreadCount: notificationUnreadCount } = useNotifications(20);
  // Phase 0: counts from the one canonical cart (0 when roleBlocked).
  const { cartCount } = useUniversalCart();

  // Language row — flag + current language + chevron, replaces the old
  // Soundscape footer here. Soundscape mute moved to the always-visible
  // mobile TopAppBar instead, since this drawer (and this row) is only
  // on-screen while the user has it open.
  const { selectedLanguage } = useLanguage();
  const currentLocale = LOCALE_PRESENTATION[selectedLanguage] ?? LOCALE_PRESENTATION['de-DE'];

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);

  // Flag the body while the side drawer is open so the ORB FAB (injected into
  // <body> by the external widget at z-index 60) can be layered *below* the
  // drawer + backdrop (also z-60). Distinct from the fullscreen Sheet's
  // `data-drawer-open`, which hides the bottom nav and the ORB entirely — here
  // we keep the ORB docked to the bottom nav, just tucked behind the scrim.
  useEffect(() => {
    if (open) {
      document.body.dataset.sideDrawerOpen = 'true';
    } else {
      delete document.body.dataset.sideDrawerOpen;
    }
    return () => {
      delete document.body.dataset.sideDrawerOpen;
    };
  }, [open]);

  const openPopup = (setter: (v: boolean) => void) => {
    setter(true);
    onClose();
  };

  const isMaxina = tenant?.slug === 'maxina';
  // The label names the ACTIVE mode. An automatically activated patient who
  // is still in Community mode is offered Patient in the switcher instead of
  // being labelled as one here (VTID-03993 supersedes the VTID-03988 hint):
  // a pill that says "Patient" while the app is in Community mode would lie.
  const roleLabel = inBusinessMode && business.activeOrg
    ? t(businessRoleLabelKey(business.activeOrg.role))
    : isExafyAdmin && dbRole === 'community'
      ? t('screens.mobile.roleExafyAdmin')
      : vitanaRoleLabel(dbRole);
  // With a switcher the pill carries the role; the second line then only
  // shows the handle (or nothing) so the mode is not printed twice.
  const secondaryLine = profile.handle ? `@${profile.handle}` : roleSwitch.canSwitch ? '' : roleLabel;

  const openRoleSheet = () => {
    onClose();
    setRoleSheetOpen(true);
  };

  const handleProfileClick = () => {
    onClose();
    navigate('/me/profile');
  };

  const handleQuickAction = (route: string) => {
    onClose();
    navigate(route);
  };

  const closeSearch = () => {
    setSearchActive(false);
    setSearchQuery('');
    setResults([]);
  };

  // Debounced live search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('global_community_profiles')
        .select('user_id, display_name, avatar_url')
        .eq('is_visible', true)
        .ilike('display_name', `%${searchQuery.trim()}%`)
        .limit(6);
      setResults(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Mirrors MobileBottomNav's tap-intent warming (pointerdown/touchstart fires
  // before the click commits): the drawer previously navigated cold on every
  // tap, since only the bottom nav had this. Warms both the route's JS chunk
  // and its data query so Events/Discover/etc. paint from cache when opened
  // from here, not just from the bottom nav.
  const handleTapIntent = (item: DrawerRow) => {
    if (item.action || warmedItemsRef.current.has(item.id)) return;
    warmedItemsRef.current.add(item.id);
    ROUTE_CHUNK_IMPORTERS[item.route]?.().catch(() => {});
    if (user?.id) {
      void prefetchForPath(queryClient, item.route, user.id, activeTenantId ?? undefined).catch(() => {});
    }
  };

  const handleItemClick = async (item: DrawerRow) => {
    onClose();

    if (item.action === 'switch-community') {
      // VTID-03999: leaving a business mode is a navigation when the Vitana
      // mode already is Community; otherwise it is the same write as picking
      // Community in the sheet, which also lands on /home.
      if (inBusinessMode && dbRole === 'community') {
        navigate('/home');
        return;
      }
      // The explicit way back: same write as picking Community in the sheet.
      await roleSwitch.switchRole('community');
      return;
    }

    if (item.action === 'logout') {
      await signOut();
      // Clear caches
      const qc = (window as any).queryClient;
      if (qc) qc.clear();
      localStorage.removeItem('vitana-query-cache');
      navigate('/', { replace: true });
      return;
    }

    navigate(item.route);
  };

  // VTID-03993: which rows this drawer shows. Community (and BackOffice,
  // which VTID-03973 keeps off the phone) get the existing list; any other
  // mode gets that role's own navigation, the cross-mode rows, an explicit
  // "switch to Community" row and logout.
  const communityRows: DrawerRow[] = drawerNavItems
    .filter(item => !(isIAPRestricted() && item.id === 'wallet'))
    .filter(item => !(item.id === 'patient-results' && dbRole === 'community' && !isPatient))
    .filter(item => !(item.id === 'health-orders' && !isPartnerOrgMember))
    .filter(item => !(item.id === 'commerce' && !isPartnerOrgMember))
    .map(item => (item.id === 'logout' ? { ...item, action: 'logout' as const } : item));
  const rows: DrawerRow[] = (() => {
    // VTID-03999: business mode first — it is route-based and independent of dbRole.
    if (inBusinessMode && business.activeOrg) {
      const bizRows: DrawerRow[] = businessDrawerItems(business.activeOrg.role).map(nav => ({
        id: nav.id,
        route: nav.path,
        icon: nav.icon,
        translationKey: BUSINESS_DRAWER_KEYS[nav.id] ?? nav.i18nKey,
        exact: nav.exact,
      }));
      const crossRows = communityRows.filter(
        item => ['patient-results', 'support', 'settings'].includes(item.id) && item.action !== 'logout',
      );
      const logoutRow = communityRows.find(item => item.action === 'logout');
      const switchRow: DrawerRow = {
        id: 'switch-community',
        route: '__switch__',
        icon: Users,
        translationKey: 'screens.mobile.switchToCommunity',
        action: 'switch-community',
      };
      return [...bizRows, ...crossRows, switchRow, ...(logoutRow ? [logoutRow] : [])];
    }
    if (dbRole === 'community' || dbRole === 'backoffice') return communityRows;
    const roleRows: DrawerRow[] = getRoleNavigation(dbRole)
      .filter(nav => nav.path !== '/settings')
      .map(nav => ({
        id: `role:${nav.path}`,
        route: nav.path,
        icon: nav.icon as LucideIcon,
        translationKey: nav.i18nKey ?? '',
        fallback: nav.title,
      }));
    const roleRoutes = new Set(roleRows.map(row => row.route));
    const crossRows = communityRows.filter(
      item => CROSS_MODE_IDS.includes(item.id) && item.action !== 'logout' && !roleRoutes.has(item.route),
    );
    const logoutRow = communityRows.find(item => item.action === 'logout');
    const switchRow: DrawerRow = {
      id: 'switch-community',
      route: '__switch__',
      icon: Users,
      translationKey: 'screens.mobile.switchToCommunity',
      action: 'switch-community',
    };
    return [...roleRows, ...crossRows, switchRow, ...(logoutRow ? [logoutRow] : [])];
  })();
  // One icon tone per mode for the mapped role rows (community rows keep
  // their per-item tones from drawer-nav.config).
  const roleTone = inBusinessMode ? drawerNavIconTones.commerce : drawerNavIconTones[dbRole];
  // The header chip's dot uses the same tone as the mode's rows; Community
  // has no row tone of its own (its rows are per-item), so it borrows the
  // "switch to community" amber the drawer already associates with it.
  const modeTone = roleTone ?? drawerNavIconTones['switch-community'];

  const isActive = (route: string, exact?: boolean) => {
    if (route === '__logout__' || route === '__switch__') return false;
    if (location.pathname === route) return true;
    if (exact) return false;
    // For /discover vs /discover/orders, be exact
    if (route === '/discover') return location.pathname === '/discover';
    // /commerce vs /commerce/health-orders — same shape as discover above.
    if (route === '/commerce') return location.pathname === '/commerce';
    return location.pathname.startsWith(route + '/');
  };

  return (
    <>
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.nav
            className="fixed top-0 left-0 bottom-0 z-[60] w-72 flex flex-col bg-background shadow-2xl"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header — profile entry + role ("mode") pill */}
            <div
              className="px-5 py-3.5"
              style={
                isMaxina
                  ? {
                      background:
                        'linear-gradient(180deg, hsl(201 90% 78%) 0%, hsl(201 75% 70%) 100%)',
                      color: 'rgba(255,255,255,0.95)',
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-3">
              <button
                onClick={handleProfileClick}
                className="flex items-center gap-3 flex-1 min-w-0 text-left rounded-xl -mx-1 px-1 py-1 hover:bg-white/10 transition-colors"
                aria-label={t('screens.mobile.openMyProfile')}
              >
                <Avatar className="h-9 w-9 ring-1 ring-white/40 shrink-0">
                  <AvatarImage
                    src={profile.avatar}
                    alt={profile.displayName}
                    style={avatarPositionStyle(profile.avatarOffsetX, profile.avatarOffsetY)}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-pink-100 to-pink-200 text-pink-800 font-semibold">
                    {profile.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="leading-tight min-w-0 flex-1">
                  <div className="font-bold text-base tracking-wide truncate">
                    {profile.displayName}
                  </div>
                  {secondaryLine && (
                    <div className="text-xs opacity-80 truncate">
                      {secondaryLine}
                    </div>
                  )}
                </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                aria-label={t('screens.mobile.closeDrawer')}
              >
                <X className="h-[18px] w-[18px]" />
              </button>
              </div>
              {/* Mode chip + switch CTA + org chip sit in the TEXT column,
                  directly under the name/handle (VTID-03997). They cannot
                  live inside the profile <button> above (a button in a
                  button is invalid HTML), so this block is indented to the
                  column start: ms-12 = 48px = avatar w-9 (36px) + the row's
                  gap-3 (12px). Keep in sync if the avatar size changes.
                  VTID-04041: the mode is a plain chip (information) and the
                  switch is a labelled button next to it — one interactive
                  element, unmistakably about changing the mode. The old
                  "Staff ⌄" pill read as a status badge. */}
              {(roleSwitch.canSwitch || primaryOrg) && (
                <div className="ms-12 mt-1.5 flex min-w-0 flex-col items-start gap-1">
                  <div className="flex max-w-full flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isMaxina ? 'bg-white/20' : 'bg-muted'
                      }`}
                    >
                      <span className="sr-only">{t('screens.mobile.currentMode')}: </span>
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: modeTone.active }}
                      />
                      <span className="truncate">{roleLabel}</span>
                    </span>
                    {roleSwitch.canSwitch && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openRoleSheet();
                        }}
                        aria-label={t('screens.profile.switchRole')}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                          isMaxina
                            ? 'bg-white text-sky-700 shadow-sm hover:bg-white/90'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
                        <span>{t('screens.profile.switchRole')}</span>
                      </button>
                    )}
                  </div>
                  {inBusinessMode && business.activeOrg ? (
                    <div className="max-w-full text-[11px] opacity-80 truncate">{business.activeOrg.display_name}</div>
                  ) : primaryOrg && (
                    <div className="max-w-full text-[11px] opacity-80 truncate">
                      {orgRoleLabel(primaryOrg.role)} · {primaryOrg.display_name}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick actions — collapsed strip OR expanded search */}
            {!searchActive ? (
              <div className="flex items-stretch gap-1 px-3 pt-3 pb-1.5 border-b border-border/50">
                <button
                  onClick={() => setSearchActive(true)}
                  aria-label={t('screens.mobile.openSearch')}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1 rounded-xl text-foreground/80 hover:bg-muted active:bg-muted/80 transition-colors"
                >
                  <div className="relative">
                    <Search className="h-[18px] w-[18px]" />
                  </div>
                  <span className="text-[10px] leading-none text-muted-foreground">{t('screens.mobile.search')}</span>
                </button>

                <button
                  onClick={() => openPopup(setCalendarOpen)}
                  aria-label={t('screens.mobile.openCalendar')}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1 rounded-xl text-foreground/80 hover:bg-muted active:bg-muted/80 transition-colors"
                >
                  <div className="relative">
                    <Calendar className="h-[18px] w-[18px]" />
                  </div>
                  <span className="text-[10px] leading-none text-muted-foreground">{t('screens.mobile.calendar')}</span>
                </button>

                <button
                  onClick={() => openPopup(setNotificationsOpen)}
                  aria-label={`Open notifications${notificationUnreadCount > 0 ? `, ${notificationUnreadCount} unread` : ''}`}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1 rounded-xl text-foreground/80 hover:bg-muted active:bg-muted/80 transition-colors"
                >
                  <div className="relative">
                    <Bell className="h-[18px] w-[18px]" />
                    <NotificationBadge
                      count={notificationUnreadCount}
                      collapsed
                      ariaLabel={`${notificationUnreadCount} unread notification${notificationUnreadCount !== 1 ? 's' : ''}`}
                    />
                  </div>
                  <span className="text-[10px] leading-none text-muted-foreground">{t('screens.mobile.alerts')}</span>
                </button>

                <button
                  onClick={() => openPopup(setAutopilotOpen)}
                  aria-label={t('screens.mobile.openAutopilot')}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1 rounded-xl text-foreground/80 hover:bg-muted active:bg-muted/80 transition-colors"
                >
                  <div className="relative">
                    <Plane className="h-[18px] w-[18px]" />
                  </div>
                  <span className="text-[10px] leading-none text-muted-foreground">{t('screens.mobile.autopilot')}</span>
                </button>

                <button
                  onClick={() => { onClose(); navigate('/universal-cart'); }}
                  aria-label={`Open cart${cartCount > 0 ? `, ${cartCount} item${cartCount !== 1 ? 's' : ''}` : ''}`}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1 rounded-xl text-foreground/80 hover:bg-muted active:bg-muted/80 transition-colors"
                >
                  <div className="relative">
                    <ShoppingCart className="h-[18px] w-[18px]" />
                    <NotificationBadge
                      count={cartCount}
                      collapsed
                      ariaLabel={`${cartCount} item${cartCount !== 1 ? 's' : ''} in cart`}
                    />
                  </div>
                  <span className="text-[10px] leading-none text-muted-foreground">{t('screens.mobile.cart')}</span>
                </button>
              </div>
            ) : (
              <div className="px-3 pt-3 pb-2 border-b border-border/50">
                <form
                  className="relative"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (searchQuery.trim()) {
                      const q = searchQuery.trim();
                      closeSearch();
                      navigate(`/search?q=${encodeURIComponent(q)}`);
                      onClose();
                    }
                  }}
                >
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    autoFocus
                    type="text"
                    placeholder={t('screens.mobile.searchMembersGroups')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9 h-9 text-sm rounded-xl bg-muted/40 border-border"
                  />
                  <button
                    type="button"
                    onClick={closeSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                    aria-label={t('screens.mobile.closeSearch')}
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* Live search dropdown */}
                  {searchQuery.trim().length >= 2 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-background border border-border rounded-xl shadow-lg z-[60] overflow-hidden max-h-72 overflow-y-auto">
                      {searching && (
                        <div className="flex items-center justify-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{t('screens.mobile.searching')}</span>
                        </div>
                      )}
                      {!searching && results.length === 0 && (
                        <div className="px-3 py-3 text-sm text-muted-foreground">{t('screens.mobile.noMembersFound')}</div>
                      )}
                      {results.map((r) => {
                        const name = r.display_name || 'Unknown';
                        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                        return (
                          <button
                            key={r.user_id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              closeSearch();
                              navigate(`/u/${r.user_id}`);
                              onClose();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted text-sm text-foreground transition-colors"
                          >
                            <Avatar className="h-8 w-8">
                              {r.avatar_url && <AvatarImage src={r.avatar_url} alt={name} />}
                              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <span className="truncate">{name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* Nav items */}
            <div className="flex-1 overflow-y-auto pt-1.5 pb-2 px-3">
              {rows.map((item) => {
                const active = isActive(item.route, item.exact);
                const Icon = item.icon;
                const isDestructive = item.action === 'logout';
                const tone = !isDestructive ? (drawerNavIconTones[item.id] ?? roleTone) : undefined;
                const iconStyle = tone ? { color: active ? tone.active : tone.base } : undefined;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    onPointerDown={() => handleTapIntent(item)}
                    onTouchStart={() => handleTapIntent(item)}
                    className={`
                      relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 mb-0.5
                      text-sm font-medium transition-all duration-150
                      ${
                        active
                          ? 'bg-primary/10 text-primary'
                          : isDestructive
                          ? 'text-destructive hover:bg-destructive/10'
                          : 'text-foreground hover:bg-muted'
                      }
                    `}
                  >
                    {/* Active accent bar */}
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                    )}
                    <Icon className="h-5 w-5 shrink-0" style={iconStyle} />
                    <span className="flex-1 text-left">{translate(item.translationKey, item.fallback)}</span>
                    {item.id === 'inbox' && unreadCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Language footer — flag + current language + chevron, opens the
                language picker. Soundscape mute used to live here; it's now in
                the always-visible mobile TopAppBar (this row only exists while
                the drawer itself is open).
                The safe-area inset is CAPPED: the Appilix Android WebView reports
                a large `env(safe-area-inset-bottom)` (~120px) even though the
                system nav renders as a separate bar outside the drawer, which
                otherwise leaves a big empty band below the player. Cap the inset
                contribution so we still clear a gesture pill without the bloat. */}
            <div
              className="border-t border-border/50 px-3 pt-1.5"
              style={{ paddingBottom: 'calc(0.75rem + min(env(safe-area-inset-bottom, 0px), 16px))' }}
            >
              <button
                type="button"
                onClick={() => { setLanguagePickerOpen(true); onClose(); }}
                aria-label={t('screens.settings.language')}
                className="w-full flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 hover:bg-muted/60 transition-colors"
              >
                <img src={currentLocale.flag} alt="" className="h-4 w-6 rounded-sm object-cover shrink-0" />
                <span className="flex-1 text-sm text-foreground text-start">{currentLocale.endonym}</span>
                <ChevronRight className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
              </button>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>

    {/* Quick-action popups — live outside the drawer so they persist after it closes */}
    <EnhancedCalendarPopup open={calendarOpen} onOpenChange={setCalendarOpen} />
    <AutopilotPopup open={autopilotOpen} onOpenChange={setAutopilotOpen} />
    {/* Phase 0: CartSidebar retired — the cart action navigates to /universal-cart. */}

    {/* VTID-03993: role switcher — lives outside the drawer so it survives the drawer closing */}
    <RoleSwitcherSheet
      open={roleSheetOpen}
      onOpenChange={setRoleSheetOpen}
      availableRoles={roleSwitch.availableRoles}
      activeRole={roleSwitch.activeRole}
      switching={roleSwitch.switching}
      onSelect={async (role) => {
        const result = await roleSwitch.switchRole(role);
        if (result.ok) setRoleSheetOpen(false);
      }}
      businessEntries={roleSwitch.businessEntries}
      activeBusinessOrgId={roleSwitch.activeBusinessOrgId}
      onSelectBusiness={(orgId) => {
        roleSwitch.switchToBusiness(orgId);
        setRoleSheetOpen(false);
      }}
    />

    <ResponsivePopover open={languagePickerOpen} onOpenChange={setLanguagePickerOpen}>
      <ResponsivePopoverContent title={t('screens.settings.language')}>
        <LanguageOptionsList onSelected={() => setLanguagePickerOpen(false)} />
      </ResponsivePopoverContent>
    </ResponsivePopover>

    <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-0 gap-0 rounded-2xl overflow-hidden top-[calc(env(safe-area-inset-top,0px)+1.5rem)] translate-y-0">
        <NotificationsPanel
          onNavigated={() => setNotificationsOpen(false)}
          onClose={() => setNotificationsOpen(false)}
          maxHeightClassName="max-h-[85vh]"
        />
      </DialogContent>
    </Dialog>
    </>
  );
}
