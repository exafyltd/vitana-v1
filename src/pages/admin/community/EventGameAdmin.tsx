/**
 * Admin Community → Event Game (/admin/community/event-game).
 *
 * Minimal organizer tooling for the Maxina Longevity Game: create/edit the
 * event_games config row (this is where the real Sept 6 2026 starts_at/
 * ends_at get set), view the live leaderboard with inline point
 * corrections (admin_adjust_event_game_points), and a paginated ledger
 * audit view ("why does this user have this score").
 *
 * Direct-Supabase, no new gateway routes — event_games' own
 * "moderators manage event games" RLS policy lets a moderator UPDATE it
 * directly, matching the community_listings precedent; the ledger has no
 * write policy for authenticated at all, so corrections go through the
 * admin_adjust_event_game_points RPC.
 */
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import AdminTabs from '@/components/admin/AdminTabs';
import AdminHeader from '@/components/admin/AdminHeader';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { notifySuccess, notifyError, t } from '@/lib/i18n-toast';
import { fmtDateTime } from '@/lib/locale-format';
import { useTenant } from '@/hooks/useTenant';
import type { EventGame } from '@/hooks/useEventGame';

interface LedgerRow {
  id: string;
  user_id: string;
  point_type: string;
  points: number;
  reason: string | null;
  created_at: string;
}

const EMPTY: Partial<EventGame> = {
  slug: '',
  name: '',
  description: '',
  rules_text: '',
  status: 'draft',
  starts_at: '',
  ends_at: '',
  points_registration: 1,
  points_event_post: 5,
  points_longevity_post: 10,
  points_like_received: 1,
  points_like_received_cap: 100,
  max_posts_per_user: 3,
  winner_reward_text: '',
  winner_reward_description: '',
};

export default function EventGameAdmin() {
  const { activeTenantId } = useTenant();
  const [game, setGame] = useState<Partial<EventGame>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ user_id: string; display_name: string | null; score: number; rank: number }[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const load = async () => {
    if (!activeTenantId) return;
    const { data: games } = await supabase
      .from('event_games' as never)
      .select('*')
      .eq('tenant_id', activeTenantId as never)
      .order('created_at', { ascending: false })
      .limit(1);
    const existing = (games as unknown as EventGame[] | null)?.[0];
    if (existing) setGame(existing);

    if (existing) {
      const { data: lb } = await supabase.rpc('get_event_game_leaderboard' as never, {
        p_event_game_id: existing.id,
        p_limit: 50,
      } as never);
      setLeaderboard((lb as unknown as typeof leaderboard) ?? []);

      const { data: rows } = await supabase
        .from('event_game_points' as never)
        .select('id, user_id, point_type, points, reason, created_at')
        .eq('event_game_id', existing.id as never)
        .order('created_at', { ascending: false })
        .limit(200);
      setLedger((rows as unknown as LedgerRow[]) ?? []);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTenantId]);

  const handleSave = async () => {
    if (!activeTenantId) return;
    setSaving(true);
    try {
      const payload = { ...game };
      if (game.id) {
        const { error } = await supabase.from('event_games' as never).update(payload as never).eq('id', game.id as never);
        if (error) throw error;
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { error, data } = await supabase
          .from('event_games' as never)
          .insert({ ...payload, tenant_id: activeTenantId, created_by: user?.id } as never)
          .select('*')
          .single();
        if (error) throw error;
        setGame(data as unknown as EventGame);
      }
      notifySuccess('eventGame.admin.saved');
      await load();
    } catch (err) {
      console.error('[EventGameAdmin] save failed:', err);
      notifyError('eventGame.admin.saveFailed');
    } finally {
      setSaving(false);
    }
  };

  const handleAdjust = async () => {
    if (!game.id || !adjustUserId || !adjustPoints) return;
    try {
      const { error } = await supabase.rpc('admin_adjust_event_game_points' as never, {
        p_event_game_id: game.id,
        p_user_id: adjustUserId,
        p_points: Number(adjustPoints),
        p_reason: adjustReason || null,
      } as never);
      if (error) throw error;
      notifySuccess('eventGame.admin.saved');
      setAdjustUserId('');
      setAdjustPoints('');
      setAdjustReason('');
      await load();
    } catch (err) {
      console.error('[EventGameAdmin] adjust failed:', err);
      notifyError('eventGame.admin.saveFailed');
    }
  };

  return (
    <AppLayout>
      <AdminTabs sectionKey="community" />
      <div className="p-6 space-y-6">
        <AdminHeader emoji="🏆" title={t('eventGame.admin.title')} description="" />

        <Card className="p-6 space-y-4">
          <h3 className="font-semibold">{t('eventGame.admin.configSection')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('eventGame.admin.nameLabel')}</Label>
              <Input value={game.name ?? ''} onChange={(e) => setGame({ ...game, name: e.target.value })} />
            </div>
            <div>
              <Label>{t('eventGame.admin.slugLabel')}</Label>
              <Input value={game.slug ?? ''} onChange={(e) => setGame({ ...game, slug: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>{t('eventGame.admin.descriptionLabel')}</Label>
              <Textarea value={game.description ?? ''} onChange={(e) => setGame({ ...game, description: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>{t('eventGame.admin.rulesLabel')}</Label>
              <Textarea value={game.rules_text ?? ''} onChange={(e) => setGame({ ...game, rules_text: e.target.value })} />
            </div>
            <div>
              <Label>{t('eventGame.admin.statusLabel')}</Label>
              <select
                className="w-full border rounded-md h-10 px-3"
                value={game.status ?? 'draft'}
                onChange={(e) => setGame({ ...game, status: e.target.value as EventGame['status'] })}
              >
                {['draft', 'scheduled', 'live', 'ended', 'archived'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div />
            <div>
              <Label>{t('eventGame.admin.startsAtLabel')}</Label>
              <Input
                type="datetime-local"
                value={game.starts_at ? game.starts_at.slice(0, 16) : ''}
                onChange={(e) => setGame({ ...game, starts_at: new Date(e.target.value).toISOString() })}
              />
            </div>
            <div>
              <Label>{t('eventGame.admin.endsAtLabel')}</Label>
              <Input
                type="datetime-local"
                value={game.ends_at ? game.ends_at.slice(0, 16) : ''}
                onChange={(e) => setGame({ ...game, ends_at: new Date(e.target.value).toISOString() })}
              />
            </div>
          </div>

          <h3 className="font-semibold pt-2">{t('eventGame.admin.pointsSection')}</h3>
          <div className="grid grid-cols-3 gap-4">
            {([
              ['points_registration', 'pointsRegistration'],
              ['points_event_post', 'pointsEventPost'],
              ['points_longevity_post', 'pointsLongevityPost'],
              ['points_like_received', 'pointsLikeReceived'],
              ['points_like_received_cap', 'pointsLikeCap'],
              ['max_posts_per_user', 'maxPosts'],
            ] as const).map(([field, labelKey]) => (
              <div key={field}>
                <Label>{t(`eventGame.admin.${labelKey}`)}</Label>
                <Input
                  type="number"
                  value={(game as never as Record<string, number>)[field] ?? 0}
                  onChange={(e) => setGame({ ...game, [field]: Number(e.target.value) })}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('eventGame.admin.rewardTextLabel')}</Label>
              <Input value={game.winner_reward_text ?? ''} onChange={(e) => setGame({ ...game, winner_reward_text: e.target.value })} />
            </div>
            <div>
              <Label>{t('eventGame.admin.rewardDescLabel')}</Label>
              <Input value={game.winner_reward_description ?? ''} onChange={(e) => setGame({ ...game, winner_reward_description: e.target.value })} />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving}>{t('eventGame.admin.save')}</Button>
        </Card>

        {game.id && (
          <>
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">{t('eventGame.admin.leaderboardSection')}</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((row) => (
                    <TableRow key={row.user_id}>
                      <TableCell>{row.rank}</TableCell>
                      <TableCell>{row.display_name ?? row.user_id}</TableCell>
                      <TableCell>{row.score}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex gap-2 items-end pt-4">
                <div>
                  <Label>User ID</Label>
                  <Input value={adjustUserId} onChange={(e) => setAdjustUserId(e.target.value)} className="w-64" />
                </div>
                <div>
                  <Label>{t('eventGame.admin.adjustPoints')}</Label>
                  <Input type="number" value={adjustPoints} onChange={(e) => setAdjustPoints(e.target.value)} className="w-24" />
                </div>
                <div className="flex-1">
                  <Label>{t('eventGame.admin.adjustReason')}</Label>
                  <Input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
                </div>
                <Button onClick={handleAdjust}>{t('eventGame.admin.adjustApply')}</Button>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">{t('eventGame.admin.ledgerSection')}</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{fmtDateTime(new Date(row.created_at))}</TableCell>
                      <TableCell className="font-mono text-xs">{row.user_id}</TableCell>
                      <TableCell>{row.point_type}</TableCell>
                      <TableCell>{row.points}</TableCell>
                      <TableCell>{row.reason ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
