import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { VitanalandPortalSeed } from "@/components/audio/VitanalandPortalSeed";

interface VitanaOrbRevealIntroProps {
  onAnimationComplete?: () => void;
}

export function VitanaOrbRevealIntro({ onAnimationComplete }: VitanaOrbRevealIntroProps) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Check if user has seen the animation this session
    const hasSeenIntro = sessionStorage.getItem('vitana-orb-intro-seen');
    
    if (!hasSeenIntro) {
      setShouldRender(true);
      // Mark as seen for this session
      sessionStorage.setItem('vitana-orb-intro-seen', 'true');
    }
  }, []);

  const handleAnimationComplete = () => {
    if (onAnimationComplete) {
      onAnimationComplete();
    }
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <motion.div 
      className="fixed bottom-8 left-8 z-50 flex items-center gap-4 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onAnimationComplete={handleAnimationComplete}
    >
      {/* Orb container with horizontal slide animation */}
      <motion.div
        initial={{ x: 0 }}
        animate={{ 
          x: [0, 180, 180, 180, 0]
        }}
        transition={{ 
          times: [0, 0.15, 0.35, 0.75, 1],
          duration: 5.1,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
      >
        <VitanalandPortalSeed 
          audioState="idle"
          volumeLevel={0}
          size="sm"
        />
      </motion.div>

      {/* Text message with delayed reveal and early retract */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ 
          opacity: [0, 0, 1, 1, 1, 0],
          x: [-20, -20, 0, 0, 0, -20]
        }}
        transition={{
          times: [0, 0.1, 0.2, 0.35, 0.7, 0.85],
          duration: 5.1,
          ease: "easeOut"
        }}
        className="bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full"
      >
        <p className="text-white text-sm font-medium tracking-wide drop-shadow-lg whitespace-nowrap">
          Your VITANA Guide awaits inside
        </p>
      </motion.div>
    </motion.div>
  );
}
