import { useIsMobile } from "@/hooks/use-mobile";
import { VitanalandPortalSeed } from "@/components/audio/VitanalandPortalSeed";
import { useVitanalandNavigation } from "@/context/VitanalandNavigationContext";
import { playSound } from "@/lib/playSound";
import { motion } from "framer-motion";

/**
 * Mobile-only fixed ORB that docks directly above the bottom of the screen.
 * 
 * Positioning:
 * - Centered horizontally
 * - Fixed at bottom with safe-area-inset awareness
 * - z-40 (above content, below modals)
 */
export function MobileFixedOrb() {
  const isMobile = useIsMobile();
  const { expandToFull, orbVisible } = useVitanalandNavigation();
  const { setAudioOverlayVisible } = useStreamingState();
  
  // Only render on mobile
  if (!isMobile || !orbVisible) {
    return null;
  }
  
  const handleOrbClick = () => {
    playSound("/sounds/vitanaland/spark-chime.mp3", 0.12);
    expandToFull();
    setTimeout(() => {
      setAudioOverlayVisible(true);
    }, 100);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
      className="vitana-orb"
      data-orb="vitana"
      data-vitana-orb="true"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleOrbClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOrbClick();
          }
        }}
        aria-label="Ask VITANA for guidance"
        className="cursor-pointer"
      >
        <VitanalandPortalSeed 
          audioState="idle"
          volumeLevel={0}
          size="nav"
          layoutId="vitana-orb-mobile"
          glowIntensity={0}
        />
      </div>
    </motion.div>
  );
}
