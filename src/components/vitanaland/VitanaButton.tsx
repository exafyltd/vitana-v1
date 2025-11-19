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
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost"
            size="icon"
            className="rounded-full relative overflow-visible"
            onClick={expandToFull}
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
              {/* Outer halo glow (breathing) */}
              <motion.div
                className="absolute inset-[-8px] rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(76, 200, 244, 0.3) 0%, transparent 70%)',
                  filter: 'blur(12px)',
                }}
                animate={{
                  scale: [1, 1.03, 1],
                  opacity: [0.6, 0.8, 0.6],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                whileHover={{
                  opacity: 0.9,
                  scale: 1.05,
                }}
              />

              {/* Soft ring halo */}
              <motion.div
                className="absolute inset-[-6px] rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(76, 200, 244, 0.2) 0%, transparent 65%)',
                  filter: 'blur(8px)',
                }}
                animate={{
                  opacity: [0.5, 0.7, 0.5],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Thin glowing border */}
              <motion.div
                className="absolute inset-[-3px] rounded-full"
                style={{
                  background: 'radial-gradient(circle, transparent 60%, rgba(76, 200, 244, 0.8) 70%, transparent 75%)',
                  filter: 'blur(1.5px)',
                }}
                animate={{
                  opacity: [0.7, 0.9, 0.7],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Main orb sphere (36px) */}
              <motion.div
                className="relative w-9 h-9 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.95), rgba(200, 240, 255, 0.85) 45%, rgba(76, 200, 244, 0.7))',
                  boxShadow: 'inset 0 0 20px rgba(255, 255, 255, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15)',
                }}
                animate={{
                  scale: [1, 1.03, 1],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                {/* Inner shimmer */}
                <motion.div
                  className="absolute inset-[30%] rounded-full bg-white/60 blur-sm"
                  animate={{
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </motion.div>

              {/* Orbiting sparkle */}
              <motion.div
                className="absolute w-1 h-1 rounded-full bg-cyan-300"
                style={{
                  top: '50%',
                  left: '50%',
                  boxShadow: '0 0 4px rgba(76, 200, 244, 0.8)',
                }}
                animate={{
                  x: [18, 12.7, 0, -12.7, -18, -12.7, 0, 12.7, 18],
                  y: [0, -12.7, -18, -12.7, 0, 12.7, 18, 12.7, 0],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
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
