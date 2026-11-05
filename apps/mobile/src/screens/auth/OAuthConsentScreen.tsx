/**
 * VTID-05449 (native-wave2-public-auth-onboarding-r3/auth-portals) — the
 * AuthGuard `/oauth/consent` screen (src/pages/OAuthConsent.tsx, VTID-03546 /
 * BLK-007): the Vitanaland MCP authorization server's consent page. The member
 * sees which client asks, unticks the scopes they do not approve and allows or
 * denies; the decision goes to the AS (src/auth/oauth-consent.ts), whose
 * answer is the client redirect, opened with the system URL handler.
 *
 * Nothing here can widen scopes: granted = requested ∩ registered ∩ ticked
 * (also enforced by the AS). The AS URL has no default on native — unset →
 * ConfigMissing (`mcpAsUrl`), production refused. Signed-out visitors never
 * reach this screen: the `(app)` AuthGate sends them to `/maxina?redirectTo=`.
 */
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text, useUITheme } from '../../ports/ui';
import { AuthIcon, Checkbox } from '../../ports/auth';
import { ConfigMissingError } from '../../ports/env';
import { useI18n } from '../../i18n/I18nProvider';
import { useAuth } from '../../auth/AuthProvider';
import { consentAsBase, parseConsentRequest, submitConsentDecision } from '../../auth/oauth-consent';
import { ConfigMissing } from '../ConfigMissing';
import { Button, ErrorLine } from './form';

export function OAuthConsentScreen() {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { session } = useAuth();
  const search = useLocalSearchParams<Record<string, string | string[]>>();
  const request = useMemo(() => parseConsentRequest(search), [search]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<readonly string[] | null>(null);
  const token = session?.access_token ?? null;
  const scopeKey = request.scopes.join(' ');

  useEffect(() => {
    // Everything the client asked for starts ticked; the member unticks.
    setChecked(Object.fromEntries(scopeKey.split(' ').filter(Boolean).map((s) => [s, true])));
  }, [scopeKey]);

  if (missing) return <ConfigMissing keys={missing} />;

  const scopeLabel = (scope: string) => {
    const key = `screens.oauthconsent.scopes.${scope}`;
    const label = t(key);
    return label === key ? scope : label;
  };

  const submit = async (approved: boolean) => {
    setWorking(true);
    setError(null);
    try {
      if (approved && !token) {
        setError(t('screens.oauthconsent.noSession'));
        return;
      }
      const approvedScopes = request.scopes.filter((s) => checked[s]);
      if (approved && approvedScopes.length === 0) {
        setError(t('screens.oauthconsent.nothingSelected'));
        return;
      }
      const asBase = consentAsBase();
      const r = await submitConsentDecision({ asBase, params: request.params, accessToken: token ?? '', approved, approvedScopes });
      if (!r.ok) {
        setError(t('screens.oauthconsent.decisionFailed'));
        return;
      }
      await Linking.openURL(r.redirectTo);
    } catch (e) {
      if (e instanceof ConfigMissingError) setMissing(e.keys);
      else setError(t('screens.oauthconsent.decisionFailed'));
    } finally {
      setWorking(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.root} testID="oauth-consent">
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.header}>
          <AuthIcon name="ShieldQuestion" size={32} color={colors.primary} />
          <Text variant="title" accessibilityRole="header" style={styles.center}>
            {t('screens.oauthconsent.title')}
          </Text>
          <Text muted style={styles.center}>
            {t('screens.oauthconsent.clientWants', { client: request.clientName })}
          </Text>
        </View>
        {!request.valid ? (
          <Text style={[styles.center, { color: colors.destructive }]} testID="oauth-consent-invalid">
            {t('screens.oauthconsent.invalidRequest')}
          </Text>
        ) : !token ? (
          <Text muted style={styles.center} testID="oauth-consent-no-session">
            {t('screens.oauthconsent.noSession')}
          </Text>
        ) : (
          <>
            <Text style={{ fontWeight: '500' }}>{t('screens.oauthconsent.scopesIntro')}</Text>
            <View style={styles.scopes}>
              {request.scopes.map((scope) => {
                const label = scopeLabel(scope);
                const toggle = () => setChecked((c) => ({ ...c, [scope]: !c[scope] }));
                return (
                  <View key={scope} style={styles.scopeRow}>
                    <Checkbox
                      testID={`scope-${scope}`}
                      accessibilityLabel={label}
                      checked={checked[scope] ?? false}
                      onCheckedChange={(v) => setChecked((c) => ({ ...c, [scope]: v === true }))}
                    />
                    <Pressable onPress={toggle} accessible={false} style={styles.scopeLabel}>
                      <Text>{label}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
            {error ? <ErrorLine>{error}</ErrorLine> : null}
            <View style={styles.actions}>
              <View style={styles.flex}>
                <Button testID="oauth-consent-approve" label={t('screens.oauthconsent.approve')} busyLabel={t('screens.oauthconsent.working')} busy={working} onPress={() => void submit(true)} />
              </View>
              <View style={styles.flex}>
                <Button testID="oauth-consent-deny" variant="outline" label={t('screens.oauthconsent.deny')} disabled={working} onPress={() => void submit(false)} />
              </View>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 32 },
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 16 },
  header: { alignItems: 'center', gap: 8 },
  center: { textAlign: 'center' },
  scopes: { gap: 8 },
  scopeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  scopeLabel: { flex: 1 },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 8 },
  flex: { flex: 1 },
});
