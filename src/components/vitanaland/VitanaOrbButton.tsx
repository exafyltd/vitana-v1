import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { OrbCore } from "./OrbCore";
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
            className="p-4 h-24 w-24 rounded-full relative overflow-visible mx-auto cursor-pointer"
            onClick={handleOrbClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOrbClick();
              }
            }}
            aria-label="Open VITANA Orb (⌘K)"
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
              <OrbCore 
                size="sm" 
                enableFloat={false}
                layoutId="vitana-orb"
              />
            </motion.div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Open VITANA Orb (⌘K)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
