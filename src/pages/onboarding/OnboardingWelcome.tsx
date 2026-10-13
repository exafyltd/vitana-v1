import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getIntroVideoSrc } from '@/utils/introVideo';
import { OnboardingSpeech } from '@/components/onboarding/OnboardingSpeech';
import { OnboardingNameForm } from '@/components/onboarding/OnboardingNameForm';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useAuth } from '@/context/AuthProvider';
import { t } from '@/lib/i18n-toast';
import { useAudiobookPlayer } from '@/context/AudiobookPlayerProvider';
import { ArchetypeSkeleton, ScreenFrame } from '@/components/layout/spotlight';
import { useSpotlightEnabled } from '@/hooks/useSpotlightEnabled';

// VTID-04760: 'start' — after the name form, a newcomer gets ONE clear action
// (play Episode 1 of the Audiobook) instead of being dropped onto the feed.
type Phase = 'speech' | 'form' | 'start';

/** Opens My Journey with the Audiobook player started on Episode 1. */
export const AUDIOBOOK_START_ROUTE = '/autopilot?audiobook=play';

function getDefaultTarget(): string {
  // News (the "All News" home feed) is the default landing screen after login.
  return '/home';
}

export default function OnboardingWelcome() {
  const navigate = useNavigate();
  const spotlight = useSpotlightEnabled();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const audiobook = useAudiobookPlayer(); // VTID-04761
  const { needsOnboarding, loading: onboardingLoading } = useOnboardingStatus();
  const [phase, setPhase] = useState<Phase>('speech');
  const [videoSrc, setVideoSrc] = useState('');

  // Post-onboarding destination (honor deep-link redirectTo if set, else default)
  const redirectTo = searchParams.get('redirectTo');
  const postOnboardingTarget = redirectTo || getDefaultTarget();

  // Load background video
  useEffect(() => {
    getIntroVideoSrc('maxina').then(setVideoSrc);
  }, []);

  // If user already completed onboarding, redirect immediately (but not while
  // they are on the final "play Episode 1" step this page just showed them).
  useEffect(() => {
    if (phase === 'start') return;
    if (!onboardingLoading && !needsOnboarding && user) {
      console.debug('[OnboardingWelcome] User does not need onboarding, redirecting to', postOnboardingTarget);
      navigate(postOnboardingTarget, { replace: true });
    }
  }, [phase, onboardingLoading, needsOnboarding, user, navigate, postOnboardingTarget]);

  // Hide the external ORB FAB during onboarding so it doesn't conflict with our speech bubbles
  useEffect(() => {
    const fabEl = document.querySelector('.vtorb-fab') as HTMLElement | null;
    if (fabEl) fabEl.style.display = 'none';
    return () => {
      if (fabEl) fabEl.style.display = '';
    };
  }, []);

  const handleSpeechComplete = () => {
    console.debug('[OnboardingWelcome] Speech complete, transitioning to name form');
    setPhase('form');
  };

  const handleFormComplete = () => {
    // A deep link (redirectTo) wins: the member came here to do something.
    if (redirectTo) {
      console.debug('[OnboardingWelcome] Form complete, navigating to', postOnboardingTarget);
      navigate(postOnboardingTarget, { replace: true });
      return;
    }
    setPhase('start');
  };

  // Start the player inside this tap (mobile browsers only let audio start
  // from a gesture), then open My Journey; the route param is the fallback
  // when the player isn't mounted.
  const handlePlayEpisodeOne = () => {
    if (audiobook) {
      void audiobook.start();
      navigate('/autopilot', { replace: true });
      return;
    }
    navigate(AUDIOBOOK_START_ROUTE, { replace: true });
  };
  const handleLater = () => navigate(postOnboardingTarget, { replace: true });

  // Show nothing while checking onboarding status or redirecting away
  if (phase !== 'start' && (onboardingLoading || !needsOnboarding)) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <ArchetypeSkeleton archetype="form" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Video Background */}
      {videoSrc && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 w-full h-full object-cover"
          src={videoSrc}
        />
      )}

      {/* Dark overlay */}
      {/* VTID-05117: dark-theme tokens in a `dark` scope keep the scrim and the copy over the video light-on-dark in both themes */}
      <div className="dark fixed inset-0 bg-gradient-to-b from-background/40 via-background/20 to-background/50 z-10" />

      {/* Content — VTID-05117: Spotlight on → the `form` archetype (one form column over the video). */}
      <ContentLayer spotlight={spotlight}>
        <AnimatePresence mode="wait">
          {phase === 'speech' && (
            <motion.div
              key="speech"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col pt-12 pb-4"
            >
              {/* Header */}
              <div className="px-6 mb-4">
                <motion.h1
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="dark text-2xl font-bold text-foreground"
                >{t('screens.onboarding.welcomeMaxina')}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="dark text-foreground/60 text-sm mt-1"
                >{t('screens.onboarding.yourLongevityJourneyBeginsNow')}
                </motion.p>
              </div>

              {/* Speech bubbles */}
              <div className="flex-1 overflow-hidden">
                <OnboardingSpeech onComplete={handleSpeechComplete} />
              </div>
            </motion.div>
          )}

          {phase === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex-1 flex items-center justify-center px-4 py-12"
            >
              <OnboardingNameForm onComplete={handleFormComplete} />
            </motion.div>
          )}

          {phase === 'start' && (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex-1 flex items-center justify-center px-4 py-12"
            >
              <div
                className="w-full max-w-sm rounded-3xl bg-card/90 backdrop-blur-md p-6 text-center shadow-xl"
                data-testid="onboarding-audiobook-start"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-ruby to-category-2 shadow-md">
                  <Headphones className="h-8 w-8 text-primary-foreground" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">{t('screens.onboarding.audiobookReadyTitle')}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('screens.onboarding.audiobookReadyBody')}</p>
                <Button
                  size="lg"
                  className="mt-6 h-12 w-full gap-2 text-base"
                  onClick={handlePlayEpisodeOne}
                  data-testid="onboarding-play-episode-one"
                >
                  <Play className="h-5 w-5" aria-hidden="true" />
                  {t('screens.onboarding.playEpisodeOne')}
                </Button>
                <Button
                  variant="ghost"
                  className="mt-2 h-11 w-full text-muted-foreground"
                  onClick={handleLater}
                  data-testid="onboarding-audiobook-later"
                >
                  {t('screens.onboarding.audiobookLater')}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ContentLayer>
    </div>
  );
}

function ContentLayer({ spotlight, children }: { spotlight: boolean; children: ReactNode }) {
  if (spotlight) {
    return (
      <ScreenFrame archetype="form" className="relative z-20 min-h-screen">
        {children}
      </ScreenFrame>
    );
  }
  return <div className="relative z-20 min-h-screen flex flex-col">{children}</div>;
}
