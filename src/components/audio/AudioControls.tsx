import { motion } from 'framer-motion';
import { Mic, MicOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioControlsProps {
  micActive: boolean;
  onMicToggle: () => void;
  onExit: () => void;
}

export function AudioControls({ micActive, onMicToggle, onExit }: AudioControlsProps) {
  return (
    <div className="flex items-center gap-6">
      {/* Exit button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onExit}
        className={cn(
          'h-14 w-14 rounded-full',
          'bg-card/80 backdrop-blur-xl border border-border/50',
          'hover:bg-card shadow-lg',
          'flex items-center justify-center',
          'transition-colors duration-200'
        )}
        aria-label="Exit audio mode"
      >
        <X className="h-5 w-5 text-foreground" />
      </motion.button>

      {/* Mic toggle button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onMicToggle}
        className={cn(
          'h-16 w-16 rounded-full shadow-lg',
          'flex items-center justify-center',
          'transition-all duration-200',
          micActive
            ? 'bg-red-600 hover:bg-red-700 ring-4 ring-red-500/30'
            : 'bg-card/80 backdrop-blur-xl hover:bg-card border border-border/50'
        )}
        aria-label={micActive ? 'Stop recording' : 'Start recording'}
      >
        {micActive ? (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Mic className="h-6 w-6 text-white" />
          </motion.div>
        ) : (
          <MicOff className="h-6 w-6 text-foreground" />
        )}
      </motion.button>
    </div>
  );
}
