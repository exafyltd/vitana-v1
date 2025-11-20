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

interface VitanaOrbButtonProps {
  onClick?: () => void;
}

export function VitanaOrbButton({ onClick }: VitanaOrbButtonProps) {
  const [isPulsing, setIsPulsing] = useState(false);
  
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
    // TODO: Phase 2 - Play spark-chime.mp3 sound
    onClick?.();
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost"
            size="icon"
            className="h-16 w-16 rounded-full relative overflow-visible mx-auto"
            onClick={handleOrbClick}
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
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Open VITANA Orb (⌘K)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
