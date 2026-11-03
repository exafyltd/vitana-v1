/**
 * VTID-05524 — native twins of src/components/commerce/MyOrgCard.tsx (one of
 * my partner organizations: name, type · role, status badge, manage chevron
 * for an org_admin), ConnectionCard.tsx (one connected business: platform
 * name, state badge, the four-step track, last update) and
 * ConnectionProgress.tsx (connect → mapping → tests → live; an off-track
 * state renders no track). RTL: chevrons mirror, the track runs start → end.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { PressableRow, Text, useUITheme } from '../../../ports/ui';
import { BizIcon, withAlpha } from '../../../ports/business-ui';
import { CONNECTION_STEPS, connectionStepIndex, isConnectionLive, platformName, type ConnectionRow, type MyOrgRow } from '../../../ports/commerce';
import { useI18n } from '../../../i18n/I18nProvider';
import { fmtDateTime } from '../format';

const toPascal = (snake: string) =>
  snake
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');

export const orgStatusKey = (status: string) => `screens.commerceportal.orgOnboarding.status${toPascal(status)}`;
export const orgRoleKey = (role: string) => `screens.commerceportal.orgOnboarding.role${toPascal(role)}`;

type Tone = 'success' | 'error' | 'warning' | 'neutral';

export function ToneBadge({ label, tone, testID }: { label: string; tone: Tone; testID?: string }): ReactElement {
  const { colors } = useUITheme();
  const c = tone === 'success' ? colors.statusSuccess : tone === 'error' ? colors.statusError : tone === 'warning' ? colors.statusWarning : colors.mutedForeground;
  const bg = tone === 'success' ? colors.statusSuccessSubtle : tone === 'error' ? colors.statusErrorSubtle : tone === 'warning' ? colors.statusWarningSubtle : colors.muted;
  return (
    <View testID={testID} style={[styles.badge, { borderColor: tone === 'neutral' ? colors.border : withAlpha(c, 0.4), backgroundColor: bg }]}>
      <Text size="xs" weight="600" color={c} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const orgTone = (status: string): Tone => (status === 'active' ? 'success' : status === 'rejected' || status === 'suspended' ? 'error' : 'warning');

export function MyOrgCard({ org, onManage }: { org: MyOrgRow; onManage: (id: string) => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const canManage = org.role === 'org_admin';
  return (
    <PressableRow
      onPress={() => canManage && onManage(org.id)}
      disabled={!canManage}
      testID={`my-org-${org.id}`}
      accessibilityLabel={canManage ? `${org.display_name} — ${t('screens.commerceportal.orgOnboarding.manageRoster')}` : org.display_name}
      style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}
    >
      <View style={styles.fill}>
        <Text weight="500" numberOfLines={1}>
          {org.display_name}
        </Text>
        <Text size="xs" muted numberOfLines={1}>
          {`${org.org_type} · ${t(orgRoleKey(org.role))}`}
        </Text>
      </View>
      <ToneBadge label={t(orgStatusKey(org.status))} tone={orgTone(org.status)} />
      {canManage ? <BizIcon name="ChevronRight" size={16} color={colors.mutedForeground} flip /> : null}
    </PressableRow>
  );
}

const STEP_LABELS: Record<(typeof CONNECTION_STEPS)[number], string> = {
  connect: 'screens.commerceportal.progress.connect',
  mapping: 'screens.commerceportal.progress.mapping',
  tests: 'screens.commerceportal.progress.tests',
  live: 'screens.commerceportal.progress.live',
};

export function ConnectionProgress({ state }: { state: string }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const active = connectionStepIndex(state);
  if (active === null) {
    return (
      <Text size="xs" muted testID="connection-off-track">
        {t('screens.commerceportal.progress.offTrack')}
      </Text>
    );
  }
  const live = isConnectionLive(state);
  return (
    <View style={styles.track} testID="connection-progress">
      {CONNECTION_STEPS.map((step, i) => {
        const done = i < active || (i === active && live);
        const current = i === active && !live;
        return (
          <View key={step} style={styles.step} testID={`connection-step-${step}`} accessibilityState={{ selected: current }}>
            <View
              style={[
                styles.dot,
                { borderColor: done || current ? colors.primary : colors.border, backgroundColor: done ? colors.primary : 'transparent' },
              ]}
            >
              {done ? (
                <BizIcon name="Check" size={12} color={colors.primaryForeground} />
              ) : (
                <Text size="xs" weight="600" color={current ? colors.primary : colors.mutedForeground}>
                  {String(i + 1)}
                </Text>
              )}
            </View>
            <Text size="xs" numberOfLines={1} color={done || current ? colors.foreground : colors.mutedForeground} style={styles.fill}>
              {t(STEP_LABELS[step])}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const connTone = (state: string): Tone => (state === 'active' ? 'success' : state === 'revoked' || state === 'failed' ? 'error' : state === 'certified' ? 'warning' : 'neutral');

export function ConnectionCard({ row, onOpen }: { row: ConnectionRow; onOpen: (id: string) => void }): ReactElement {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  return (
    <PressableRow
      onPress={() => onOpen(row.id)}
      testID={`connection-${row.id}`}
      accessibilityLabel={`${row.name} — ${t('screens.commerceportal.openWorkbench')}`}
      style={[styles.card, styles.column, { borderColor: colors.border, backgroundColor: colors.card }]}
    >
      <View style={styles.row}>
        <View style={styles.fill}>
          <Text weight="500" numberOfLines={1}>
            {row.name}
          </Text>
          <Text size="xs" muted numberOfLines={1}>
            {platformName(row.connector_id) ?? t('screens.commerceportal.connect.customApi')}
          </Text>
        </View>
        <ToneBadge label={t(`screens.partnerportal.states.${row.state}`)} tone={connTone(row.state)} />
        <BizIcon name="ChevronRight" size={16} color={colors.mutedForeground} flip />
      </View>
      <ConnectionProgress state={row.state} />
      <Text size="xs" muted>
        {fmtDateTime(row.updated_at, language)}
      </Text>
    </PressableRow>
  );
}

export { connTone };

const styles = StyleSheet.create({
  card: { width: '100%', borderWidth: 1, borderRadius: 16, padding: 16, gap: 12, alignItems: 'flex-start' },
  column: { flexDirection: 'column', alignItems: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  fill: { flex: 1, minWidth: 0 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, flexShrink: 0 },
  track: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  step: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
