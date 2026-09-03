import { useEffect, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { t } from '@/lib/i18n-toast';
import { useAuth } from '@/context/AuthProvider';
import { useEventGameLeaderboard, type EventGameLeaderboardRow } from '@/hooks/useEventGame';
import { EventGameCelebration } from '@/components/event-game/EventGameCelebration';

interface EventGameLeaderboardViewProps {
  eventGameId: string;
  live: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Row({ row, highlight }: { row: EventGameLeaderboardRow; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-xl ${highlight ? 'bg-[#E3F5FD] font-semibold' : ''}`}>
      {row.rank === 1 ? (
        <span className="w-8 h-8 shrink-0 rounded-full bg-[#1B8FC7] flex items-center justify-center">
          <Trophy className="w-4 h-4 text-white" />
        </span>
      ) : row.rank <= 3 ? (
        <span className="w-8 h-8 shrink-0 rounded-full bg-[#E3F5FD] text-[#1B8FC7] font-bold flex items-center justify-center text-sm">
          #{row.rank}
        </span>
      ) : (
        <span className="w-8 text-center text-muted-foreground">#{row.rank}</span>
      )}
      {row.avatar_url ? (
        <img
          src={row.avatar_url}
          alt=""
          className={`w-8 h-8 rounded-full object-cover ${row.rank <= 3 ? 'ring-2 ring-white shadow-sm' : ''}`}
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-muted" />
      )}
      <span className="flex-1 truncate">{row.display_name ?? '—'}</span>
      <span className="tabular-nums">{row.score}</span>
    </div>
  );
}

/** The central game screen — top 3, then the current user's own position
 * with nearby neighbours ("6 points to #7") rather than just their absolute
 * rank, per the spec's own instruction not to bury a far-down player. */
export function EventGameLeaderboardView({ eventGameId, live, open, onOpenChange }: EventGameLeaderboardViewProps) {
  const { user } = useAuth();
  const leaderboard = useEventGameLeaderboard(eventGameId, { live, limit: 200 });
  const rows = leaderboard.data ?? [];
  const top3 = rows.slice(0, 3);
  const myIndex = rows.findIndex((r) => r.user_id === user?.id);
  const nearby = myIndex >= 0 ? rows.slice(Math.max(0, myIndex - 1), myIndex + 2) : [];
  const myRow = myIndex >= 0 ? rows[myIndex] : null;
  const aboveRow = myIndex > 0 ? rows[myIndex - 1] : null;
  const pointsToNext = aboveRow && myRow ? aboveRow.score - myRow.score : null;

  const prevRankRef = useRef<number | null>(null);
  const [rankChange, setRankChange] = useState<{ from: number; to: number; direction: 'up' | 'down' } | null>(null);

  useEffect(() => {
    if (!myRow) return;
    const prev = prevRankRef.current;
    if (prev !== null && prev !== myRow.rank) {
      // Selective, not on every tick: only surface a real change once we
      // already have a baseline for this session.
      setRankChange({ from: prev, to: myRow.rank, direction: myRow.rank < prev ? 'up' : 'down' });
    }
    prevRankRef.current = myRow.rank;
  }, [myRow?.rank]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader
          className="text-center"
          style={{ background: 'linear-gradient(to bottom, #FFFFFF 0%, #E3F5FD 100%)' }}
        >
          <DrawerTitle className="text-2xl text-[#1B8FC7]">{t('eventGame.leaderboard.title')}</DrawerTitle>
          <div className="text-xs uppercase tracking-wide text-[#4A7688]">{t('eventGame.leaderboard.subtitle')}</div>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-6">
          {rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('eventGame.leaderboard.empty')}</p>
          ) : (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-2 mb-1">
                {t('eventGame.leaderboard.top3')}
              </div>
              {top3.map((row) => (
                <Row key={row.user_id} row={row} highlight={row.user_id === user?.id} />
              ))}

              {myRow && myIndex >= 3 && (
                <>
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#1B8FC7] mt-4 mb-1">
                    {t('eventGame.leaderboard.you')}
                  </div>
                  {pointsToNext !== null && pointsToNext > 0 && (
                    <div className="text-sm text-center text-[#1B8FC7] font-medium mb-1">
                      {t('eventGame.leaderboard.pointsToNext', { points: pointsToNext, rank: aboveRow!.rank })}
                    </div>
                  )}
                  {nearby.map((row) => (
                    <Row key={row.user_id} row={row} highlight={row.user_id === user?.id} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </DrawerContent>

      {rankChange && (
        <EventGameCelebration
          open={!!rankChange}
          onOpenChange={(o) => !o && setRankChange(null)}
          confetti={rankChange.direction === 'up'}
          title={rankChange.direction === 'up' ? t('eventGame.leaderboard.movingUpTitle') : t('eventGame.leaderboard.overtakenTitle')}
          subtitle={
            rankChange.direction === 'up'
              ? t('eventGame.leaderboard.movingUpChange', { from: rankChange.from, to: rankChange.to })
              : t('eventGame.leaderboard.overtakenChange', { rank: rankChange.to })
          }
        />
      )}
    </Drawer>
  );
}
