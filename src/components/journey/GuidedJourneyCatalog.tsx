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

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { t, notify } from '@/lib/i18n-toast';
import { useJourneyChecklist, type PublicTopic } from '@/hooks/useJourneyChecklist';
import { activateOrb } from '@/lib/orbActivate'; // VTID-03281: activate Vitana/ORB
import { completePractice, practiceTargetRoute } from '@/lib/journeyPractice'; // VTID-03282

const CHAPTER_ORDER = ['basics', 'daily_use', 'community', 'health', 'intelligence', 'discovery'];

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
  const [activeChapter, setActiveChapter] = useState<string>('all');
  const [openTopic, setOpenTopic] = useState<PublicTopic | null>(null);
  const [practiceMode, setPracticeMode] = useState(false); // VTID-03282: screen 03
  const navigate = useNavigate();

  const closeDrawer = () => {
    setOpenTopic(null);
    setPracticeMode(false);
  };

  // VTID-03282: record completion (an explicit action, never from listening),
  // then close. Optionally the user opened the real feature first.
  const markPracticeDone = async (topic: PublicTopic) => {
    const ok = await completePractice(topic.topicId);
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
    if (onActivateTopic) onActivateTopic(topic);
    else setOpenTopic(topic);
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

      {/* Session list */}
      <div className="space-y-3">
        {visibleSessions.map((s) => (
          <div key={s.session} className="space-y-2">
            <button
              type="button"
              onClick={() => handleSessionClick(s.topics[0])}
              className="flex w-full items-center justify-between px-1 text-left"
            >
              <span className="text-xs font-semibold tracking-wide text-foreground/70">
                {t('screens.guidedCatalog.sessionN', { n: s.session })}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {chapterLabel(s.chapterId)}
              </span>
            </button>
            {/* Full-width horizontal rows (per prototype): topic id + label left, status right */}
            <div className="space-y-2">
              {s.topics.map((topic) => (
                <button
                  key={topic.topicId}
                  type="button"
                  onClick={() => handleTopicClick(topic)}
                  className="block w-full text-left"
                >
                  <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/40">
                    <div className="min-w-0 flex-1">
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {topic.topicId}
                      </span>
                      <span className="block text-sm font-medium leading-snug">
                        {topic.displayLabel}
                      </span>
                      {topic.shortDescription && (
                        <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-1">
                          {topic.shortDescription}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
                      {t('screens.guidedCatalog.statusReady')}
                    </span>
                  </Card>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Topic Explanation (screen 02) ⇄ Guided Practice (screen 03) drawer */}
      <Drawer open={!!openTopic} onOpenChange={(o) => { if (!o) closeDrawer(); }}>
        <DrawerContent>
          {openTopic && !practiceMode && (
            <>
              <DrawerHeader>
                <DrawerTitle>{openTopic.displayLabel}</DrawerTitle>
              </DrawerHeader>
              <div className="space-y-3 px-4 pb-2 text-sm">
                <ExplanationRow
                  label={t('screens.guidedCatalog.whatItIs')}
                  value={openTopic.explanation.whatItIs}
                />
                <ExplanationRow
                  label={t('screens.guidedCatalog.userBenefit')}
                  value={openTopic.explanation.userBenefit}
                />
                <ExplanationRow
                  label={t('screens.guidedCatalog.whenToUse')}
                  value={openTopic.explanation.whenToUse}
                />
                <ExplanationRow
                  label={t('screens.guidedCatalog.tryThis')}
                  value={openTopic.explanation.tryThis}
                />
              </div>
              <DrawerFooter>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      // VTID-03291: Replay re-activates Vitana/ORB focused on this topic.
                      activateOrb(openTopic.topicId);
                      if (onActivateTopic) onActivateTopic(openTopic);
                    }}
                  >
                    {t('screens.guidedCatalog.replay')}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      // VTID-03282: go to the Guided Practice step (screen 03).
                      if (onStartPractice) onStartPractice(openTopic);
                      else setPracticeMode(true);
                    }}
                  >
                    {t('screens.guidedCatalog.startPractice')}
                  </Button>
                </div>
                <Button variant="ghost" onClick={closeDrawer}>
                  {t('screens.guidedCatalog.backToJourney')}
                </Button>
              </DrawerFooter>
            </>
          )}

          {openTopic && practiceMode && (
            <>
              <DrawerHeader>
                <DrawerTitle>{t('screens.guidedCatalog.practiceHeader')}</DrawerTitle>
              </DrawerHeader>
              <div className="space-y-3 px-4 pb-2 text-sm">
                <ExplanationRow
                  label={t('screens.guidedCatalog.tryThis')}
                  value={openTopic.explanation.tryThis}
                />
              </div>
              <DrawerFooter>
                {practiceTargetRoute(openTopic.guidedPracticeTarget) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const route = practiceTargetRoute(openTopic.guidedPracticeTarget);
                      if (route) navigate(route);
                    }}
                  >
                    {t('screens.guidedCatalog.openFeature')}
                  </Button>
                )}
                <Button onClick={() => markPracticeDone(openTopic)}>
                  {t('screens.guidedCatalog.markDone')}
                </Button>
                <Button variant="ghost" onClick={closeDrawer}>
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

function ExplanationRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <span className="block text-xs font-semibold text-foreground/60">{label}</span>
      <span className="block text-foreground/90">{value}</span>
    </div>
  );
}
