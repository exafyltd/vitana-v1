import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OrbCore } from "./OrbCore";
import { playSound } from "@/lib/playSound";

interface VitanaOrbButtonProps {
  onClick?: () => void;
}

export function VitanaOrbButton({ onClick }: VitanaOrbButtonProps) {
  const [isPulsing, setIsPulsing] = useState(false);

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
    const orb = (window as any).VitanaOrb;
    if (orb?.open) {
      orb.open();
    }
    onClick?.();
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
            aria-label="Vitana Voice (Cmd+K)"
          >
            <motion.div
              animate={isPulsing ? { scale: [1, 1.15, 1] } : undefined}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <OrbCore size="sm" />
            </motion.div>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Vitana Voice (⌘K)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
