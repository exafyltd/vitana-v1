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
  const [showTooltip, setShowTooltip] = useState(false);

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
        console.log('[VitanaGuideOrbIntro] Expanding orb and tooltip...');
        setIsExpanded(true);
        setShowTooltip(true);
        
        // Hold expanded state for 2.5 seconds
        setTimeout(() => {
          console.log('[VitanaGuideOrbIntro] Hiding tooltip first...');
          setShowTooltip(false);
          
          // Wait for tooltip to fade out, then return orb to corner
          setTimeout(() => {
            console.log('[VitanaGuideOrbIntro] Returning orb to corner...');
            setIsExpanded(false);
            
            // Mark intro as shown (unless forced)
            if (!forceShow) {
              sessionStorage.setItem(INTRO_STORAGE_KEY, 'true');
              console.log('[VitanaGuideOrbIntro] Marked as shown in sessionStorage');
            }
          }, 250); // Wait for tooltip fade-out
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
        {/* Container for orb + expanding pill - both move together */}
        <div 
          className={`relative flex items-center gap-3 transition-all duration-[600ms] ${
            isExpanded ? 'translate-x-[-115px]' : 'translate-x-0'
          }`}
          style={{
            transitionTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)'
          }}
        >
          {/* Orb container - appears first (left) */}
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

          {/* Expanding text pill - appears second (right of orb) */}
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeOut", delay: 0.15 }}
                className="flex-shrink-0"
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
        </div>
        
        {/* Hover-only Tooltip - appears beside orb on hover */}
        {!isExpanded && (
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 origin-right opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100 transition-all duration-200 pointer-events-none">
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
