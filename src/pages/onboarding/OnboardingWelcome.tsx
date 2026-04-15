import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getIntroVideoSrc } from '@/utils/introVideo';
import { OnboardingSpeech } from '@/components/onboarding/OnboardingSpeech';
import { OnboardingNameForm } from '@/components/onboarding/OnboardingNameForm';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useAuth } from '@/context/AuthProvider';

type Phase = 'speech' | 'form';

export default function OnboardingWelcome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { needsOnboarding, loading: onboardingLoading } = useOnboardingStatus();
  const [phase, setPhase] = useState<Phase>('speech');
  const [videoSrc, setVideoSrc] = useState('');

  // Load background video
  useEffect(() => {
    getIntroVideoSrc('maxina').then(setVideoSrc);
  }, []);

  // If user already completed onboarding, redirect immediately
  useEffect(() => {
    if (!onboardingLoading && !needsOnboarding && user) {
      const isMobile = window.innerWidth < 768;
      navigate(isMobile ? '/comm/events-meetups?tab=hot' : '/home', { replace: true });
    }
  }, [onboardingLoading, needsOnboarding, user, navigate]);

  // Hide the external ORB FAB during onboarding so it doesn't conflict
  useEffect(() => {
    const fabEl = document.querySelector('.vtorb-fab') as HTMLElement;
    if (fabEl) fabEl.style.display = 'none';
    return () => {
      if (fabEl) fabEl.style.display = '';
    };
  }, []);

  const handleSpeechComplete = () => {
    setPhase('form');
  };

  const handleFormComplete = () => {
    const isMobile = window.innerWidth < 768;
    navigate(isMobile ? '/comm/events-meetups?tab=hot' : '/home', { replace: true });
  };

  // Show nothing while checking onboarding status or redirecting away
  if (onboardingLoading || !needsOnboarding) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
      <div className="fixed inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50 z-10" />

      {/* Content */}
      <div className="relative z-20 min-h-screen flex flex-col">
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
                  className="text-2xl font-bold text-white"
                >
                  Welcome to Maxina
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-white/60 text-sm mt-1"
                >
                  Your longevity journey begins now
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
        </AnimatePresence>
      </div>
    </div>
  );
}
