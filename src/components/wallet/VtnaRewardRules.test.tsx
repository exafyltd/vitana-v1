/**
 * VTID-04864 — Wallet › Rewards renders the VTNA rules from the gateway's
 * rule table: groups, amounts, earned state, caps, never-earns, history.
 */
import { render, screen, within } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RewardOverview } from '@/hooks/useRewardRules';

const mockUseRewardRules = vi.fn();
vi.mock('@/hooks/useRewardRules', () => ({ useRewardRules: () => mockUseRewardRules() }));

import { VtnaRewardRules } from './VtnaRewardRules';

const overview: RewardOverview = {
  ok: true,
  unit: 'VTNA',
  eur_per_vtna: 0.01,
  earned_balance: 70,
  groups: [
    {
      group: 'first_steps',
      rules: [
        { id: 'onboarding_complete', amount: 50, once: true, cap: null, earned: true, used_in_window: null },
        { id: 'first_diary', amount: 15, once: true, cap: null, earned: false, used_in_window: null },
      ],
    },
    { group: 'habits', rules: [{ id: 'diary_streak_3', amount: 20, once: true, cap: null, earned: true, used_in_window: null }] },
    {
      group: 'community',
      rules: [{ id: 'invite_friend_joined', amount: 200, once: false, cap: { count: 10, days: 30 }, earned: false, used_in_window: 2 }],
    },
  ],
  never_earns: ['done_by_vitana', 'purchases', 'self_reported'],
  recent: [{ rule_id: 'diary_streak_3', amount: 20, created_at: '2026-10-02T10:00:00Z' }],
};

describe('VtnaRewardRules (VTID-04864)', () => {
  beforeEach(() => mockUseRewardRules.mockReset());

  it('shows each group with its rules, earned state and amounts', () => {
    mockUseRewardRules.mockReturnValue({ data: overview, isLoading: false, error: null });
    render(<VtnaRewardRules />);

    expect(screen.getByTestId('reward-group-first_steps')).toBeInTheDocument();
    expect(screen.getByTestId('reward-group-habits')).toBeInTheDocument();
    expect(screen.getByTestId('reward-group-community')).toBeInTheDocument();

    const pending = screen.getByTestId('reward-rule-first_diary');
    expect(pending.textContent).toMatch(/\+15 VTNA/);
    const done = screen.getByTestId('reward-rule-onboarding_complete');
    expect(done.textContent).not.toMatch(/\+50 VTNA/); // earned rules show a badge, not an amount to chase
    expect(screen.getByTestId('reward-rule-invite_friend_joined').textContent).toMatch(/2\D+10\D+30/);
    expect(screen.getByTestId('reward-rules-earned-balance').textContent).toMatch(/70 VTNA/);
  });

  it('lists what never earns and the recent rewards', () => {
    mockUseRewardRules.mockReturnValue({ data: overview, isLoading: false, error: null });
    render(<VtnaRewardRules />);
    expect(within(screen.getByTestId('reward-never-earns')).getAllByRole('listitem')).toHaveLength(3);
    expect(within(screen.getByTestId('reward-recent')).getByText(/\+20 VTNA/)).toBeInTheDocument();
  });

  it('shows loading and error states instead of an empty screen', () => {
    mockUseRewardRules.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { unmount } = render(<VtnaRewardRules />);
    expect(screen.getByTestId('reward-rules-loading')).toBeInTheDocument();
    unmount();
    mockUseRewardRules.mockReturnValue({ data: undefined, isLoading: false, error: new Error('x') });
    render(<VtnaRewardRules />);
    expect(screen.getByTestId('reward-rules-error')).toBeInTheDocument();
  });

  it('every rule, group and never-earns label exists in all 11 languages', () => {
    const ids = [
      'onboarding_complete', 'profile_complete', 'first_diary', 'first_group', 'first_event_rsvp',
      'first_connection', 'five_connections', 'first_match_accepted', 'first_health_check',
      'diary_streak_3', 'diary_streak_7', 'diary_streak_30', 'invite_friend_joined', 'invited_friends_10',
    ];
    for (const lc of ['de', 'en', 'es', 'fr', 'pt', 'pl', 'ru', 'sr', 'ar', 'zh', 'tr']) {
      const rr = JSON.parse(readFileSync(join(__dirname, `../../i18n/${lc}/wallet.json`), 'utf8')).wallet.rewardRules;
      for (const id of ids) expect(rr.rules[id], `${lc}: rules.${id}`).toBeTruthy();
      for (const g of ['first_steps', 'habits', 'community']) expect(rr.groups[g], `${lc}: groups.${g}`).toBeTruthy();
      for (const n of ['done_by_vitana', 'purchases', 'self_reported']) expect(rr.never[n], `${lc}: never.${n}`).toBeTruthy();
      expect(rr.amount).toContain('{amount}');
    }
  });

  it('Wallet › Rewards renders the real rules in its first tab and no fake earned cards', () => {
    const page = readFileSync(join(__dirname, '../../pages/wallet/Rewards.tsx'), 'utf8');
    expect(page).toContain('<VtnaRewardRules />');
    expect(page).not.toContain('rewardsData.earned');
    expect(page).toContain('isIAPRestricted()');
  });
});
