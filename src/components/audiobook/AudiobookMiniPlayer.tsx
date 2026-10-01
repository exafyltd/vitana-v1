/**
 * VTID-04761 — Audiobook mini player.
 *
 * Floats above the mobile bottom bar (bottom-right on desktop) while an
 * Audiobook queue is loaded. Everything a passive listener needs, nothing
 * that asks them to talk: play/pause, previous/next, speed, sleep timer, and
 * one optional "Ask Vitana" for anyone who does want to talk.
 *
 * Instead of a pop-up after every topic, one quiet card appears when an
 * episode is finished — "Episode N done" with an optional "Try it now" — and
 * the next episode keeps playing underneath it.
 */

import { useNavigate } from 'react-router-dom';
import {
  Headphones,
  Loader2,
  MessageCircle,
  Moon,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Sparkles,
  X,
} from 'lucide-react';
import { useAudiobookPlayer } from '@/context/AudiobookPlayerProvider';
import { practiceTargetAction } from '@/lib/journeyPractice';
import { activateOrb } from '@/lib/orbActivate';
import { t } from '@/lib/i18n-toast';
import { cn } from '@/lib/utils';

function iconButton(extra?: string) {
  return cn(
    'inline-flex h-11 min-w-11 items-center justify-center rounded-full text-gray-700',
    'hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500',
    'disabled:opacity-40',
    extra,
  );
}

export function AudiobookMiniPlayer() {
  const player = useAudiobookPlayer();
  const navigate = useNavigate();
  if (!player || !player.active) return null;

  const {
    playing,
    loading,
    error,
    track,
    position,
    duration,
    rate,
    sleepMinutes,
    episodeSummary,
    finished,
  } = player;
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  const tryItNow = () => {
    if (!episodeSummary) return;
    const action = practiceTargetAction(episodeSummary.practiceTarget);
    player.dismissSummary();
    if (!action || action.kind === 'orb') {
      player.askVitana();
      return;
    }
    if (action.kind === 'overlay') {
      window.dispatchEvent(new CustomEvent(action.event));
      return;
    }
    navigate(action.route);
  };

  return (
    <section
      role="region"
      aria-label={t('screens.audiobook.playerRegion')}
      data-testid="audiobook-mini-player"
      className={cn(
        'fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50',
        'md:inset-x-auto md:end-6 md:bottom-6 md:w-[400px]',
        'rounded-3xl border border-purple-100 bg-white/95 p-3 shadow-2xl backdrop-blur-md',
      )}
    >
      {episodeSummary && (
        <div
          className="mb-3 flex items-start gap-3 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 p-3"
          data-testid="audiobook-episode-summary"
          aria-live="polite"
        >
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-purple-500" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">
              {t('screens.audiobook.episodeDone', { n: episodeSummary.episode })}
            </p>
            <p className="text-xs text-purple-700">{t('screens.audiobook.episodeDoneReward')}</p>
            <button
              type="button"
              onClick={tryItNow}
              className="mt-2 inline-flex h-9 items-center rounded-full bg-white px-3 text-xs font-medium text-purple-700 shadow-sm hover:bg-purple-50"
              data-testid="audiobook-try-it-now"
            >
              {t('screens.audiobook.tryItNow')}
            </button>
          </div>
          <button
            type="button"
            onClick={player.dismissSummary}
            aria-label={t('screens.audiobook.dismiss')}
            className={iconButton('h-9 min-w-9')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF7BAC] to-[#C084FC]">
          <Headphones className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-purple-600">
            {track ? t('screens.audiobook.episodeN', { n: track.episode }) : t('screens.audiobook.title')}
          </p>
          <p className="truncate text-sm font-semibold text-gray-900" data-testid="audiobook-track-title">
            {finished ? t('screens.audiobook.finished') : track?.title ?? t('screens.audiobook.loading')}
          </p>
        </div>
        <button
          type="button"
          onClick={player.close}
          aria-label={t('screens.audiobook.close')}
          className={iconButton()}
          data-testid="audiobook-close"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-purple-100"
        role="progressbar"
        aria-label={t('screens.audiobook.progress')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <div className="h-full rounded-full bg-purple-500 transition-[width]" style={{ width: `${pct}%` }} />
      </div>

      {error ? (
        <div className="mt-3 flex flex-wrap items-center gap-2" data-testid="audiobook-error" aria-live="polite">
          <p className="flex-1 text-sm text-gray-700">
            {error === 'unavailable'
              ? t('screens.audiobook.unavailable')
              : error === 'empty'
                ? t('screens.audiobook.empty')
                : t('screens.audiobook.network')}
          </p>
          {error === 'unavailable' ? (
            <button
              type="button"
              onClick={() => (track ? player.askVitana() : activateOrb())}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-purple-600 px-4 text-sm font-medium text-white"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              {t('screens.audiobook.askVitana')}
            </button>
          ) : error === 'network' ? (
            <button
              type="button"
              onClick={player.retry}
              className="inline-flex h-11 items-center rounded-full bg-purple-600 px-4 text-sm font-medium text-white"
            >
              {t('screens.audiobook.retry')}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-5 items-center justify-items-center">
          <button
            type="button"
            onClick={player.cycleRate}
            aria-label={t('screens.audiobook.speed', { rate })}
            className={iconButton('px-2 text-sm font-semibold')}
            data-testid="audiobook-speed"
          >
            {`${rate}×`}
          </button>
          <button
            type="button"
            onClick={player.previous}
            aria-label={t('screens.audiobook.previous')}
            className={iconButton()}
          >
            <SkipBack className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={player.toggle}
            disabled={finished}
            aria-label={playing ? t('screens.audiobook.pause') : t('screens.audiobook.play')}
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-purple-600 text-white shadow-md hover:bg-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:opacity-40"
            data-testid="audiobook-play-pause"
          >
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            ) : playing ? (
              <Pause className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Play className="h-6 w-6 ms-0.5 rtl:-scale-x-100" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={player.next}
            aria-label={t('screens.audiobook.next')}
            className={iconButton()}
          >
            <SkipForward className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={player.cycleSleep}
            aria-label={
              sleepMinutes
                ? t('screens.audiobook.sleepOn', { min: sleepMinutes })
                : t('screens.audiobook.sleepOff')
            }
            className={iconButton(cn('gap-0.5 px-1 text-[11px] font-semibold', sleepMinutes && 'text-purple-700'))}
            data-testid="audiobook-sleep"
          >
            <Moon className="h-5 w-5" aria-hidden="true" />
            {sleepMinutes ? `${sleepMinutes}′` : null}
          </button>
        </div>
      )}

      {!error && (
        <button
          type="button"
          onClick={player.askVitana}
          className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-purple-700 hover:bg-purple-50"
          data-testid="audiobook-ask-vitana"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {t('screens.audiobook.askVitana')}
        </button>
      )}
    </section>
  );
}
