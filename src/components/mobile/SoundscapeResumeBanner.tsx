/**
 * SoundscapeResumeBanner - Mobile-only banner shown when autoplay is blocked
 * 
 * Appears when:
 * - User was playing Soundscape before app close/reload
 * - Autoplay was blocked on resume
 * - User needs to tap to resume playback
 */

import { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as AudioManager from '@/audio/SoundscapeAudioManager';
import { useIsMobile } from '@/hooks/use-mobile';
import { t } from '@/lib/i18n-toast';

export function SoundscapeResumeBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    // Only on mobile
    if (!isMobile) return;
    
    // Subscribe to resume banner state
    const unsubscribe = AudioManager.subscribeToResumeBanner((show) => {
      setShowBanner(show);
    });
    
    // Attempt resume on mount (e.g., app opened from background)
    AudioManager.attemptMobileResume();
    
    // Also attempt resume on visibility change (app foregrounded)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        AudioManager.attemptMobileResume();
      }
    };
    
    // Handle iOS back/forward cache (bfcache)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        AudioManager.attemptMobileResume();
      }
    };
    
    // Handle window focus (WebView regains focus)
    const handleFocus = () => {
      AudioManager.attemptMobileResume();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isMobile]);
  
  const handleTap = () => {
    AudioManager.handleResumeBannerTap();
    setShowBanner(false);
  };
  
  // Only render on mobile when needed
  if (!isMobile || !showBanner) return null;
  
  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        onClick={handleTap}
        className="fixed top-safe-area left-4 right-4 z-50 flex items-center justify-center gap-2 px-4 py-3 bg-primary/90 backdrop-blur-sm text-primary-foreground rounded-lg shadow-lg active:scale-98 transition-transform"
        style={{ top: 'max(env(safe-area-inset-top, 12px), 12px)' }}
      >
        <Volume2 className="w-5 h-5" />
        <span className="text-sm font-medium">{t('screens.mobile.tapResumeSoundscape')}</span>
      </motion.button>
    </AnimatePresence>
  );
}
