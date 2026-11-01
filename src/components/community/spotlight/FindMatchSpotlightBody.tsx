import type { ReactNode } from 'react';
import { Heart, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VCard } from '@/components/ui/vcard';
import { ArchetypeSkeleton, SpotlightGrid } from '@/components/layout/spotlight';
import { canGreetMatch, matchToVCard } from '@/components/ui/vcard/adapters';
import type { FindPartnerMatch } from '@/lib/intentApi';
import { t } from '@/lib/i18n-toast';
import { SocialVCard } from './SocialVCard';

/**
 * VTID-05418 — Find a Match "My Matches" on desktop Spotlight (contract SR-31,
 * owner-approved mock `find-a-match-proposed.png`, 2026-10-31):
 *   - the top match is the one Spotlight card (match %, shared goals,
 *     Say hello + View profile);
 *   - the next six matches sit 3 x 2 beside it as `standard` cards;
 *   - any further matches follow as one "More people with your goals" row of
 *     `compact` cards.
 * Tiles are never fabricated (SR-13 / D4): fewer matches → fewer tiles.
 *
 * Presentational only: the page keeps every handler and passes them in.
 * "Say hello" is the page's existing express-interest action; nothing new is
 * written and no new endpoint is called.
 */
export interface FindMatchSpotlightBodyProps {
  matches: FindPartnerMatch[];
  loading: boolean;
  /** Shown instead of the grid when there are no matches (the page's existing empty / suggestions state). */
  empty: ReactNode;
  onSayHello: (match: FindPartnerMatch) => void;
  onViewProfile: (match: FindPartnerMatch) => void;
  /** match_id whose Say hello is in flight (disables its button). */
  busyMatchId?: string | null;
}

const TILE_COUNT = 6;

export function FindMatchSpotlightBody({
  matches,
  loading,
  empty,
  onSayHello,
  onViewProfile,
  busyMatchId = null,
}: FindMatchSpotlightBodyProps) {
  if (loading && matches.length === 0) {
    return <ArchetypeSkeleton archetype="collection" layout="spotlight-grid" />;
  }
  const [top, ...rest] = matches;
  if (!top) return <>{empty}</>;

  const topData = matchToVCard(top);
  const tiles = rest.slice(0, TILE_COUNT);
  const more = rest.slice(TILE_COUNT);
  const canOpen = (m: FindPartnerMatch) => !!matchToVCard(m).href;

  const spotlight = (
    <VCard
      size="spotlight"
      spotlightLabel
      priority
      media={topData.media}
      eyebrow={`${t('spotlight.grid.match.topMatch')} · ${topData.eyebrow}`}
      title={topData.title}
      meta={topData.meta}
      body={topData.body ? <span className="line-clamp-3">{topData.body}</span> : undefined}
      data-vcard-key={topData.key}
      actions={
        <span className="flex flex-wrap items-center gap-2">
          {canGreetMatch(top) && (
            <Button size="sm" className="gap-1.5" disabled={busyMatchId === top.match_id} onClick={() => onSayHello(top)}>
              <Heart className="size-4" aria-hidden="true" />
              {t('spotlight.grid.match.sayHello')}
            </Button>
          )}
          {canOpen(top) && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onViewProfile(top)}>
              <UserRound className="size-4" aria-hidden="true" />
              {t('spotlight.grid.match.viewProfile')}
            </Button>
          )}
        </span>
      }
      className="h-full"
    />
  );

  return (
    <SpotlightGrid
      spotlight={spotlight}
      tiles={tiles.map((m) => (
        <SocialVCard
          key={m.match_id}
          data={matchToVCard(m)}
          size="standard"
          onOpen={canOpen(m) ? () => onViewProfile(m) : undefined}
          className="h-full"
        />
      ))}
      row={
        more.length > 0
          ? {
              title: t('spotlight.grid.match.morePeople'),
              items: more.map((m) => (
                <SocialVCard
                  key={m.match_id}
                  data={matchToVCard(m)}
                  size="compact"
                  onOpen={canOpen(m) ? () => onViewProfile(m) : undefined}
                />
              )),
            }
          : undefined
      }
    />
  );
}
