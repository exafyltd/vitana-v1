import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

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
              {/* Outer halo glow */}
              <motion.div
                className="absolute inset-[-14px] rounded-full"
                style={{
                  background: 'radial-gradient(ellipse 108% 100%, rgba(76, 200, 244, 0.4) 0%, rgba(76, 200, 244, 0.2) 40%, transparent 70%)',
                  filter: 'blur(18px)',
                }}
                animate={{
                  scale: [1, 1.04, 1],
                  opacity: [0.7, 0.9, 0.7],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                whileHover={{
                  opacity: 1,
                  scale: 1.06,
                }}
              />

              {/* Secondary glow ring */}
              <motion.div
                className="absolute inset-[-10px] rounded-full"
                style={{
                  background: 'radial-gradient(ellipse 110% 105%, rgba(76, 200, 244, 0.15) 0%, rgba(76, 200, 244, 0.08) 50%, transparent 70%)',
                  filter: 'blur(12px)',
                }}
                animate={{
                  opacity: [0.6, 0.8, 0.6],
                }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Thin glowing border ring */}
              <motion.div
                className="absolute inset-[-2px] rounded-full"
                style={{
                  background: 'radial-gradient(ellipse 108% 100%, transparent 70%, rgba(76, 200, 244, 0.75) 75%, transparent 80%)',
                  filter: 'blur(1.5px)',
                }}
                animate={{
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Main orb sphere (64px) - crystal gradient */}
              <motion.div
                className="relative w-16 h-16 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.95), rgba(200, 240, 255, 0.85) 45%, rgba(150, 220, 255, 0.75) 70%, rgba(76, 200, 244, 0.6))',
                  boxShadow: 'inset 0 0 32px rgba(255, 255, 255, 0.4), 0 4px 16px rgba(0, 0, 0, 0.15)',
                }}
                animate={{
                  scale: [1, 1.03, 1],
                  scaleX: [1, 1.015, 1, 0.985, 1],
                  scaleY: [1, 0.985, 1, 1.015, 1],
                }}
                transition={{
                  scale: {
                    duration: 8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                  scaleX: {
                    duration: 8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                  scaleY: {
                    duration: 8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                }}
                whileHover={{
                  scale: 1.05,
                }}
              >
                {/* Highlight spot for 3D depth */}
                <div
                  className="absolute top-[20%] left-[25%] w-[35%] h-[35%] rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9), transparent 65%)',
                    filter: 'blur(4px)',
                  }}
                />
                
                {/* Inner shimmer highlight */}
                <motion.div
                  className="absolute inset-[15%] rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9), rgba(76, 200, 244, 0.3))',
                    filter: 'blur(6px)',
                  }}
                  animate={{
                    opacity: [0.6, 0.8, 0.6],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </motion.div>
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
