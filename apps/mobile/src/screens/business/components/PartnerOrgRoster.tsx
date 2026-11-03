/**
 * VTID-05524 — native twin of src/components/commerce/PartnerOrgRoster.tsx
 * (an org_admin's roster drawer: members, the invite form, pending invites),
 * phone branch: stacked member cards, the invite form stacked, each pending
 * invite with its accept link as selectable text and "Share invite" (the
 * phone's share sheet — the web's `navigator.share`, clipboard fallback).
 * Same calls (`GET /partner-orgs/:id/members`, `/invites`, `POST
 * …/members/invite`). The accept link is the web's
 * `<origin>/commerce/invites/<token>/accept` on this build's web origin.
 */
import { useState, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, notifyError, useUITheme } from '../../../ports/ui';
import { BizIcon, Input, Sheet, SheetContent, SheetHeader, SheetTitle, notifySuccess, shareText, withAlpha } from '../../../ports/business-ui';
import type { OrgInviteRow } from '../../../ports/commerce';
import { useI18n } from '../../../i18n/I18nProvider';
import { webOrigin } from '../data/client';
import { useCreateOrgInvite, useOrgInvites, useOrgMembers } from '../data/hooks';
import { fmtDate } from '../format';
import { orgRoleKey, ToneBadge } from './Cards';
import { CenterSpinner, Panel, SelectField } from './parts';

const ROLE_OPTIONS: OrgInviteRow['role'][] = ['org_admin', 'staff', 'professional'];

export const acceptUrlFor = (token: string) => `${webOrigin()}/commerce/invites/${token}/accept`;

export function PartnerOrgRoster({ orgId, orgName, onClose }: { orgId: string; orgName?: string; onClose: () => void }): ReactElement {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const membersQuery = useOrgMembers(orgId);
  const invitesQuery = useOrgInvites(orgId);
  const createInvite = useCreateOrgInvite(orgId);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgInviteRow['role']>('staff');

  const invite = async () => {
    try {
      await createInvite.mutateAsync({ email: email.trim(), role });
      setEmail('');
      notifySuccess('screens.commerceportal.orgOnboarding.inviteSent');
    } catch {
      notifyError('screens.commerceportal.orgOnboarding.inviteFailed');
    }
  };

  const shareInviteLink = async (inv: OrgInviteRow) => {
    // Dismissing the sheet is not a failure; the link stays on the card as selectable text.
    await shareText(acceptUrlFor(inv.token), t('screens.commerceportal.orgOnboarding.inviteCta'));
  };

  const pendingInvites = (invitesQuery.data ?? []).filter((inv) => !inv.accepted_at);
  const card = [styles.card, { borderColor: colors.border, backgroundColor: withAlpha(colors.muted, 0.4) }];

  return (
    <Sheet open onOpenChange={(open: boolean) => !open && onClose()}>
      <SheetContent side="end" style={styles.sheet} testID="org-roster">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <SheetHeader>
            <SheetTitle>
              <Text size="lg" weight="600" numberOfLines={1} testID="roster-title">
                {orgName ? t('screens.commerceportal.orgOnboarding.rosterTitle', { org: orgName }) : t('screens.commerceportal.orgOnboarding.membersTitle')}
              </Text>
            </SheetTitle>
          </SheetHeader>

          <Panel testID="roster-members">
            <Text size="sm" weight="500">
              {t('screens.commerceportal.orgOnboarding.membersTitle')}
            </Text>
            {membersQuery.isLoading ? (
              <CenterSpinner />
            ) : membersQuery.isError ? (
              <Text size="sm" muted testID="roster-members-failed">
                {t('screens.commerceportal.orgOnboarding.membersLoadFailed')}
              </Text>
            ) : !membersQuery.data || membersQuery.data.length === 0 ? (
              <Text size="sm" muted testID="roster-members-empty">
                {t('screens.commerceportal.orgOnboarding.noMembers')}
              </Text>
            ) : (
              <View style={styles.gap}>
                {membersQuery.data.map((m) => (
                  <View key={m.id} style={[card, styles.between]} testID={`roster-member-${m.id}`}>
                    <ToneBadge label={t(orgRoleKey(m.role))} tone="neutral" />
                    <Text size="xs" muted>
                      {t('screens.commerceportal.orgOnboarding.grantedAt', { date: fmtDate(m.granted_at, language) })}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Panel>

          <Panel testID="roster-invite">
            <Text size="sm" weight="500">
              {t('screens.commerceportal.orgOnboarding.inviteCta')}
            </Text>
            <View style={styles.gap}>
              <Input
                type="email"
                value={email}
                onChangeText={setEmail}
                placeholder={t('screens.commerceportal.orgOnboarding.inviteEmail')}
                accessibilityLabel={t('screens.commerceportal.orgOnboarding.inviteEmail')}
                autoCapitalize="none"
                testID="roster-invite-email"
              />
              <SelectField
                value={role}
                onChange={(v) => setRole(v as OrgInviteRow['role'])}
                options={ROLE_OPTIONS.map((r) => ({ value: r, label: t(orgRoleKey(r)) }))}
                accessibilityLabel={t('screens.commerceportal.orgOnboarding.inviteRole')}
                testID="roster-invite-role"
              />
              <Button disabled={createInvite.isPending || !email.trim()} onPress={() => void invite()} testID="roster-invite-send">
                {createInvite.isPending ? t('screens.commerceportal.orgOnboarding.inviteSending') : t('screens.commerceportal.orgOnboarding.inviteSend')}
              </Button>
            </View>

            <Text size="xs" weight="500" muted style={styles.caps}>
              {t('screens.commerceportal.orgOnboarding.invitesTitle')}
            </Text>
            {invitesQuery.isLoading ? (
              <CenterSpinner />
            ) : invitesQuery.isError ? (
              <Text size="sm" muted testID="roster-invites-failed">
                {t('screens.commerceportal.orgOnboarding.invitesLoadFailed')}
              </Text>
            ) : pendingInvites.length === 0 ? (
              <Text size="sm" muted testID="roster-invites-empty">
                {t('screens.commerceportal.orgOnboarding.noInvites')}
              </Text>
            ) : (
              <View style={styles.gap}>
                {pendingInvites.map((inv) => (
                  <View key={inv.id} style={card} testID={`roster-invite-${inv.id}`}>
                    <View style={styles.between}>
                      <View style={styles.fill}>
                        <Text size="sm" muted numberOfLines={1} style={styles.mono}>
                          {inv.email}
                        </Text>
                        <Text size="xs" muted>
                          {t('screens.commerceportal.orgOnboarding.expiresAt', { date: fmtDate(inv.expires_at, language) })}
                        </Text>
                      </View>
                      <ToneBadge label={t(orgRoleKey(inv.role))} tone="neutral" />
                    </View>
                    <Text size="xs" muted selectable style={styles.mono} testID={`roster-invite-link-${inv.id}`}>
                      {acceptUrlFor(inv.token)}
                    </Text>
                    <Button size="sm" variant="outline" onPress={() => void shareInviteLink(inv)} testID={`roster-share-${inv.id}`}>
                      <BizIcon name="Share2" size={16} />
                      {t('screens.commerceportal.orgOnboarding.shareInvite')}
                    </Button>
                  </View>
                ))}
              </View>
            )}
          </Panel>
        </ScrollView>
      </SheetContent>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheet: { width: '100%' },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  gap: { gap: 8 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  fill: { flex: 1, minWidth: 0 },
  mono: { fontFamily: 'monospace', writingDirection: 'ltr' },
  caps: { textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
});
