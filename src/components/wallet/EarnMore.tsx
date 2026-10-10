/**
 * VTID-05037 — Wallet › Rewards › "Mehr verdienen": what the member can
 * still be paid for right now, each with a button to the place where it
 * happens, and how far they are from the nearest Shop item. Real data only:
 * the gateway's reward rules (VTID-04864) and the shop (VTID-04982). It
 * replaces the "Verdienst-Intelligenz" tab, which showed invented numbers.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, Gift, PartyPopper, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { t, useI18nLocale } from '@/lib/i18n-toast';
import { fmtNumber } from '@/lib/locale-format';
import { useRewardRules, type RewardOverview, type RewardOverviewRule } from '@/hooks/useRewardRules';
import { itemText, useRewardShop, type RewardShopItem } from '@/hooks/useRewardShop';

/** Where each rewarded action happens. Every route is a member screen in
 *  src/navigation/registry/screens.json (a test checks it). A rule that is
 *  not listed gets no button. */
export const EARN_ACTION_ROUTES: Record<string, string> = {
  profile_complete: '/me/profile',
  first_diary: '/daily-diary',
  diary_streak_3: '/daily-diary',
  diary_streak_7: '/daily-diary',
  diary_streak_30: '/daily-diary',
  first_group: '/comm/groups',
  first_event_rsvp: '/comm/events-meetups',
  first_connection: '/comm/members',
  five_connections: '/comm/members',
  first_match_accepted: '/me/matches',
  first_health_check: '/health/vitana-index',
  index_new_best: '/health/vitana-index',
  invite_friend_joined: '/invite',
  invited_friends_10: '/invite',
  autopilot_action_done: '/autopilot',
  live_room_15min: '/comm/live-rooms',
};

/** Not something the member can start from here. */
const SKIPPED_RULES = new Set(['onboarding_complete']);
const MAX_ACTIONS = 5;
const GROUP_ORDER: Record<string, number> = { first_steps: 0, habits: 1, community: 2 };

/** Rules that can still pay in their current window, highest reward first. */
export function stillEarnable(overview: RewardOverview): RewardOverviewRule[] {
  const rows: Array<{ rule: RewardOverviewRule; group: number }> = [];
  for (const g of overview.groups) {
    for (const rule of g.rules) {
      if (SKIPPED_RULES.has(rule.id)) continue;
      if (rule.once && rule.earned) continue;
      if (rule.cap && (rule.used_in_window ?? 0) >= rule.cap.count) continue;
      rows.push({ rule, group: GROUP_ORDER[g.group] ?? 9 });
    }
  }
  rows.sort((a, b) => b.rule.amount - a.rule.amount || a.group - b.group);
  return rows.slice(0, MAX_ACTIONS).map((r) => r.rule);
}

/** The cheapest item the member cannot afford yet, or, if they can already
 *  afford something, the most valuable such item. Null with no items. */
export function nextGoal(items: RewardShopItem[], balance: number):
  | { kind: 'save'; item: RewardShopItem; missing: number }
  | { kind: 'redeem'; item: RewardShopItem }
  | null {
  const open = items.filter((i) => i.available);
  if (open.length === 0) return null;
  const affordable = open.filter((i) => i.vtna_price <= balance).sort((a, b) => b.vtna_price - a.vtna_price);
  if (affordable.length > 0) return { kind: 'redeem', item: affordable[0] };
  const cheapest = [...open].sort((a, b) => a.vtna_price - b.vtna_price)[0];
  return { kind: 'save', item: cheapest, missing: cheapest.vtna_price - balance };
}

function capLine(rule: RewardOverviewRule): string | null {
  if (!rule.cap) return null;
  const key = rule.window === 'day'
    ? 'wallet.rewardRules.capToday'
    : rule.window === 'week' ? 'wallet.rewardRules.capWeek' : 'wallet.rewardRules.cap';
  return t(key, {
    used: fmtNumber(rule.used_in_window ?? 0),
    count: fmtNumber(rule.cap.count),
    days: fmtNumber(rule.cap.days),
  });
}

function ActionRow({ rule }: { rule: RewardOverviewRule }) {
  const route = EARN_ACTION_ROUTES[rule.id];
  const cap = capLine(rule);
  return (
    <li className="flex flex-col gap-2 py-3 border-b last:border-b-0" data-testid={`earn-more-action-${rule.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-start">
          <p className="font-medium break-words">{t(`wallet.rewardRules.rules.${rule.id}`)}</p>
          {cap && <p className="text-xs text-muted-foreground">{cap}</p>}
        </div>
        <span className="shrink-0 font-semibold text-emerald-700">
          {t('wallet.rewardRules.amount', { amount: fmtNumber(rule.amount) })}
        </span>
      </div>
      {route && (
        <Button asChild size="sm" variant="secondary" className="self-start min-h-11">
          <Link to={route} data-testid={`earn-more-go-${rule.id}`}>
            {t('wallet.earnMore.go')}
            <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" aria-hidden />
          </Link>
        </Button>
      )}
    </li>
  );
}

function GoalCard({ balance }: { balance: number }) {
  const shop = useRewardShop();
  const locale = useI18nLocale();
  if (!shop.data || shop.error) return null;
  const goal = nextGoal(shop.data.items, balance);
  if (!goal) return null;
  const name = itemText(goal.item.titles, locale, goal.item.slug);
  const pct = Math.min(100, Math.round((balance / goal.item.vtna_price) * 100));
  return (
    <Card data-testid="earn-more-goal">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-5 w-5 text-primary" aria-hidden />
          {t('wallet.earnMore.goalTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {goal.kind === 'save' ? (
          <>
            <p className="text-start" data-testid="earn-more-goal-missing">
              {t('wallet.earnMore.goalMissing', { missing: fmtNumber(goal.missing), item: name })}
            </p>
            <Progress value={pct} aria-label={t('wallet.earnMore.goalProgress', { percent: fmtNumber(pct) })} />
            <p className="text-xs text-muted-foreground">
              {t('wallet.earnMore.goalBalance', { balance: fmtNumber(balance), price: fmtNumber(goal.item.vtna_price) })}
            </p>
          </>
        ) : (
          <>
            <p className="text-start" data-testid="earn-more-goal-redeem">
              {t('wallet.earnMore.goalRedeem', { item: name })}
            </p>
            <Button asChild size="sm" className="min-h-11">
              <Link to="/wallet/rewards?tab=shop" data-testid="earn-more-goal-shop">
                <Gift className="h-4 w-4 me-1" aria-hidden />
                {t('wallet.earnMore.toShop')}
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function EarnMore() {
  const { data, isLoading, error } = useRewardRules();

  if (isLoading) {
    return <p className="text-muted-foreground" data-testid="earn-more-loading">{t('wallet.rewardRules.loading')}</p>;
  }
  if (error || !data) {
    return <p className="text-destructive" data-testid="earn-more-error">{t('wallet.rewardRules.error')}</p>;
  }

  const actions = stillEarnable(data);
  return (
    <div className="space-y-4" data-testid="earn-more">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('wallet.earnMore.title')}</CardTitle>
          <p className="text-sm text-muted-foreground text-start">{t('wallet.earnMore.intro')}</p>
        </CardHeader>
        <CardContent>
          {actions.length > 0 ? (
            <ul data-testid="earn-more-actions">
              {actions.map((r) => <ActionRow key={r.id} rule={r} />)}
            </ul>
          ) : (
            <p className="flex items-center gap-2 text-start" data-testid="earn-more-all-done">
              <PartyPopper className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              {t('wallet.earnMore.allDone')}
            </p>
          )}
        </CardContent>
      </Card>
      <GoalCard balance={data.earned_balance} />
    </div>
  );
}

export default EarnMore;
