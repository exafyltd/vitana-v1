/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — native twin of the mobile-web Data & Consent
 * screen (`src/pages/sharing/DataConsent.tsx`, non-Spotlight branch): four panels (active permissions,
 * pending requests, privacy, packages — the web shows "coming soon" / overview lines) and the
 * "Manage access" menu opening the grant-access, create-package and privacy-settings sheets.
 */
import { useState, type ReactElement } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Button, Text } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { Page, Panel } from './components';
import { CreatePackageSheet, GrantAccessSheet, PrivacySheet } from './ConsentSheets';

export function DataConsentScreen(): ReactElement {
  const { t } = useI18n();
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState<'grant' | 'package' | 'privacy' | null>(null);
  const choose = (kind: 'grant' | 'package' | 'privacy') => {
    setMenu(false);
    setSheet(kind);
  };
  const panels = [
    ['active', 'screens.sharing.activePermissions', 'screens.sharing.comingSoonViewManageGrantedPermissions'],
    ['pending', 'screens.sharing.pendingRequests', 'screens.sharing.comingSoonReviewPendingConsentRequests'],
    ['privacy', 'screens.sharing.privacy', 'screens.sharing.statusOverview'],
    ['packages', 'screens.sharing.packages', 'screens.sharing.dataPackages'],
  ] as const;
  const items = [
    ['grant', 'consent-grant', 'screens.sharing.grantPermission', 'screens.sharing.allowDataAccessEntity'],
    ['package', 'consent-create-package', 'screens.sharing.createDataPackage', 'screens.sharing.bundleDataForSharing'],
    ['privacy', 'consent-privacy', 'screens.sharing.privacySettings', 'screens.sharing.configureGlobalControls'],
  ] as const;
  return (
    <>
      <Page
        title={t('screens.sharing.dataConsent')}
        description={t('sharingNative.consent.description')}
        testID="consent-screen"
        actions={
          <Button size="sm" onPress={() => setMenu((m) => !m)} testID="consent-manage">
            {t('screens.sharing.manageAccess')}
          </Button>
        }
      >
        {menu ? (
          <Panel testID="consent-menu">
            {items.map(([kind, id, title, sub]) => (
              <Pressable key={kind} accessibilityRole="button" accessibilityLabel={t(title)} onPress={() => choose(kind)} testID={id} style={styles.menuItem}>
                <Text weight="600">{t(title)}</Text>
                <Text variant="caption" muted>
                  {t(sub)}
                </Text>
              </Pressable>
            ))}
          </Panel>
        ) : null}
        {panels.map(([id, title, body]) => (
          <Panel key={id} title={t(title)} testID={`consent-panel-${id}`}>
            <Text size="sm" muted>
              {t(body)}
            </Text>
          </Panel>
        ))}
      </Page>
      <GrantAccessSheet open={sheet === 'grant'} onClose={() => setSheet(null)} />
      <CreatePackageSheet open={sheet === 'package'} onClose={() => setSheet(null)} />
      <PrivacySheet open={sheet === 'privacy'} onClose={() => setSheet(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  menuItem: { paddingVertical: 10, gap: 2 },
});
