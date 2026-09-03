import { useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import {
  useEventGame,
  useEventGameFeatureFlag,
  useEventGamePhase,
  useEventGameJoin,
  useMyEventGameStanding,
} from '@/hooks/useEventGame';

/** Small contextual entry point into the event game from the normal feed
 * (correction #11 — the one deliberate, narrowly-scoped touch of an
 * existing shared page, see Home.tsx). Renders nothing at all unless the
 * feature is enabled, the user is an explicit participant, and the game is
 * currently pre-event or live — so it is invisible and behaviourally
 * identical to today for every non-participant, and disappears the moment
 * the event ends or the feature is disabled. */
export function EventGameFeedBadge() {
  const navigate = useNavigate();
  const flagQuery = useEventGameFeatureFlag();
  const gameQuery = useEventGame();
  const game = gameQuery.data;
  const phase = useEventGamePhase(game);
  const { isParticipant } = useEventGameJoin(game?.id);
  const standing = useMyEventGameStanding(game?.id, { live: true });

  if (!flagQuery.data || !game || !isParticipant) return null;
  if (phase !== 'pre' && phase !== 'live') return null;

  const rank = standing.data?.rank ?? 0;
  const score = standing.data?.score ?? 0;

  return (
    <button
      type="button"
      onClick={() => navigate('/community/event-game')}
      className="w-full flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E3F5FD] to-[#B8E4FA] text-[#1B8FC7] text-sm font-semibold px-4 py-2 mb-3"
    >
      {rank > 0 && <Trophy className="w-4 h-4" />}
      {rank > 0
        ? t('eventGame.feedBadge.rankPoints', { rank, points: score })
        : t('eventGame.join.celebrateScore', { score })}
    </button>
  );
}
