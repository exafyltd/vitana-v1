import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { VitanalandPortalSeed } from '@/components/audio/VitanalandPortalSeed';
import { useVitanalandNavigation } from '@/context/VitanalandNavigationContext';
import { useStreamingState } from '@/context/StreamingStateContext';
import { playSound } from '@/lib/playSound';

interface VitanaOrbButtonProps {
  onClick?: () => void;
}

export function VitanaOrbButton({ onClick }: VitanaOrbButtonProps) {
  const [isPulsing, setIsPulsing] = useState(false);
  const { expandToFull } = useVitanalandNavigation();
  const { setAudioOverlayVisible } = useStreamingState();
  
  // Listen for keyboard trigger event
  useEffect(() => {
    const handleKeyboardTrigger = () => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 400);
    };
    
    window.addEventListener('vitanaland-keyboard-trigger', handleKeyboardTrigger);
    return () => window.removeEventListener('vitanaland-keyboard-trigger', handleKeyboardTrigger);
  }, []);
  
  const handleOrbClick = () => {
    playSound("/sounds/vitanaland/spark-chime.mp3", 0.12);
    
    // Trigger both navigation expansion AND audio overlay
    expandToFull();
    
    // Ensure audio overlay is visible
    setTimeout(() => {
      setAudioOverlayVisible(true);
    }, 100);
    
    // Call optional parent onClick
    onClick?.();
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          className="p-3 h-[72px] w-[72px] rounded-full relative overflow-visible mx-auto cursor-pointer"
          onClick={handleOrbClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOrbClick();
              }
            }}
            aria-label="Ask VITANA for guidance (⌘K)"
          >
            {/* Keyboard-trigger pulse wrapper */}
            <motion.div
              className="relative"
              animate={isPulsing ? {
                scale: [1, 1.15, 1],
              } : undefined}
              transition={{
                duration: 0.4,
                ease: 'easeOut',
              }}
            >
              <VitanalandPortalSeed 
                audioState="idle"
                volumeLevel={0}
                size="sm"
                layoutId="vitana-orb"
              />
            </motion.div>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          className="bg-transparent border-none p-0 shadow-none"
        >
          <div className="bg-gradient-to-r from-sky-400/70 via-purple-500/70 to-pink-500/70 rounded-full p-[1px] shadow-xl shadow-black/40">
            <div className="rounded-full px-4 py-2 bg-black/65 backdrop-blur-xl text-xs text-white whitespace-nowrap flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-300 animate-pulse" />
              <span>Your VITANA guide awaits inside</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
