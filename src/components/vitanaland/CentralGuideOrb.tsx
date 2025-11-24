import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { playSound } from '@/lib/playSound';
import { playLoopingSound } from '@/lib/playLoopingSound';
import { OrbCore } from './OrbCore';

interface CentralGuideOrbProps {
  audioState: 'idle' | 'listening' | 'processing' | 'error';
  volumeLevel: number;
}

export function CentralGuideOrb({ audioState, volumeLevel }: CentralGuideOrbProps) {
  const humRef = useRef<{ audio: HTMLAudioElement; stop: () => void } | null>(null);
  const prevAudioStateRef = useRef(audioState);

  // Handle sound effects based on audio state
  useEffect(() => {
    const prevState = prevAudioStateRef.current;
    
    // When listening starts
    if (audioState === 'listening' && prevState !== 'listening') {
      playSound("/sounds/vitanaland/listening-shimmer.mp3", 0.10);
    }
    
    // When processing starts
    if (audioState === 'processing' && prevState !== 'processing') {
      if (!humRef.current) {
        humRef.current = playLoopingSound("/sounds/vitanaland/thinking-hum.mp3", 0.03);
      }
    }
    
    // When processing stops
    if (audioState !== 'processing' && prevState === 'processing') {
      if (humRef.current) {
        humRef.current.stop();
        humRef.current = null;
      }
    }
    
    prevAudioStateRef.current = audioState;
  }, [audioState]);

  return (
    <motion.div
      className="relative"
      initial={{ scale: 0, y: 100 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0, y: 100 }}
      transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <OrbCore 
        size="xl" 
        audioState={audioState}
        volumeLevel={volumeLevel}
        enableFloat={true}
        layoutId="vitana-orb"
      />
    </motion.div>
  );
}
