import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';
import { useVitanalandNavigation } from '@/context/VitanalandNavigationContext';
import { VitanalandWorldLayer } from './VitanalandWorldLayer';
import { CentralGuideOrb } from './CentralGuideOrb';
import { GreetingMicrocopy } from './GreetingMicrocopy';

export function PersistentGuideOrb() {
  const { isExpanded, orbVisible, expandToFull, worldVisible } = useVitanalandNavigation();

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !isExpanded && orbVisible) {
        e.preventDefault();
        expandToFull();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, orbVisible, expandToFull]);

  if (!orbVisible) return null;

  return (
    <>
      {/* Full VITANALAND Experience Layer (z-90) */}
      <AnimatePresence>
        {worldVisible && (
          <motion.div
            className="fixed inset-0 z-[90]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          >
            {/* Dreamlike background */}
            <VitanalandWorldLayer />
            
            {/* Greeting text */}
            <div className="absolute inset-0 flex flex-col items-center justify-start pt-[20vh] lg:pt-[25vh]">
              <GreetingMicrocopy />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Orb (z-80) - Always visible when not expanded */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.button
            className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[80] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
            style={{ width: 60, height: 60 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={expandToFull}
            aria-label="Open VITANALAND Voice Assistant (Cmd+K)"
            title="Open Voice Assistant (⌘K)"
          >
            {/* Outer glow pulse */}
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400/30 to-purple-500/20 blur-lg"
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.6, 0.9, 0.6],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            
            {/* Core orb */}
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-white/95 to-cyan-100/80 shadow-2xl backdrop-blur-md border border-white/40">
              {/* Inner shimmer */}
              <motion.div
                className="absolute inset-[25%] rounded-full bg-white/60 blur-sm"
                animate={{
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              
              {/* Microphone icon */}
              <Mic className="absolute inset-0 m-auto w-5 h-5 text-cyan-600" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Keyboard hint tooltip */}
      {!isExpanded && (
        <div className="fixed bottom-[90px] right-4 md:bottom-[100px] md:right-6 z-[79] pointer-events-none">
          <motion.div
            className="px-2 py-1 rounded bg-black/80 backdrop-blur-sm text-white text-xs font-medium"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.7, y: 0 }}
            transition={{ delay: 2, duration: 0.4 }}
          >
            Press ⌘K
          </motion.div>
        </div>
      )}
    </>
  );
}
