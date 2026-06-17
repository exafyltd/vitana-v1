/**
 * VTID-03280 — Guided Journey catalog (P5, vitana-v1).
 *
 * Renders BELOW the existing My Journey start view in Guided Mode only. Shows
 * the published 90-session / 250-topic curriculum (P2) with chapter filters,
 * a scrollable session list, and clickable topic cards. Tapping a topic opens
 * the Topic Explanation drawer (screen 02): short summary + Replay / Start
 * Practice / Back to Journey.
 *
 * This phase is the text-based browse + explanation. P6 wires ORB voice
 * activation (Vitana speaks, then opens this), and P7 wires Start Practice →
 * real feature + completion. The optional `onActivateTopic` / `onStartPractice`
 * props are the seams those phases hook into.
 *
 * Reuses existing ui primitives (Card, Button, Drawer) — no new design system.
 */

import { useState, type ComponentType } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  TrendingUp,
  Info,
  Gift,
  Clock,
  Rocket,
  RotateCcw,
  CheckCircle2,
  Circle,
  X,
  ArrowRight,
  type LucideProps,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { t, notify } from '@/lib/i18n-toast';
import { useJourneyChecklist, type PublicTopic } from '@/hooks/useJourneyChecklist';
import { activateOrb } from '@/lib/orbActivate'; // VTID-03281: activate Vitana/ORB
import {
  completePractice,
  practiceTargetAction,
  recordSessionListened,
} from '@/lib/journeyPractice'; // VTID-03282 + session-listen reward
import { JOURNEY_STATE_QUERY_KEY, useGuidedJourneyProgress } from '@/hooks/useGuidedJourneyProgress';

const CHAPTER_ORDER = ['basics', 'daily_use', 'community', 'health', 'intelligence', 'discovery'];

/** VITANA INDEX points awarded for listening to a guided session. */
const SESSION_INDEX_REWARD = 2;

/** Colour + icon per explanation section — turns the plain text rows into
 *  scannable, motivating cards instead of a "Word document". */
interface SectionTint {
  icon: ComponentType<LucideProps>;
  card: string;
  chip: string;
  glyph: string;
  label: string;
}
const SECTION_TINTS: Record<'what' | 'benefit' | 'when' | 'try', SectionTint> = {
  what: {
    icon: Info,
    card: 'bg-sky-50 border-sky-100 dark:bg-sky-950/30 dark:border-sky-900/40',
    chip: 'bg-sky-500/15',
    glyph: 'text-sky-600 dark:text-sky-400',
    label: 'text-sky-700 dark:text-sky-300',
  },
  benefit: {
    icon: Gift,
    card: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/40',
    chip: 'bg-emerald-500/15',
    glyph: 'text-emerald-600 dark:text-emerald-400',
    label: 'text-emerald-700 dark:text-emerald-300',
  },
  when: {
    icon: Clock,
    card: 'bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/40',
    chip: 'bg-amber-500/15',
    glyph: 'text-amber-600 dark:text-amber-400',
    label: 'text-amber-700 dark:text-amber-300',
  },
  try: {
    icon: Rocket,
    card: 'bg-violet-50 border-violet-100 dark:bg-violet-950/30 dark:border-violet-900/40',
    chip: 'bg-violet-500/15',
    glyph: 'text-violet-600 dark:text-violet-400',
    label: 'text-violet-700 dark:text-violet-300',
  },
};

function chapterLabel(chapterId: string): string {
  const key = `screens.guidedCatalog.chapter_${chapterId}`;
  const label = t(key);
  // t() returns the key when missing; fall back to the raw id.
  return label === key ? chapterId : label;
}

interface GuidedJourneyCatalogProps {
  /** P6 seam: called instead of opening the drawer directly (ORB activation). */
  onActivateTopic?: (topic: PublicTopic) => void;
  /** P7 seam: called from the drawer's Start Practice. */
  onStartPractice?: (topic: PublicTopic) => void;
  className?: string;
}

export function GuidedJourneyCatalog({
  onActivateTopic,
  onStartPractice,
  className,
}: GuidedJourneyCatalogProps) {
  const { sessions, chapters, loading, error } = useJourneyChecklist();
  // Per-step completion (shares the same React Query state the hero ring uses,
  // so a mark-done updates the checklist and the hero counter together).
  const { completedSet } = useGuidedJourneyProgress();
  const [activeChapter, setActiveChapter] = useState<string>('all');
  const [openTopic, setOpenTopic] = useState<PublicTopic | null>(null);
  const [practiceMode, setPracticeMode] = useState(false); // VTID-03282: screen 03
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const closeDrawer = () => {
    setOpenTopic(null);
    setPracticeMode(false);
  };

  // Open the feature this practice refers to so the user can actually DO it,
  // then auto-credit the practice (opening IS performing the tiny action).
  // The "Open feature" button + the tappable "Try this" card both call this.
  // Falls back to the Vitana ORB when the target is the ORB, is unknown, or is
  // the page we're already on (e.g. my_journey while on /autopilot) — so the
  // button is never a dead end. Mirrors the overlay dispatch in AutopilotPopup.
  const openPracticeFeature = (topic: PublicTopic) => {
    void completePractice(topic.topicId).then((ok) => {
      if (ok) queryClient.invalidateQueries({ queryKey: JOURNEY_STATE_QUERY_KEY });
    });
    closeDrawer();
    const action = practiceTargetAction(topic.guidedPracticeTarget);
    if (action?.kind === 'route' && action.route !== location.pathname) {
      navigate(action.route);
    } else if (action?.kind === 'overlay') {
      window.dispatchEvent(new CustomEvent(action.event));
    } else {
      // orb target, unknown target, or a route we're already on → talk to Vitana.
      activateOrb(topic.topicId);
    }
    notify('screens.guidedCatalog.doneToast');
  };

  // VTID-03282: record completion (an explicit action, never from listening),
  // then close. Optionally the user opened the real feature first.
  const markPracticeDone = async (topic: PublicTopic) => {
    const ok = await completePractice(topic.topicId);
    if (ok) {
      // Refresh the durable journey state so the hero ring fills live.
      queryClient.invalidateQueries({ queryKey: JOURNEY_STATE_QUERY_KEY });
    }
    notify(ok ? 'screens.guidedCatalog.doneToast' : 'screens.guidedCatalog.doneError');
    closeDrawer();
  };

  if (loading) {
    return (
      <div className={cn('py-6 text-center text-sm text-muted-foreground', className)}>
        {t('screens.guidedCatalog.loading')}
      </div>
    );
  }
  if (error || sessions.length === 0) {
    return (
      <div className={cn('py-6 text-center text-sm text-muted-foreground', className)}>
        {t('screens.guidedCatalog.empty')}
      </div>
    );
  }

  const orderedChapters = CHAPTER_ORDER.filter((c) => chapters.includes(c));
  const visibleSessions =
    activeChapter === 'all'
      ? sessions
      : sessions.filter((s) => s.chapterId === activeChapter);

  // VTID-03281: clicking a topic activates Vitana/ORB (voice goes live), then
  // opens the Topic Explanation. The optional onActivateTopic prop overrides.
  const handleTopicClick = (topic: PublicTopic) => {
    // VTID-03291: focus the ORB on this topic so Vitana teaches it from the KB.
    activateOrb(topic.topicId);
    if (onActivateTopic) {
      // P6 ORB-override path: the parent drives activation and is responsible
      // for crediting the listen reward when the guided turn actually completes.
      onActivateTopic(topic);
    } else {
      // The explanation popup IS the post-listen summary. Credit the +2 VITANA
      // INDEX reward only once it's shown — not on a click that may be a no-op.
      // Idempotent per topic server-side; fire-and-forget so it never blocks UI.
      setOpenTopic(topic);
      void recordSessionListened(topic.topicId);
    }
  };

  // VTID-03281: clicking a session activates Vitana/ORB then opens its first
  // topic's explanation (avoids a separate Session Detail screen, per spec).
  const handleSessionClick = (firstTopic: PublicTopic | undefined) => {
    if (!firstTopic) return;
    handleTopicClick(firstTopic);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Chapter filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <ChapterPill
          label={t('screens.guidedCatalog.allChapters')}
          active={activeChapter === 'all'}
          onClick={() => setActiveChapter('all')}
        />
        {orderedChapters.map((c) => (
          <ChapterPill
            key={c}
            label={chapterLabel(c)}
            active={activeChapter === c}
            onClick={() => setActiveChapter(c)}
          />
        ))}
      </div>

      {/* Session list — premium checklist: each session is a titled section
          with a completion chip + check; its steps render as a connected
          timeline of rows that flip to a green check once done. */}
      <div className="space-y-5">
        {visibleSessions.map((s) => {
          const doneCount = s.topics.reduce(
            (n, tp) => (completedSet.has(tp.topicId) ? n + 1 : n),
            0,
          );
          const totalCount = s.topics.length;
          const sessionComplete = totalCount > 0 && doneCount === totalCount;
          return (
            <div key={s.session} className="space-y-2.5">
              {/* Session header */}
              <button
                type="button"
                onClick={() => handleSessionClick(s.topics[0])}
                className="flex w-full items-center gap-2 px-1 text-left"
              >
                {sessionComplete ? (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-emerald-500"
                    aria-label={t('screens.guidedCatalog.sessionComplete')}
                  />
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded-full border-2 border-foreground/25" aria-hidden />
                )}
                <span className="text-xs font-bold tracking-wide text-foreground/80">
                  {t('screens.guidedCatalog.sessionN', { n: s.session })}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums',
                    sessionComplete
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {t('screens.guidedCatalog.sessionProgress', { done: doneCount, total: totalCount })}
                </span>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                  {chapterLabel(s.chapterId)}
                </span>
              </button>

              {/* Steps — connected by a soft vertical rail on the left */}
              <div className="relative space-y-2 pl-1">
                <span
                  aria-hidden
                  className="absolute left-[22px] top-3 bottom-3 w-px bg-gradient-to-b from-border via-border/60 to-transparent"
                />
                {s.topics.map((topic) => {
                  const done = completedSet.has(topic.topicId);
                  return (
                    <button
                      key={topic.topicId}
                      type="button"
                      onClick={() => handleTopicClick(topic)}
                      className="relative block w-full text-left"
                    >
                      <Card
                        className={cn(
                          'flex items-center gap-3 p-3 transition-all hover:shadow-md',
                          done
                            ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20'
                            : 'hover:bg-accent/40',
                        )}
                      >
                        {done ? (
                          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
                        ) : (
                          <Circle className="h-6 w-6 shrink-0 text-muted-foreground/35" />
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {topic.topicId}
                          </span>
                          <span
                            className={cn(
                              'block text-sm font-medium leading-snug',
                              done && 'text-foreground/70',
                            )}
                          >
                            {topic.displayLabel}
                          </span>
                          {topic.shortDescription && (
                            <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-1">
                              {topic.shortDescription}
                            </span>
                          )}
                        </div>
                        {done ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            {t('screens.guidedCatalog.statusDone')}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
                            {t('screens.guidedCatalog.statusReady')}
                          </span>
                        )}
                      </Card>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Topic Explanation (screen 02) ⇄ Guided Practice (screen 03) drawer */}
      <Drawer open={!!openTopic} onOpenChange={(o) => { if (!o) closeDrawer(); }}>
        <DrawerContent className="max-h-[92dvh]">
          {/* Close (X) — top-right, like other Maxina popups. Shown in both states. */}
          <DrawerClose asChild>
            <button
              type="button"
              aria-label={t('screens.guidedCatalog.close')}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </DrawerClose>

          {openTopic && !practiceMode && (
            <>
              {/* Scrollable body so a tall popup never gets clipped at the top. */}
              <div className="min-h-0 flex-1 overflow-y-auto">
              {/* Celebration header — Vitana praises the user after a listened
                  session and surfaces the VITANA INDEX reward they just earned. */}
              <DrawerHeader className="items-center gap-2 pb-1 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/30">
                  <Sparkles className="h-7 w-7" />
                </div>
                <DrawerTitle className="text-lg">
                  {t('screens.guidedCatalog.congratsTitle')}
                </DrawerTitle>
                <p className="text-sm text-muted-foreground">
                  {t('screens.guidedCatalog.congratsSubtitle')}
                </p>
                <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1.5 text-sm font-bold text-emerald-600 ring-1 ring-inset ring-emerald-500/25 dark:text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                  {t('screens.guidedCatalog.reward', { points: SESSION_INDEX_REWARD })}
                </div>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {t('screens.guidedCatalog.rewardCaption')}
                </span>
              </DrawerHeader>

              <div className="px-4 pb-1 text-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary/70">
                  {openTopic.displayLabel}
                </span>
              </div>

              <div className="space-y-2.5 px-4 pb-2">
                <ExplanationCard
                  tint={SECTION_TINTS.what}
                  label={t('screens.guidedCatalog.whatItIs')}
                  value={openTopic.explanation.whatItIs}
                />
                <ExplanationCard
                  tint={SECTION_TINTS.benefit}
                  label={t('screens.guidedCatalog.userBenefit')}
                  value={openTopic.explanation.userBenefit}
                />
                <ExplanationCard
                  tint={SECTION_TINTS.when}
                  label={t('screens.guidedCatalog.whenToUse')}
                  value={openTopic.explanation.whenToUse}
                />
                <ExplanationCard
                  tint={SECTION_TINTS.try}
                  label={t('screens.guidedCatalog.tryThis')}
                  value={openTopic.explanation.tryThis}
                />
              </div>
              </div>
              <DrawerFooter>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full"
                    onClick={() => {
                      // VTID-03291: Replay re-activates Vitana/ORB focused on this topic.
                      activateOrb(openTopic.topicId);
                      if (onActivateTopic) onActivateTopic(openTopic);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t('screens.guidedCatalog.replay')}
                  </Button>
                  <Button
                    className="flex-1 rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/30 hover:from-primary/90 hover:to-primary/70"
                    onClick={() => {
                      // VTID-03282: go to the Guided Practice step (screen 03).
                      if (onStartPractice) onStartPractice(openTopic);
                      else setPracticeMode(true);
                    }}
                  >
                    <Rocket className="h-4 w-4" />
                    {t('screens.guidedCatalog.startPractice')}
                  </Button>
                </div>
                <Button variant="ghost" className="rounded-full" onClick={closeDrawer}>
                  {t('screens.guidedCatalog.backToJourney')}
                </Button>
              </DrawerFooter>
            </>
          )}

          {openTopic && practiceMode && (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <DrawerHeader>
                  <DrawerTitle>{t('screens.guidedCatalog.practiceHeader')}</DrawerTitle>
                </DrawerHeader>
                <div className="space-y-2.5 px-4 pb-2">
                  <ExplanationCard
                    tint={SECTION_TINTS.try}
                    label={t('screens.guidedCatalog.tryThis')}
                    value={openTopic.explanation.tryThis}
                    onClick={() => openPracticeFeature(openTopic)}
                  />
                </div>
              </div>
              <DrawerFooter>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => openPracticeFeature(openTopic)}
                >
                  {t('screens.guidedCatalog.openFeature')}
                </Button>
                <Button
                  className="rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/30 hover:from-primary/90 hover:to-primary/70"
                  onClick={() => markPracticeDone(openTopic)}
                >
                  {t('screens.guidedCatalog.markDone')}
                </Button>
                <Button variant="ghost" className="rounded-full" onClick={closeDrawer}>
                  {t('screens.guidedCatalog.skip')}
                </Button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function ChapterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80',
      )}
    >
      {label}
    </button>
  );
}

function ExplanationCard({
  tint,
  label,
  value,
  onClick,
}: {
  tint: SectionTint;
  label: string;
  value: string | null;
  /** When set, the whole card becomes a button that triggers the practice
   *  action (so the "Try this" instruction is itself tappable). */
  onClick?: () => void;
}) {
  if (!value) return null;
  const Icon = tint.icon;
  const header = (
    <div className="mb-1.5 flex items-center gap-2">
      <span className={cn('flex h-6 w-6 items-center justify-center rounded-full', tint.chip)}>
        <Icon className={cn('h-3.5 w-3.5', tint.glyph)} />
      </span>
      <span className={cn('text-xs font-semibold uppercase tracking-wide', tint.label)}>
        {label}
      </span>
      {onClick && <ArrowRight className={cn('ml-auto h-4 w-4', tint.glyph)} aria-hidden />}
    </div>
  );
  const body = <p className="text-sm leading-relaxed text-foreground/90">{value}</p>;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full rounded-2xl border p-3 text-left transition-all hover:shadow-md hover:ring-2 hover:ring-inset hover:ring-current/20',
          tint.card,
        )}
      >
        {header}
        {body}
      </button>
    );
  }
  return (
    <div className={cn('rounded-2xl border p-3', tint.card)}>
      {header}
      {body}
    </div>
  );
}
