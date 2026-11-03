/**
 * VTID-05524 — `/commerce/invites/:token/accept`, the native twin of
 * src/pages/CommerceAcceptInvite.tsx: accepts the org invite on mount
 * (`POST /partner-orgs/invites/:token/accept`), then lands in the business
 * just joined on that role's home (`businessHomeFor`: the team for an admin,
 * the orders otherwise) with it as the active business; or shows the web's
 * error card (already accepted / expired / not found / wrong e-mail / failed)
 * with "Go to the portal".
 */
import { useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Spinner, Text, useUITheme } from '../../ports/ui';
import { BizIcon, withAlpha, type BizGlyph } from '../../ports/business-ui';
import { PARTNER_ORGS_API } from '../../ports/commerce';
import { businessHomeFor } from '../../ports/core';
import { activeOrgStore } from '../../identity/device-storage';
import { navigateToWebPath } from '../../navigation/navigate';
import { useI18n } from '../../i18n/I18nProvider';
import { commerceFetch } from './data/client';

type State = 'pending' | 'success' | 'already' | 'expired' | 'notFound' | 'wrongEmail' | 'failed';

export function inviteStateFor(message: string): Exclude<State, 'pending' | 'success'> {
  if (/INVITE_EMAIL_(MISMATCH|UNVERIFIED)/.test(message)) return 'wrongEmail';
  if (/already accepted/i.test(message)) return 'already';
  if (/expired/i.test(message)) return 'expired';
  if (/not found/i.test(message)) return 'notFound';
  return 'failed';
}

const COPY: Record<Exclude<State, 'pending' | 'success'>, { icon: BizGlyph; key: string }> = {
  already: { icon: 'Clock', key: 'screens.commerceportal.orgOnboarding.acceptAlready' },
  expired: { icon: 'Clock', key: 'screens.commerceportal.orgOnboarding.acceptExpired' },
  notFound: { icon: 'XCircle', key: 'screens.commerceportal.orgOnboarding.acceptNotFound' },
  wrongEmail: { icon: 'XCircle', key: 'screens.commerceportal.orgOnboarding.acceptWrongEmail' },
  failed: { icon: 'XCircle', key: 'screens.commerceportal.orgOnboarding.acceptFailed' },
};

export function CommerceAcceptInviteScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const qc = useQueryClient();
  const { token: raw } = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(raw) ? raw[0] : raw;
  const [state, setState] = useState<State>('pending');

  useEffect(() => {
    if (!token) {
      setState('notFound');
      return undefined;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await commerceFetch(`${PARTNER_ORGS_API}/invites/${token}/accept`, { method: 'POST' });
        if (cancelled) return;
        setState('success');
        const orgId: string | undefined = res?.partner_organization_id;
        if (orgId) activeOrgStore.set(orgId);
        // The new membership changes the business modes on offer (switcher, drawer, bottom bar).
        void qc.invalidateQueries({ queryKey: ['commerce', 'partner-orgs-mine'] });
        void qc.invalidateQueries({ queryKey: ['partner-orgs-mine'] });
        navigateToWebPath(orgId ? businessHomeFor(res?.role ?? 'staff') : '/commerce', { replace: true });
      } catch (err) {
        if (cancelled) return;
        setState(inviteStateFor(err instanceof Error ? err.message : ''));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, qc]);

  if (state === 'pending' || state === 'success') {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]} testID="screen-commerce-accept-invite">
        <Spinner accessibilityLabel={t('screens.commerceportal.orgOnboarding.acceptPending')} />
        <Text size="sm" muted testID="invite-pending">
          {t('screens.commerceportal.orgOnboarding.acceptPending')}
        </Text>
      </View>
    );
  }
  const { icon, key } = COPY[state];
  return (
    <View style={[styles.root, styles.center, { backgroundColor: colors.background }]} testID="screen-commerce-accept-invite">
      <View style={[styles.card, { borderColor: withAlpha(colors.statusWarning, 0.25), backgroundColor: colors.card }]} testID={`invite-${state}`}>
        <BizIcon name={icon} size={32} color={colors.statusWarning} />
        <Text size="sm" muted style={styles.text}>
          {t(key)}
        </Text>
        <Button onPress={() => navigateToWebPath('/commerce')} testID="invite-go-portal">
          <BizIcon name="CheckCircle2" size={16} color={colors.primaryForeground} />
          {t('screens.commerceportal.orgOnboarding.goToPortal')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  card: { maxWidth: 384, borderWidth: 1, borderRadius: 24, padding: 24, gap: 12, alignItems: 'center' },
  text: { textAlign: 'center' },
});
