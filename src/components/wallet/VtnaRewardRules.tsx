/**
 * VTID-04864 — Wallet → Rewards: how a member earns VTNA, what they have
 * already earned, and what never earns. Everything shown comes from the
 * gateway's one rule table, so the screen can only promise rewards the
 * system actually pays.
 */
import { CheckCircle2, Circle, Sparkles, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { t } from '@/lib/i18n-toast';
import { fmtDate, fmtNumber } from '@/lib/locale-format';
import { useRewardRules, type RewardOverviewRule } from '@/hooks/useRewardRules';

function RuleRow({ rule }: { rule: RewardOverviewRule }) {
  const done = rule.earned;
  return (
    <li
      className="flex items-center justify-between gap-3 py-3 border-b last:border-b-0"
      data-testid={`reward-rule-${rule.id}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {done ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        ) : (
          <Circle className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <div className="min-w-0 text-start">
          <p className="font-medium break-words">{t(`wallet.rewardRules.rules.${rule.id}`)}</p>
          {rule.cap && (
            <p className="text-xs text-muted-foreground">
              {t('wallet.rewardRules.cap', {
                used: fmtNumber(rule.used_in_window ?? 0),
                count: fmtNumber(rule.cap.count),
                days: fmtNumber(rule.cap.days),
              })}
            </p>
          )}
        </div>
      </div>
      {done ? (
        <Badge variant="secondary" className="shrink-0">{t('wallet.rewardRules.earned')}</Badge>
      ) : (
        <span className="shrink-0 font-semibold text-primary">
          {t('wallet.rewardRules.amount', { amount: fmtNumber(rule.amount) })}
        </span>
      )}
    </li>
  );
}

export function VtnaRewardRules() {
  const { data, isLoading, error } = useRewardRules();

  if (isLoading) {
    return <p className="text-muted-foreground" data-testid="reward-rules-loading">{t('wallet.rewardRules.loading')}</p>;
  }
  if (error || !data) {
    return <p className="text-destructive" data-testid="reward-rules-error">{t('wallet.rewardRules.error')}</p>;
  }

  return (
    <div className="space-y-6" data-testid="vtna-reward-rules">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden />
            {t('wallet.rewardRules.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-start">{t('wallet.rewardRules.summary')}</p>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-sm text-muted-foreground">{t('wallet.rewardRules.earnedBalance')}</span>
            <span className="text-2xl font-bold" data-testid="reward-rules-earned-balance">
              {t('wallet.rewardRules.amountPlain', { amount: fmtNumber(data.earned_balance) })}
            </span>
            <span className="text-xs text-muted-foreground">{t('wallet.rewardRules.value')}</span>
          </div>
        </CardContent>
      </Card>

      {data.groups.map((g) => (
        <Card key={g.group} data-testid={`reward-group-${g.group}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t(`wallet.rewardRules.groups.${g.group}`)}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul>
              {g.rules.map((r) => <RuleRow key={r.id} rule={r} />)}
            </ul>
          </CardContent>
        </Card>
      ))}

      <Card data-testid="reward-never-earns">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('wallet.rewardRules.neverTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.never_earns.map((k) => (
              <li key={k} className="flex items-center gap-3 text-start">
                <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span>{t(`wallet.rewardRules.never.${k}`)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card data-testid="reward-recent">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('wallet.rewardRules.recentTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent.length === 0 ? (
            <p className="text-muted-foreground text-start">{t('wallet.rewardRules.recentEmpty')}</p>
          ) : (
            <ul>
              {data.recent.map((r, i) => (
                <li key={`${r.created_at}-${i}`} className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0">
                  <div className="min-w-0 text-start">
                    <p className="break-words">
                      {r.rule_id ? t(`wallet.rewardRules.rules.${r.rule_id}`) : t('wallet.rewardRules.recentOther')}
                    </p>
                    <p className="text-xs text-muted-foreground">{fmtDate(new Date(r.created_at))}</p>
                  </div>
                  <span className="shrink-0 font-semibold text-emerald-700">
                    {t('wallet.rewardRules.amount', { amount: fmtNumber(r.amount) })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default VtnaRewardRules;
