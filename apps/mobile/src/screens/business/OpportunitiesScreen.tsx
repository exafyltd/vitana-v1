/**
 * VTID-05645 (native-wave2-sharing-business-r3/business-hub) — native port of Business Hub
 * Opportunities (`src/pages/BusinessOpportunities.tsx`, `/business/opportunities`): the provider's
 * incoming commercial_sell leads (`GET /intent-matches/incoming`), Pro (reseller) gated. Loading,
 * empty and error states match the web; each lead offers Express interest and Decline (the web
 * match card's two calls). The web dispute modal and the DiceBear avatar fallback are not ported
 * (initials are shown instead; no third-party image request). React 19: typed with `ReactElement`.
 */
import { type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Text, notify, notifyError, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { EmptyState, ErrorState, LoadingRows, Surface } from './components';
import { useIncomingLeads, useIsReseller, useMatchActions } from './data/queries';
import type { IntentMatch } from './data/types';

function initialsOf(name: string | null | undefined): string {
  if (!name) return '?';
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0]?.toUpperCase())
      .join('')
      .slice(0, 2) || '?'
  );
}

function LeadCard({ match, onChanged }: { match: IntentMatch; onChanged: () => void }) {
  const { t } = useI18n();
  const { interest, decline } = useMatchActions(onChanged);
  const counterparty = match.vitana_id_a;
  const redacted = !counterparty && (match.redacted || match.kind_pairing.startsWith('partner_seek'));
  const busy = interest.isPending || decline.isPending;
  const closed = match.state === 'declined' || match.state === 'closed';
  const onInterest = () =>
    interest.mutate(match.match_id, {
      onSuccess: () => notify('toasts.intents.interestRecorded'),
      onError: () => notifyError('toasts.intents.couldNotRecordInterest'),
    });
  const onDecline = () =>
    decline.mutate(match.match_id, {
      onSuccess: () => notify('toasts.intents.declined'),
      onError: () => notifyError('toasts.intents.couldNotDecline'),
    });
  return (
    <Surface testID={`lead-${match.match_id}`}>
      <View style={styles.row}>
        <Avatar uri={redacted ? null : match.partner_avatar_url} fallback={redacted ? '?' : initialsOf(match.partner_display_name ?? counterparty)} size={44} />
        <View style={styles.fill}>
          {redacted ? (
            <Text weight="600" muted>
              {t('screens.intents.anonymousMatch')}
            </Text>
          ) : (
            <>
              {match.partner_display_name ? <Text weight="600">{match.partner_display_name}</Text> : null}
              <Text variant={match.partner_display_name ? 'caption' : 'body'} weight={match.partner_display_name ? '400' : '600'} muted={!!match.partner_display_name}>
                @{counterparty ?? '—'}
              </Text>
            </>
          )}
          <Text variant="caption" muted>
            {match.kind_pairing.replace('::', ' ↔ ')}
          </Text>
        </View>
        <View>
          <Text weight="700">{t('businessNative.opportunities.matchScore', { score: Math.round(match.score * 100) })}</Text>
          {match.compass_aligned ? (
            <Text variant="caption" muted>
              {t('screens.intents.compassaligned')}
            </Text>
          ) : null}
        </View>
      </View>
      {closed ? (
        <Text variant="caption" muted testID={`lead-state-${match.match_id}`}>
          {t('businessNative.opportunities.matchState', { state: match.state })}
        </Text>
      ) : (
        <View style={styles.row}>
          <Button size="sm" disabled={busy} onPress={onInterest} testID={`lead-interest-${match.match_id}`}>
            {t('businessNative.opportunities.expressInterest')}
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onPress={onDecline} testID={`lead-decline-${match.match_id}`}>
            {t('businessNative.opportunities.decline')}
          </Button>
        </View>
      )}
    </Surface>
  );
}

export function OpportunitiesScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { isReseller, isLoading: roleLoading } = useIsReseller();
  const q = useIncomingLeads(isReseller);
  const matches = q.data ?? [];
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page} testID="screen-business-opportunities">
      <Button variant="ghost" size="sm" onPress={() => navigateToWebPath('/business')} testID="opportunities-back">
        {t('screens.businessopportunities.backBusinessHub')}
      </Button>
      <View>
        <Text variant="title" accessibilityRole="header">
          {t('screens.businessopportunities.opportunities')}
        </Text>
        <Text muted>{t('screens.businessopportunities.incomingLeadsMatchingYourOfferingsExpress')}</Text>
      </View>
      {roleLoading ? (
        <LoadingRows testID="opportunities-loading" />
      ) : !isReseller ? (
        <EmptyState testID="opportunities-locked" glyph="🔒" title={t('screens.businessopportunities.opportunitiesAvailableForProAccountsUpgrade')} />
      ) : q.isPending ? (
        <LoadingRows testID="opportunities-loading" />
      ) : q.isError ? (
        <ErrorState testID="opportunities-error" message={t('toasts.businessopportunities.couldNotLoadOpportunities')} retryLabel={t('communityHubNative.common.retry')} onRetry={() => void q.refetch()} />
      ) : matches.length === 0 ? (
        <EmptyState
          testID="opportunities-empty"
          glyph="🎯"
          title={t('screens.businessopportunities.noLeadsYetWeLlNotify')}
          action={{ label: t('screens.businessopportunities.myListings'), onPress: () => navigateToWebPath('/business/listings') }}
        />
      ) : (
        <View style={styles.list} testID="opportunities-list">
          {matches.map((m) => (
            <LeadCard key={m.match_id} match={m} onChanged={() => void q.refetch()} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12 },
  list: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fill: { flex: 1 },
});
