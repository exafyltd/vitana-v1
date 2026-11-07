/**
 * VTID-05424 (Native Wave 2, wallet-rewards lane) — the "Verdient" tab, a port
 * of src/components/wallet/VtnaRewardRules.tsx (VTID-04864): how a member earns
 * VTNA, what they have already earned and what never earns, all from the
 * gateway's one rule table. Same sections, order, wording keys and states
 * (loading / error / loaded). The web's decorative lucide icons
 * (CheckCircle2 / Circle / Sparkles / XCircle) are drawn with the shell icon
 * set's Check where it has one; the others are omitted (aria-hidden on the web).
 * React 19: `ReactElement`.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Card, CardContent, CardHeader, CardTitle, Icon, Text, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { fmtDate, fmtNumber } from './format';
import { capKey, useRewardRules, type RewardOverviewRule } from './data/rewards';

function RuleRow({ rule, last }: { rule: RewardOverviewRule; last: boolean }): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const done = rule.earned;
  return (
    <View style={[styles.row, last ? null : { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]} testID={`reward-rule-${rule.id}`}>
      <View style={styles.rowMain}>
        <View style={[styles.dot, { borderColor: done ? colors.statusSuccess : colors.mutedForeground }]}>
          {done ? <Icon name="Check" size={12} color={colors.statusSuccess} /> : null}
        </View>
        <View style={styles.fill}>
          <Text weight="500">{t(`wallet.rewardRules.rules.${rule.id}`)}</Text>
          {rule.cap ? (
            <Text size="xs" muted testID={`reward-rule-cap-${rule.id}`}>
              {t(capKey(rule), {
                used: fmtNumber(locale, rule.used_in_window ?? 0),
                count: fmtNumber(locale, rule.cap.count),
                days: fmtNumber(locale, rule.cap.days),
              })}
            </Text>
          ) : null}
        </View>
      </View>
      {done ? (
        <Badge variant="secondary">{t('wallet.rewardRules.earned')}</Badge>
      ) : (
        <Text weight="600" color={colors.primary}>
          {t('wallet.rewardRules.amount', { amount: fmtNumber(locale, rule.amount) })}
        </Text>
      )}
    </View>
  );
}

export function RewardRules(): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const { data, isPending, error } = useRewardRules();

  if (isPending) {
    return (
      <Text muted testID="reward-rules-loading">
        {t('wallet.rewardRules.loading')}
      </Text>
    );
  }
  if (error || !data) {
    return (
      <Text color={colors.destructive} testID="reward-rules-error">
        {t('wallet.rewardRules.error')}
      </Text>
    );
  }

  return (
    <View style={styles.stack} testID="vtna-reward-rules">
      <Card>
        <CardHeader>
          <CardTitle>{t('wallet.rewardRules.title')}</CardTitle>
        </CardHeader>
        <CardContent style={styles.gap}>
          <Text>{t('wallet.rewardRules.summary')}</Text>
          <View style={styles.balanceRow}>
            <Text size="sm" muted>
              {t('wallet.rewardRules.earnedBalance')}
            </Text>
            <Text size="2xl" weight="700" testID="reward-rules-earned-balance">
              {t('wallet.rewardRules.amountPlain', { amount: fmtNumber(locale, data.earned_balance) })}
            </Text>
            <Text size="xs" muted>
              {t('wallet.rewardRules.value', {
                rate: fmtNumber(locale, data.eur_per_vtna, { style: 'currency', currency: 'EUR', maximumFractionDigits: 4 }),
              })}
            </Text>
          </View>
        </CardContent>
      </Card>

      {data.groups.map((g) => (
        <Card key={g.group} testID={`reward-group-${g.group}`}>
          <CardHeader>
            <CardTitle>{t(`wallet.rewardRules.groups.${g.group}`)}</CardTitle>
          </CardHeader>
          <CardContent>
            {g.rules.map((r, i) => (
              <RuleRow key={r.id} rule={r} last={i === g.rules.length - 1} />
            ))}
          </CardContent>
        </Card>
      ))}

      <Card testID="reward-never-earns">
        <CardHeader>
          <CardTitle>{t('wallet.rewardRules.neverTitle')}</CardTitle>
        </CardHeader>
        <CardContent style={styles.gap}>
          {data.never_earns.map((k) => (
            <Text key={k}>{t(`wallet.rewardRules.never.${k}`)}</Text>
          ))}
        </CardContent>
      </Card>

      <Card testID="reward-recent">
        <CardHeader>
          <CardTitle>{t('wallet.rewardRules.recentTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent.length === 0 ? (
            <Text muted>{t('wallet.rewardRules.recentEmpty')}</Text>
          ) : (
            data.recent.map((r, i) => (
              <View
                key={`${r.created_at}-${i}`}
                style={[styles.row, i === data.recent.length - 1 ? null : { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
              >
                <View style={styles.fill}>
                  <Text>{r.rule_id ? t(`wallet.rewardRules.rules.${r.rule_id}`) : t('wallet.rewardRules.recentOther')}</Text>
                  <Text size="xs" muted>
                    {fmtDate(locale, r.created_at)}
                  </Text>
                </View>
                <Text weight="600" color={colors.statusSuccess}>
                  {t('wallet.rewardRules.amount', { amount: fmtNumber(locale, r.amount) })}
                </Text>
              </View>
            ))
          )}
        </CardContent>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 24 },
  gap: { gap: 12 },
  fill: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12 },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  balanceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 16, rowGap: 4 },
});
