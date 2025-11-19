import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';
import { useVitanalandNavigation } from '@/context/VitanalandNavigationContext';
import { VitanalandWorldLayer } from './VitanalandWorldLayer';
import { CentralGuideOrb } from './CentralGuideOrb';
import { GreetingMicrocopy } from './GreetingMicrocopy';
import { playSound } from '@/lib/playSound';

export function PersistentGuideOrb() {
  const { isExpanded, orbVisible, expandToFull, worldVisible } = useVitanalandNavigation();

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !isExpanded && orbVisible) {
        e.preventDefault();
        
        // Play pulse sound
        playSound("/sounds/vitanaland/pulse-chime.mp3", 0.12);
        
        // Trigger visual pulse on mini orb
        window.dispatchEvent(new CustomEvent('vitanaland-keyboard-trigger'));
        
        // Small delay to let pulse animation play
        setTimeout(() => {
          expandToFull();
        }, 200);
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
            {/* Glassy transparent background */}
            <div className="absolute inset-0 bg-background/10 backdrop-blur-md" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
