/**
 * VTID-05524 — native twin of src/components/commerce/SetupChooser.tsx ("Add
 * your products or services": AI-assisted setup · connect my existing shop ·
 * add products myself · connect via API). Each option opens what already
 * exists; "In development" on the AI option until AI setup is switched on.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useUITheme } from '../../../ports/ui';
import { ResponsiveDialog, ResponsiveDialogBody, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, withAlpha, type BizGlyph } from '../../../ports/business-ui';
import type { MyOrgRow, SetupOption } from '../../../ports/commerce';
import { useI18n } from '../../../i18n/I18nProvider';
import { BusinessContext } from './BusinessContext';
import { ChoiceRow } from './parts';

export const SETUP_OPTIONS: ReadonlyArray<{ id: SetupOption; title: string; hint: string; icon: BizGlyph; inDevelopment?: boolean }> = [
  { id: 'ai', title: 'screens.commerceportal.setupChooser.aiTitle', hint: 'screens.commerceportal.setupChooser.aiHint', icon: 'Bot', inDevelopment: true },
  { id: 'shop', title: 'screens.commerceportal.setupChooser.shopTitle', hint: 'screens.commerceportal.setupChooser.shopHint', icon: 'Store' },
  { id: 'manual', title: 'screens.commerceportal.setupChooser.manualTitle', hint: 'screens.commerceportal.setupChooser.manualHint', icon: 'PackagePlus' },
  { id: 'api', title: 'screens.commerceportal.setupChooser.apiTitle', hint: 'screens.commerceportal.setupChooser.apiHint', icon: 'Code2' },
];

export function SetupChooser({
  open,
  onOpenChange,
  onChoose,
  org = null,
  orgs = [],
  onSelectOrg,
  aiReady = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (option: SetupOption) => void;
  org?: MyOrgRow | null;
  orgs?: MyOrgRow[];
  onSelectOrg?: (id: string) => void;
  aiReady?: boolean;
}): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent fullscreenOnMobile testID="setup-chooser">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            <Text size="2xl" weight="700">
              {t('screens.commerceportal.setupChooser.title')}
            </Text>
          </ResponsiveDialogTitle>
          <BusinessContext org={org} orgs={orgs} onSelectOrg={onSelectOrg} />
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          <View style={styles.list}>
            {SETUP_OPTIONS.map(({ id, title, hint, icon, inDevelopment }) => (
              <ChoiceRow
                key={id}
                icon={icon}
                title={t(title)}
                hint={t(hint)}
                testID={`setup-option-${id}`}
                onPress={() => {
                  onOpenChange(false);
                  onChoose(id);
                }}
                trailing={
                  inDevelopment && !aiReady ? (
                    <View style={[styles.badge, { borderColor: withAlpha(colors.statusWarning, 0.5) }]} testID="setup-option-ai-in-development">
                      <Text size="xs" weight="500" color={colors.statusWarning}>
                        {t('screens.commerceportal.setupChooser.inDevelopment')}
                      </Text>
                    </View>
                  ) : null
                }
              />
            ))}
          </View>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
});
