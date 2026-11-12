/**
 * VTID-05524 — `/commerce/team`, the native twin of src/pages/CommerceTeam.tsx:
 * the org admin's home in business mode. The roster (a full-width sheet on
 * phones) opens over the page for the ACTIVE business (the stored choice the
 * switcher, drawer and bottom bar share, `pickActiveOrg`); closing it goes to
 * the business overview. Not a member → the "not a member" card; a member who
 * is not an admin → the honest "admins only" card.
 */
import { useEffect, useSyncExternalStore, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useUITheme } from '../../ports/ui';
import { BizIcon } from '../../ports/business-ui';
import { BUSINESS_ROUTES, pickActiveOrg } from '../../ports/core';
import { activeOrgStore, hydrateActiveOrg } from '../../identity/device-storage';
import { navigateToWebPath } from '../../navigation/navigate';
import { useI18n } from '../../i18n/I18nProvider';
import { useCommerceOrgs } from './data/hooks';
import { PartnerOrgRoster } from './components/PartnerOrgRoster';
import { CollectionSkeleton } from './components/parts';

/** The active business (web useBusinessMode().activeOrg) over the commerce membership query. */
export function useActiveBusiness() {
  const query = useCommerceOrgs();
  const storedId = useSyncExternalStore(activeOrgStore.subscribe, activeOrgStore.getSnapshot, activeOrgStore.getSnapshot);
  useEffect(() => {
    void hydrateActiveOrg();
  }, []);
  return { orgs: query.data ?? [], activeOrg: pickActiveOrg(query.data ?? [], storedId), isLoading: query.isPending, isError: query.isError };
}

export function CommerceTeamScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const business = useActiveBusiness();
  const org = business.activeOrg;
  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} testID="screen-commerce-team">
      <Text size="2xl" weight="600" accessibilityRole="header">
        {t('screens.commerceportal.orgOnboarding.teamTitle')}
      </Text>
      {business.isLoading ? (
        <View style={styles.block}>
          <CollectionSkeleton testID="team-loading" label={t('common.loading')} />
        </View>
      ) : !org ? (
        <View style={[styles.card, styles.dashed, { borderColor: colors.border, backgroundColor: colors.muted }]} testID="team-not-member">
          <Text weight="500" style={styles.center}>
            {t('screens.commerceportal.healthOrders.notAMemberTitle')}
          </Text>
          <Text size="sm" muted style={styles.center}>
            {t('screens.commerceportal.healthOrders.notAMemberBody')}
          </Text>
        </View>
      ) : org.role !== 'org_admin' ? (
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]} testID="team-admin-only">
          <BizIcon name="Users" size={32} color={colors.statusWarning} />
          <Text weight="500" style={styles.center}>
            {t('screens.commerceportal.orgOnboarding.teamAdminOnlyTitle')}
          </Text>
          <Text size="sm" muted style={styles.center}>
            {t('screens.commerceportal.orgOnboarding.teamAdminOnlyBody', { org: org.display_name })}
          </Text>
        </View>
      ) : (
        <>
          <Text size="sm" muted testID="team-org-name">
            {org.display_name}
          </Text>
          <PartnerOrgRoster orgId={org.id} orgName={org.display_name} onClose={() => navigateToWebPath(BUSINESS_ROUTES.overview)} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 96, gap: 4 },
  block: { paddingVertical: 24 },
  card: { marginTop: 24, borderWidth: 1, borderRadius: 16, padding: 20, gap: 8, alignItems: 'center' },
  dashed: { borderStyle: 'dashed', paddingVertical: 56 },
  center: { textAlign: 'center' },
});
