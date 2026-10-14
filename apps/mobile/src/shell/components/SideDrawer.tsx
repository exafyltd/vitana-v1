/**
 * VTID-05186 (N3, plan change 18) — src/components/mobile/SideDrawerNav.tsx on
 * native: a side sheet from the inline-start edge with the profile header
 * (avatar, name, mode pill opening the role switcher, org line, Exafy-admin
 * badge), quick actions (search with the inline member search, calendar,
 * notifications, autopilot, cart), the rows from composeDrawerRows with their
 * icon tones, and the language row. Every string is a catalog key; the web's
 * raw English aria-labels are not copied (native.a11y.* instead).
 */
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Avatar, CountBadge, Icon, IconButton, PressableRow, SideSheet, Spinner, Text, TextInput, useUITheme } from '../../ports/ui';
import { BUSINESS_DRAWER_KEYS, LOCALE_PRESENTATION, businessRoleLabelKey, drawerNavIconTones } from '../../ports/core';
import { useBadge } from '../../ports/badges';
import { useI18n } from '../../i18n/I18nProvider';
import { useAuth } from '../../auth/AuthProvider';
import { getSupabase } from '../../auth/client';
import { useTenant } from '../../identity/TenantProvider';
import { useRole } from '../../identity/useRole';
import { usePatientAccess } from '../../identity/usePatientAccess';
import { useMyPartnerOrgs } from '../../identity/useMyPartnerOrgs';
import { useBusinessMode } from '../../identity/useBusinessMode';
import { useLanguage } from '../../identity/LanguageProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { overlayBus } from '../../navigation/overlay-bus';
import { composeDrawerRows, drawerRowActive, modeTone, roleTone, type DrawerRow } from '../logic/drawer';
import { roleLabel } from '../logic/role-labels';

export const SEARCH_DEBOUNCE_MS = 300;
export const SEARCH_LIMIT = 6;

type Result = { user_id: string; display_name: string | null; avatar_url: string | null };
type Profile = { display_name: string | null; full_name: string | null; avatar_url: string | null; handle: string | null };

/** SideDrawerNav.tsx:208-213 — visible members by display name, 6 at most. */
export async function searchMembers(query: string): Promise<Result[]> {
  const { data } = await getSupabase()
    .from('global_community_profiles')
    .select('user_id, display_name, avatar_url')
    .eq('is_visible', true)
    .ilike('display_name', `%${query.trim()}%`)
    .limit(SEARCH_LIMIT);
  return (data as Result[] | null) ?? [];
}

const initialsOf = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

export function SideDrawer({
  open,
  onClose,
  onOpenRoleSheet,
  onOpenLanguage,
  canSwitch,
  onSwitchToCommunity,
}: {
  open: boolean;
  onClose: () => void;
  onOpenRoleSheet: () => void;
  onOpenLanguage: () => void;
  canSwitch: boolean;
  onSwitchToCommunity: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { tenant, isExafyAdmin } = useTenant();
  const { dbRole } = useRole();
  const { isPatient } = usePatientAccess();
  const orgs = useMyPartnerOrgs();
  const business = useBusinessMode();
  const { language } = useLanguage();
  const notifications = useBadge('notificationsUnread');
  const cart = useBadge('cartCount');
  const unread = useBadge('inboxUnread');
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);

  const profile = useQuery({
    queryKey: ['profile', user?.id ?? null],
    queryFn: async () => {
      const { data } = await getSupabase().from('profiles').select('display_name, full_name, avatar_url, handle').eq('user_id', user?.id).maybeSingle();
      return (data as Profile | null) ?? null;
    },
    enabled: !!user?.id,
  });

  const inBusinessMode = business.isBusinessMode && business.activeOrg !== null;
  const isPartnerOrgMember = (orgs.data?.length ?? 0) > 0;
  const primaryOrg = orgs.data?.[0] ?? null;
  const rows = composeDrawerRows({
    dbRole,
    isPatient,
    isPartnerOrgMember,
    iapRestricted: Platform.OS === 'ios',
    business: inBusinessMode && business.activeOrg ? { role: business.activeOrg.role } : null,
  });
  const rowTone = roleTone(dbRole, inBusinessMode);
  const chipTone = modeTone(dbRole, inBusinessMode);
  const isMaxina = tenant?.slug === 'maxina';

  const currentRoleLabel = inBusinessMode && business.activeOrg ? t(businessRoleLabelKey(business.activeOrg.role)) : roleLabel(t, dbRole);
  const displayName = profile.data?.display_name || profile.data?.full_name || '';
  const secondaryLine = profile.data?.handle ? `@${profile.data.handle}` : canSwitch ? '' : currentRoleLabel;
  const orgLine = inBusinessMode && business.activeOrg ? business.activeOrg.display_name : primaryOrg ? `${t(businessRoleLabelKey(primaryOrg.role))} · ${primaryOrg.display_name}` : null;
  const pillSecondaryLine = [orgLine, isExafyAdmin ? t('screens.profile.adminAccess') : null].filter(Boolean).join(' · ') || null;
  const locale = LOCALE_PRESENTATION[language] ?? LOCALE_PRESENTATION['de-DE'];

  const closeSearch = () => {
    setSearchActive(false);
    setSearchQuery('');
    setResults([]);
  };

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      void searchMembers(searchQuery)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const go = (path: string) => {
    onClose();
    navigateToWebPath(path);
  };

  const handleItemClick = async (item: DrawerRow) => {
    onClose();
    if (item.action === 'switch-community') {
      if (inBusinessMode && dbRole === 'community') navigateToWebPath('/home');
      else onSwitchToCommunity();
      return;
    }
    if (item.action === 'logout') {
      await signOut();
      navigateToWebPath('/', { replace: true });
      return;
    }
    navigateToWebPath(item.route);
  };

  const quick = (id: string, icon: string, labelKey: string, a11y: string, onPress: () => void, badge = 0) => (
    <PressableRow key={id} testID={`drawer-quick-${id}`} onPress={onPress} accessibilityLabel={a11y} style={styles.quick}>
      <View style={styles.quickInner}>
        <View>
          <Icon name={icon} size={18} color={colors.foreground} />
          <CountBadge count={badge} />
        </View>
        <Text variant="caption" muted>
          {t(labelKey)}
        </Text>
      </View>
    </PressableRow>
  );

  return (
    <SideSheet testID="side-drawer" open={open} side="start" onClose={onClose}>
      <View style={[styles.header, isMaxina ? { backgroundColor: 'hsl(201, 80%, 74%)' } : null]}>
        <View style={styles.headerRow}>
          <PressableRow testID="drawer-profile" onPress={() => go('/me/profile')} accessibilityLabel={t('screens.mobile.openMyProfile')} style={{ flex: 1 }}>
            <Avatar uri={profile.data?.avatar_url} fallback={initialsOf(displayName)} size={96} />
            <View style={{ flex: 1 }}>
              <Text variant="title" numberOfLines={1}>
                {displayName}
              </Text>
              {secondaryLine ? (
                <Text muted numberOfLines={1}>
                  {secondaryLine}
                </Text>
              ) : null}
            </View>
          </PressableRow>
          <IconButton testID="drawer-close" name="X" size={18} onPress={onClose} accessibilityLabel={t('screens.mobile.closeDrawer')} />
        </View>
        {canSwitch || primaryOrg ? (
          <View style={styles.pillBlock}>
            {canSwitch ? (
              <PressableRow
                testID="drawer-mode-pill"
                onPress={() => {
                  onClose();
                  onOpenRoleSheet();
                }}
                accessibilityLabel={`${t('screens.mobile.currentMode')}: ${currentRoleLabel}. ${t('screens.profile.switchRole')}`}
                style={[styles.pill, { backgroundColor: colors.muted }]}
              >
                <View style={[styles.modeDot, { backgroundColor: chipTone.active }]} />
                <Text numberOfLines={1} style={{ fontWeight: '600' }}>
                  {currentRoleLabel}
                </Text>
                <Icon name="ChevronDown" size={16} color={colors.foreground} />
              </PressableRow>
            ) : (
              <View testID="drawer-mode-label" accessibilityLabel={`${t('screens.mobile.currentMode')}: ${currentRoleLabel}`} style={[styles.pill, { backgroundColor: colors.muted }]}>
                <View style={[styles.modeDot, { backgroundColor: chipTone.active }]} />
                <Text numberOfLines={1} style={{ fontWeight: '600' }}>
                  {currentRoleLabel}
                </Text>
              </View>
            )}
            {pillSecondaryLine ? (
              <Text variant="caption" muted numberOfLines={1} testID="drawer-org-line">
                {pillSecondaryLine}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {!searchActive ? (
        <View style={[styles.quickRow, { borderBottomColor: colors.border }]}>
          {quick('search', 'Search', 'screens.mobile.search', t('screens.mobile.openSearch'), () => setSearchActive(true))}
          {quick('calendar', 'Calendar', 'screens.mobile.calendar', t('screens.mobile.openCalendar'), () => go('/calendar'))}
          {quick(
            'notifications',
            'Bell',
            'screens.mobile.alerts',
            t('native.a11y.openNotifications', { count: notifications }),
            () => {
              onClose();
              overlayBus.emit('notifications:open');
            },
            notifications,
          )}
          {quick('autopilot', 'Plane', 'screens.mobile.autopilot', t('screens.mobile.openAutopilot'), () => {
            onClose();
            overlayBus.emit('autopilot:open');
          })}
          {quick('cart', 'ShoppingCart', 'screens.mobile.cart', t('native.a11y.openCart', { count: cart }), () => go('/universal-cart'), cart)}
        </View>
      ) : (
        <View style={[styles.search, { borderBottomColor: colors.border }]}>
          <View style={styles.searchRow}>
            <TextInput
              testID="drawer-search-input"
              autoFocus
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('screens.mobile.searchMembersGroups')}
              accessibilityLabel={t('screens.mobile.searchMembersGroups')}
              returnKeyType="search"
              onSubmitEditing={() => {
                const q = searchQuery.trim();
                if (!q) return;
                closeSearch();
                go(`/search?q=${encodeURIComponent(q)}`);
              }}
              style={{ flex: 1 }}
            />
            <IconButton testID="drawer-search-close" name="X" size={16} onPress={closeSearch} accessibilityLabel={t('screens.mobile.closeSearch')} />
          </View>
          {searchQuery.trim().length >= 2 ? (
            <View testID="drawer-search-results" style={styles.results}>
              {searching ? (
                <View style={styles.resultRow}>
                  <Spinner />
                  <Text muted>{t('screens.mobile.searching')}</Text>
                </View>
              ) : null}
              {!searching && results.length === 0 ? <Text muted>{t('screens.mobile.noMembersFound')}</Text> : null}
              {results.map((r) => {
                const name = r.display_name || '';
                return (
                  <PressableRow
                    key={r.user_id}
                    testID={`drawer-search-result-${r.user_id}`}
                    onPress={() => {
                      closeSearch();
                      go(`/u/${r.user_id}`);
                    }}
                    style={styles.resultRow}
                  >
                    <Avatar uri={r.avatar_url} fallback={initialsOf(name)} size={32} />
                    <Text numberOfLines={1}>{name}</Text>
                  </PressableRow>
                );
              })}
            </View>
          ) : null}
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.rows}>
        {rows.map((item) => {
          const active = drawerRowActive(pathname, item.route, item.exact);
          const destructive = item.action === 'logout';
          const tone = !destructive ? (drawerNavIconTones[item.id] ?? rowTone) : undefined;
          const color = destructive ? colors.destructive : tone ? (active ? tone.active : tone.base) : colors.foreground;
          const label = t(item.translationKey || BUSINESS_DRAWER_KEYS[item.id] || '');
          return (
            <PressableRow
              key={item.id}
              testID={`drawer-row-${item.id}`}
              accessibilityState={{ selected: active }}
              onPress={() => void handleItemClick(item)}
              style={[styles.row, active ? { backgroundColor: colors.muted } : null]}
            >
              {active ? <View style={[styles.accent, { backgroundColor: colors.primary }]} /> : null}
              <Icon name={item.icon} size={20} color={color} />
              <Text style={[{ flex: 1 }, destructive ? { color: colors.destructive } : null]}>{label === item.translationKey && item.fallback ? item.fallback : label}</Text>
              {item.id === 'inbox' ? <CountBadge count={unread} accessibilityLabel={t('native.a11y.unread', { count: unread })} /> : null}
            </PressableRow>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <PressableRow
          testID="drawer-language"
          onPress={() => {
            onClose();
            onOpenLanguage();
          }}
          accessibilityLabel={t('screens.settings.language')}
          style={[styles.languageRow, { backgroundColor: colors.muted }]}
        >
          <Text style={{ flex: 1 }}>{locale.endonym}</Text>
          <Icon name="ChevronRight" size={18} color={colors.mutedForeground} />
        </PressableRow>
      </View>
    </SideSheet>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingVertical: 20, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pillBlock: { alignItems: 'flex-start', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, maxWidth: '100%' },
  modeDot: { width: 10, height: 10, borderRadius: 5 },
  quickRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  quick: { flex: 1, justifyContent: 'center' },
  quickInner: { alignItems: 'center', gap: 2 },
  search: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, gap: 6 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  results: { gap: 4 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  rows: { paddingHorizontal: 12, paddingVertical: 6 },
  row: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 2 },
  accent: { position: 'absolute', start: 0, width: 4, height: 24, borderTopEndRadius: 4, borderBottomEndRadius: 4 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 16 },
  languageRow: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
});
