/**
 * VTID-05531 (native-wave2-events-calendar-r3/events-meetups) — the Maxina event
 * game landing: `/community/event-game` (signed in, the current game) and
 * `/e/game/:slug` (the shareable landing; guests may open it). The native twin of
 * `src/pages/community/EventGamePage.tsx` and `src/pages/EventGamePublicLanding.tsx`:
 * the tenant feature-flag gate, the phase (pre, live, ended), the join action and
 * the leaderboard. The celebration overlay, rules sheet and post CTA are not part of
 * this port.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../auth/AuthProvider';
import { Button, Spinner, Text, useUITheme } from '../../ports/events';
import { eventGamePhase } from './data/eventGame';
import { useEventGame, useEventGameFlag, useEventGameJoin, useEventGameLeaderboard } from './data/hooks';
import { useEventsText } from './text';

const BULLETS = ['eventGame.landing.bulletClimb', 'eventGame.landing.bulletLikes', 'eventGame.landing.bulletPost', 'eventGame.landing.bulletWin'];

export function EventGameScreen({ slug, publicLanding = false }: { slug?: string; publicLanding?: boolean }) {
  const text = useEventsText();
  const { colors } = useUITheme();
  const { user } = useAuth();
  const flag = useEventGameFlag();
  const game = useEventGame(slug);
  const g = game.data ?? null;
  const phase = g ? eventGamePhase(g, new Date()) : null;
  const join = useEventGameJoin(g?.id);
  const board = useEventGameLeaderboard(g?.id, phase === 'live' || phase === 'ended');
  // With no active tenant the flag query never runs: the public landing still shows the game, the signed-in game does not.
  const flagOff = publicLanding ? flag.data === false : flag.data !== true;
  // A guest who taps Join goes through sign-in and comes back to this game (web EventGamePublicLanding.handleJoin).
  const gamePath = publicLanding && slug ? `/e/game/${slug}` : '/community/event-game';
  const onJoin = () => {
    if (user) join.join.mutate();
    else router.push(`/maxina?redirectTo=${encodeURIComponent(gamePath)}` as never);
  };

  if (game.isLoading || flag.isLoading) {
    return (
      <View testID="event-game-loading" style={styles.center}>
        <Spinner />
      </View>
    );
  }
  if (game.isError) {
    return (
      <View testID="event-game-error" style={styles.center}>
        <Text variant="body">{text.t('errors.tryAgain')}</Text>
      </View>
    );
  }
  if (flagOff || !g) {
    return (
      <View testID="event-game-disabled" style={styles.center}>
        <Text variant="body">{text.t('eventGame.landing.disabled')}</Text>
      </View>
    );
  }

  return (
    <ScrollView testID="event-game" contentContainerStyle={styles.content}>
      <Text variant="label" color={colors.mutedForeground}>
        {text.t('eventGame.landing.kicker')}
      </Text>
      <Text variant="title">{text.t('eventGame.landing.title')}</Text>
      {g.description ? <Text variant="body">{g.description}</Text> : null}

      {phase === 'pre' ? (
        <View testID="event-game-pre" style={styles.block}>
          <Text variant="body">{text.t('eventGame.landing.notLivePreBody')}</Text>
        </View>
      ) : null}

      {phase === 'live' ? (
        <View testID="event-game-live" style={styles.block}>
          {BULLETS.map((key) => (
            <Text key={key} variant="body">
              {text.t(key)}
            </Text>
          ))}
          {join.joined ? (
            <Text testID="event-game-joined" variant="title">
              {text.t('eventGame.join.celebrateTitle')}
            </Text>
          ) : (
            <Button testID="event-game-join" disabled={join.join.isPending} onPress={onJoin}>
              {text.t('eventGame.landing.ctaJoin')}
            </Button>
          )}
        </View>
      ) : null}

      {phase === 'ended' ? (
        <View testID="event-game-ended" style={styles.block}>
          <Text variant="title">{text.t('eventGame.landing.notLiveEndedTitle')}</Text>
          <Text variant="body">{text.t('eventGame.landing.notLiveEndedBody')}</Text>
        </View>
      ) : null}

      {phase !== 'pre' ? (
        <View testID="event-game-leaderboard" style={styles.block}>
          <Text variant="label">{text.t('eventGame.landing.ctaLeaderboard')}</Text>
          {(board.data ?? []).map((row, index) => (
            <Text key={row.user_id ?? String(index)} variant="body">
              {`${index + 1}. ${row.display_name ?? '—'} · ${row.score}`}
            </Text>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  center: { alignItems: 'center', gap: 12, padding: 24 },
  block: { gap: 8 },
});
