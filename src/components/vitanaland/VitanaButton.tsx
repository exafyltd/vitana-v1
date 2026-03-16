import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { useVitanalandNavigation } from "@/context/VitanalandNavigationContext";
import { playSound } from "@/lib/playSound";

export function VitanaButton() {
  const { expandToFull } = useVitanalandNavigation();
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
    playSound("/sounds/vitanaland/spark-chime.mp3", 0.12);
    expandToFull();
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost"
            size="icon"
            className="rounded-full relative overflow-visible"
            onClick={handleOrbClick}
            aria-label="Enter VITANALAND (Cmd+K)"
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
              {/* Outer halo glow (cyan/teal) */}
              <motion.div
                className="absolute inset-[-10px] rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(34, 211, 238, 0.25) 0%, rgba(6, 182, 212, 0.15) 40%, transparent 70%)',
                  filter: 'blur(14px)',
                }}
                animate={{
                  scale: [1, 1.02, 1],
                  opacity: [0.7, 0.9, 0.7],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                whileHover={{
                  opacity: 1,
                  scale: 1.06,
                }}
              />

              {/* Secondary glow ring (cyan/blue) */}
              <motion.div
                className="absolute inset-[-7px] rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, rgba(14, 165, 233, 0.2) 50%, transparent 70%)',
                  filter: 'blur(10px)',
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
                  background: 'radial-gradient(circle, transparent 55%, rgba(255, 255, 255, 0.6) 65%, rgba(56, 189, 248, 0.9) 72%, transparent 80%)',
                  filter: 'blur(1px)',
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

              {/* Main orb sphere (36px) - rich gradient */}
              <motion.div
                className="relative w-9 h-9 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.95) 0%, rgba(224, 242, 254, 0.9) 20%, rgba(125, 211, 252, 0.85) 45%, rgba(14, 165, 233, 0.75) 70%, rgba(8, 145, 178, 0.7) 85%, rgba(6, 95, 138, 0.65) 100%)',
                  boxShadow: 'inset 0 0 24px rgba(255, 255, 255, 0.5), inset 0 0 12px rgba(56, 189, 248, 0.3), 0 4px 16px rgba(6, 182, 212, 0.4), 0 2px 8px rgba(14, 165, 233, 0.3)',
                }}
                animate={{
                  scale: [1, 1.03, 1],
                  scaleX: [1, 1.025, 1, 0.975, 1],
                  scaleY: [1, 0.975, 1, 1.025, 1],
                }}
                transition={{
                  scale: {
                    duration: 6,
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
                {/* Inner shimmer highlight */}
                <motion.div
                  className="absolute inset-[28%] rounded-full blur-[3px]"
                  style={{
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
                  }}
                  animate={{
                    opacity: [0.4, 0.7, 0.4],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </motion.div>
            </motion.div>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Enter Vitanaland (⌘K)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
