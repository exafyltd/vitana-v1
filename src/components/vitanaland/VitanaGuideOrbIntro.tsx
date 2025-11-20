import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { VitanalandPortalSeed } from "@/components/audio/VitanalandPortalSeed";

interface VitanaGuideOrbIntroProps {
  onOrbClick: () => void;
  initialDelay: number;
}

const INTRO_STORAGE_KEY = 'vitanaGuideIntroShown';

export function VitanaGuideOrbIntro({ onOrbClick, initialDelay }: VitanaGuideOrbIntroProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Check if intro has been shown in this session
    const hasSeenIntro = sessionStorage.getItem(INTRO_STORAGE_KEY);
    
    // Force show via URL parameter for testing
    const urlParams = new URLSearchParams(window.location.search);
    const forceShow = urlParams.get('showOrbIntro') === 'true';
    
    console.log('[VitanaGuideOrbIntro] hasSeenIntro:', hasSeenIntro, 'forceShow:', forceShow);
    
    if (!hasSeenIntro || forceShow) {
      const totalDelay = (initialDelay + 0.8) * 1000;
      console.log(`[VitanaGuideOrbIntro] Starting timer (${totalDelay}ms)...`);
      
      // Trigger intro animation after delay
      const timer = setTimeout(() => {
        console.log('[VitanaGuideOrbIntro] Expanding pill...');
        setIsExpanded(true);
        
        // Hold expanded state for 2.5 seconds, then retract
        setTimeout(() => {
          console.log('[VitanaGuideOrbIntro] Retracting pill...');
          setIsExpanded(false);
          
          // Mark intro as shown (unless forced)
          if (!forceShow) {
            sessionStorage.setItem(INTRO_STORAGE_KEY, 'true');
            console.log('[VitanaGuideOrbIntro] Marked as shown in sessionStorage');
          }
        }, 2500);
      }, totalDelay);

      return () => {
        console.log('[VitanaGuideOrbIntro] Cleaning up timer');
        clearTimeout(timer);
      };
    } else {
      console.log('[VitanaGuideOrbIntro] Intro already shown, skipping animation');
    }
  }, [initialDelay]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: initialDelay, duration: 0.5 }}
      className="fixed bottom-6 right-6 z-50 group"
    >
      <div
        role="button"
        tabIndex={0}
        aria-label="Your VITANA guide awaits inside"
        onClick={onOrbClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOrbClick();
          }
        }}
        className="relative cursor-pointer transition-transform duration-150 hover:scale-105 focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded-full"
      >
        {/* Container for orb + expanding pill */}
        <div className="relative flex items-center gap-3">
          {/* Expanding text pill - appears to the left of orb */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="bg-white/70 backdrop-blur-md text-foreground px-4 py-2 rounded-full shadow-xl border border-white/20 whitespace-nowrap text-sm font-medium">
                  Your VITANA guide awaits inside
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Orb container */}
          <div className="relative flex-shrink-0">
            {/* Dark radial pad for better contrast against bright backgrounds */}
            <div className="absolute inset-0 translate-x-1 translate-y-1">
              <div className="h-24 w-24 rounded-full bg-black/30 blur-xl" />
            </div>
            
            {/* Orb (positioned on top of pad) */}
            <div className="relative">
              <VitanalandPortalSeed 
                size="md" 
                audioState="idle" 
                volumeLevel={0}
                layoutId="vitana-orb"
              />
            </div>
          </div>
        </div>
        
        {/* Hover-only Tooltip - only show when not expanded */}
        {!isExpanded && (
          <div className="absolute bottom-20 right-0 bg-black/70 text-white text-xs px-3 py-2 rounded-full shadow-lg whitespace-nowrap opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0 transition-all duration-200 pointer-events-none">
            Your VITANA guide awaits inside
          </div>
        )}
      </div>
    </motion.div>
  );
}
