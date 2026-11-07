/**
 * VTID-05524 — `/commerce/connect/authorize` (the ledger's one
 * `source: exclusion` commerce row), the native twin of
 * src/pages/CommerceConnectAuthorize.tsx + src/components/ai-connect/CommunityConsent.tsx.
 *
 * The supplier approves their AI assistant: Supabase Auth's OAuth 2.1 server
 * sends them here with `?authorization_id=`. Look the authorization up (an
 * assistant approved before → straight back), ask which product it is for
 * (`ai_connection_authorization_info`): Community → the neutral member
 * consent with per-category switches (categories recorded FIRST, fail
 * closed); Commerce / unknown → the supplier screen (what the assistant may
 * do, "you confirm", the redirect host, Approve / Cancel; a Commerce approval
 * records a `commerce` grant, best effort). The assistant's redirect (the
 * one-time code) is handed to the OS (`Linking.openURL`, the web's
 * `window.location.assign`): it opens the assistant's app or page.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button, Spinner, Text, useUITheme } from '../../ports/ui';
import { BizIcon, Switch, withAlpha } from '../../ports/business-ui';
import { COMMUNITY_CATEGORIES, redirectHostOf, type AuthorizationInfo, type CommunityCategory, type ConsentDetails } from '../../ports/commerce';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { decideConsent, grantFromAuthorization, lookupAuthorizationInfo, lookupConsent } from './data/consent';
import { CollectionSkeleton } from './components/parts';

const K = 'screens.commerceconnect';
const CAN_DO = [`${K}.canDo1`, `${K}.canDo2`, `${K}.canDo3`] as const;

type View_ = { kind: 'loading' } | { kind: 'consent'; details: ConsentDetails; info: AuthorizationInfo | null } | { kind: 'redirecting' } | { kind: 'invalid' };

/** Where the app hands the assistant's redirect (a test seam; the OS opens it). */
export const goTo = { open: (url: string) => void Linking.openURL(url) };

function CommunityConsent({ authorizationId, clientName, redirectHost, email }: { authorizationId: string; clientName: string | null; redirectHost: string | null; email: string | null }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const C = 'aiConnect';
  const [selected, setSelected] = useState<Set<CommunityCategory>>(() => new Set(COMMUNITY_CATEGORIES));
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const client = clientName ?? t(`${C}.settings.unknownClient`);
  const toggle = (c: CommunityCategory, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(c);
      else next.delete(c);
      return next;
    });
  const finish = async (approve: boolean) => {
    setWorking(true);
    setFailed(false);
    try {
      if (approve) await grantFromAuthorization(authorizationId, [...selected]);
      const next = await decideConsent(authorizationId, approve);
      if (!next) throw new Error('no_redirect');
      setRedirecting(true);
      goTo.open(next);
    } catch {
      setFailed(true);
    } finally {
      setWorking(false);
    }
  };
  if (redirecting) {
    return (
      <View style={styles.centerBlock} testID="consent-redirecting">
        <Spinner />
        <Text size="sm" muted>
          {t(`${C}.consent.redirecting`)}
        </Text>
      </View>
    );
  }
  return (
    <View testID="community-consent" style={styles.gap}>
      <BizIcon name="ShieldCheck" size={32} color={colors.primary} />
      <Text size="xl" weight="600">
        {t(`${C}.consent.title`, { client })}
      </Text>
      <Text size="sm" muted>
        {t(`${C}.consent.lead`, { client })}
      </Text>
      {email ? (
        <Text size="xs" muted>
          {t(`${C}.consent.signedInAs`, { email })}
        </Text>
      ) : null}
      <Text size="sm" weight="500">
        {t(`${C}.consent.chooseTitle`, { client })}
      </Text>
      {COMMUNITY_CATEGORIES.map((c) => (
        <View key={c} style={styles.between}>
          <View style={styles.fill}>
            <Text size="sm" weight="500">
              {t(`${C}.categories.${c}`)}
            </Text>
            <Text size="xs" muted>
              {t(`${C}.categories.${c}Desc`)}
            </Text>
          </View>
          <Switch checked={selected.has(c)} onCheckedChange={(on: boolean) => toggle(c, on)} disabled={working} accessibilityLabel={t(`${C}.categories.${c}`)} testID={`consent-category-${c}`} />
        </View>
      ))}
      <View style={[styles.note, { backgroundColor: withAlpha(colors.muted, 0.5) }]}>
        <BizIcon name="Check" size={16} color={colors.mutedForeground} />
        <Text size="xs" muted style={styles.fill}>
          {t(`${C}.consent.readOnly`)}
        </Text>
      </View>
      <View style={[styles.note, { backgroundColor: withAlpha(colors.muted, 0.5) }]} testID="consent-not-shared">
        <BizIcon name="ShieldOff" size={16} color={colors.mutedForeground} />
        <Text size="xs" muted style={styles.fill}>
          {t(`${C}.consent.notShared`)}
        </Text>
      </View>
      {redirectHost ? (
        <View style={[styles.box, { borderColor: colors.border }]} testID="consent-redirect-host">
          <Text size="xs">{t(`${C}.consent.redirectsTo`, { host: redirectHost })}</Text>
        </View>
      ) : null}
      {selected.size === 0 ? (
        <Text size="sm" muted>
          {t(`${C}.consent.noneSelected`)}
        </Text>
      ) : null}
      {failed ? (
        <Text size="sm" color={colors.destructive} accessibilityRole="alert" testID="consent-failed">
          {t(`${C}.consent.failed`)}
        </Text>
      ) : null}
      <Button disabled={working || selected.size === 0} onPress={() => void finish(true)} testID="consent-approve" style={styles.big}>
        {t(`${C}.consent.approve`)}
      </Button>
      <Button variant="outline" disabled={working} onPress={() => void finish(false)} testID="consent-deny" style={styles.big}>
        {t(`${C}.consent.deny`)}
      </Button>
    </View>
  );
}

export function CommerceConnectAuthorizeScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ authorization_id?: string | string[] }>();
  const authorizationId = (Array.isArray(params.authorization_id) ? params.authorization_id[0] : params.authorization_id) ?? '';
  const [view, setView] = useState<View_>({ kind: 'loading' });
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!authorizationId) {
      setView({ kind: 'invalid' });
      return undefined;
    }
    let cancelled = false;
    void lookupConsent(authorizationId).then(async (r) => {
      if (cancelled) return;
      if (r.kind === 'redirect') {
        setView({ kind: 'redirecting' });
        goTo.open(r.url);
      } else if (r.kind === 'consent') {
        const info = await lookupAuthorizationInfo(authorizationId);
        if (cancelled) return;
        setView({ kind: 'consent', details: r.details, info });
      } else setView({ kind: 'invalid' });
    });
    return () => {
      cancelled = true;
    };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setWorking(true);
    setFailed(false);
    try {
      if (approve) await grantFromAuthorization(authorizationId, ['commerce']).catch(() => undefined);
      const next = await decideConsent(authorizationId, approve);
      if (!next) throw new Error('no_redirect');
      setView({ kind: 'redirecting' });
      goTo.open(next);
    } catch {
      setFailed(true);
    } finally {
      setWorking(false);
    }
  };

  const card = [styles.card, { borderColor: withAlpha(colors.primary, 0.2), backgroundColor: colors.card }];

  if (view.kind === 'consent' && view.info?.product === 'community') {
    return (
      <ScrollView style={[styles.root, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} testID="screen-commerce-connect-authorize">
        <View style={[card, { borderColor: colors.border }]}>
          <CommunityConsent authorizationId={authorizationId} clientName={view.details.clientName || view.info.clientName} redirectHost={redirectHostOf(view.details.redirectUri) ?? view.info.redirectHost} email={user?.email ?? null} />
        </View>
      </ScrollView>
    );
  }

  const client = view.kind === 'consent' && view.details.clientName ? view.details.clientName : t(`${K}.unknownClient`);
  const redirectHost = view.kind === 'consent' ? redirectHostOf(view.details.redirectUri) : null;

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} testID="screen-commerce-connect-authorize">
      <View style={card} testID="connect-authorize">
        {view.kind === 'loading' ? (
          <View style={styles.gap} testID="connect-loading">
            <CollectionSkeleton />
            <Text size="sm" muted style={styles.centerText}>
              {t(`${K}.loading`)}
            </Text>
          </View>
        ) : view.kind === 'redirecting' ? (
          <View style={styles.centerBlock} testID="connect-redirecting">
            <Spinner />
            <Text size="sm" muted>
              {t(`${K}.redirecting`)}
            </Text>
          </View>
        ) : view.kind === 'invalid' ? (
          <Text size="sm" muted style={[styles.centerText, styles.pad]} testID="connect-invalid">
            {t(`${K}.invalid`)}
          </Text>
        ) : (
          <View style={styles.gap}>
            <BizIcon name="ShieldCheck" size={32} color={colors.primary} />
            <Text size="xl" weight="600">
              {t(`${K}.title`, { client })}
            </Text>
            <Text size="sm" muted>
              {t(`${K}.lead`, { client })}
            </Text>
            {user?.email ? (
              <Text size="xs" muted>
                {t(`${K}.signedInAs`, { email: user.email })}
              </Text>
            ) : null}
            <Text size="sm" weight="500">
              {t(`${K}.canDoTitle`)}
            </Text>
            {CAN_DO.map((key) => (
              <View key={key} style={styles.row}>
                <BizIcon name="Check" size={16} color={colors.primary} />
                <Text size="sm" muted style={styles.fill}>
                  {t(key)}
                </Text>
              </View>
            ))}
            <View style={[styles.note, { backgroundColor: withAlpha(colors.muted, 0.5) }]}>
              <Text size="xs" muted>
                {t(`${K}.youConfirm`)}
              </Text>
            </View>
            {redirectHost ? (
              <View style={[styles.box, { borderColor: withAlpha(colors.primary, 0.2), backgroundColor: withAlpha(colors.accent, 0.6) }]} testID="connect-redirect-host">
                <Text size="xs">{t(`${K}.redirectsTo`, { host: redirectHost })}</Text>
              </View>
            ) : null}
            {failed ? (
              <Text size="sm" color={colors.destructive} testID="connect-failed">
                {t(`${K}.failed`)}
              </Text>
            ) : null}
            <Button disabled={working} onPress={() => void decide(true)} testID="connect-approve" style={styles.big}>
              {t(`${K}.approve`)}
            </Button>
            <Button variant="outline" disabled={working} onPress={() => void decide(false)} testID="connect-deny" style={styles.big}>
              {t(`${K}.deny`)}
            </Button>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingVertical: 40, paddingBottom: 96 },
  card: { borderWidth: 1, borderRadius: 24, padding: 24 },
  gap: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  fill: { flex: 1, minWidth: 0 },
  note: { flexDirection: 'row', gap: 8, borderRadius: 12, padding: 12 },
  box: { borderWidth: 1, borderRadius: 12, padding: 12 },
  big: { minHeight: 48, borderRadius: 12 },
  centerBlock: { alignItems: 'center', gap: 12, paddingVertical: 32 },
  centerText: { textAlign: 'center' },
  pad: { paddingVertical: 24 },
});
