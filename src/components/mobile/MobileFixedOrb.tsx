import { motion } from "framer-motion";
import { VitanalandPortalSeed } from "@/components/audio/VitanalandPortalSeed";
import { playSound } from "@/lib/playSound";

export function MobileFixedOrb() {
  const handleOrbClick = () => {
    playSound("/sounds/vitanaland/spark-chime.mp3", 0.12);

    const tryOpenOrb = (attempt = 0) => {
      const orb = (window as any).VitanaOrb;
      if (orb?.open) {
        orb.open();
        return;
      }

      if (attempt < 8) {
        window.setTimeout(() => tryOpenOrb(attempt + 1), 120);
      }
    };

    tryOpenOrb();
  };

  return (
    <div className="fixed inset-x-0 bottom-5 z-[60] flex justify-center md:hidden pointer-events-none">
      <motion.div whileTap={{ scale: 0.95 }} className="pointer-events-auto">
        <div
          role="button"
          tabIndex={0}
          onClick={handleOrbClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleOrbClick();
            }
          }}
          aria-label="Ask VITANA for guidance"
          className="flex h-[72px] w-[72px] items-center justify-center rounded-full cursor-pointer"
        >
          <VitanalandPortalSeed
            audioState="idle"
            volumeLevel={0}
            size="sm"
            layoutId="vitana-orb-mobile-fixed"
          />
        </div>
      </motion.div>
    </div>
  );
}
