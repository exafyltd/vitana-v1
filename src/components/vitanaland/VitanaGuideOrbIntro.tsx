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
        <div className="relative flex items-center gap-3 w-full min-w-[280px]">
          {/* Expanding text pill - appears at original orb position */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.90 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.90 }}
                transition={{ duration: 0.25, ease: "easeOut", delay: 0.15 }}
                className="absolute right-0 top-1/2 -translate-y-1/2 origin-right"
              >
                <div className="bg-gradient-to-r from-sky-400/70 via-purple-500/70 to-pink-500/70 rounded-full p-[1px] shadow-xl shadow-black/40">
                  <div className="rounded-full px-4 py-2 bg-black/65 backdrop-blur-xl text-xs text-white whitespace-nowrap flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-300 animate-pulse" />
                    <span>Your VITANA guide awaits inside</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Orb container - moves left to reveal tooltip */}
          <div 
            className={`relative flex-shrink-0 transition-all duration-[400ms] ${
              isExpanded ? 'translate-x-[-200px]' : 'translate-x-0'
            } group-hover:translate-x-[-4px]`}
            style={{
              transitionTimingFunction: isExpanded 
                ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' 
                : 'cubic-bezier(0.22, 1, 0.36, 1)'
            }}
          >
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
        
        {/* Hover-only Tooltip - appears at right edge on hover */}
        {!isExpanded && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 origin-right opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100 transition-all duration-200 pointer-events-none">
            <div className="bg-gradient-to-r from-sky-400/70 via-purple-500/70 to-pink-500/70 rounded-full p-[1px] shadow-xl shadow-black/40">
              <div className="rounded-full px-4 py-2 bg-black/65 backdrop-blur-xl text-xs text-white whitespace-nowrap flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-300 animate-pulse" />
                <span>Your VITANA guide awaits inside</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
