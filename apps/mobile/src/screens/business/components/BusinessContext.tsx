/**
 * VTID-05524 — native twin of src/components/commerce/BusinessContext.tsx:
 * which business a setup sheet is working on. One business: "For Demo
 * Studio". Several: "For:" with a selector that switches the business
 * everywhere (same stored choice as the setup hub).
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../ports/ui';
import type { MyOrgRow } from '../../../ports/commerce';
import { useI18n } from '../../../i18n/I18nProvider';
import { SelectField } from './parts';

/** The web's inline "<label>: <select of businesses>". */
export function OrgSelect({ label, org, orgs, onSelectOrg, testID }: { label: string; org: MyOrgRow; orgs: MyOrgRow[]; onSelectOrg: (id: string) => void; testID?: string }): ReactElement {
  return (
    <View style={styles.row} testID={testID}>
      <Text size="sm" muted>
        {label}
      </Text>
      <View style={styles.select}>
        <SelectField value={org.id} onChange={onSelectOrg} options={orgs.map((o) => ({ value: o.id, label: o.display_name }))} accessibilityLabel={label} testID={testID ? `${testID}-select` : undefined} />
      </View>
    </View>
  );
}

export function BusinessContext({ org, orgs = [], onSelectOrg }: { org: MyOrgRow | null; orgs?: MyOrgRow[]; onSelectOrg?: (id: string) => void }): ReactElement | null {
  const { t } = useI18n();
  if (!org) return null;
  if (orgs.length > 1 && onSelectOrg) return <OrgSelect label={t('screens.commerceportal.forBusinessLabel')} org={org} orgs={orgs} onSelectOrg={onSelectOrg} testID="business-context" />;
  return (
    <Text size="sm" weight="500" testID="business-context">
      {t('screens.commerceportal.forBusiness', { name: org.display_name })}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  select: { flex: 1, maxWidth: 224 },
});
