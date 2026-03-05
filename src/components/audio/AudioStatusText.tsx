import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';

interface AudioStatusTextProps {
  audioState: 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
  errorMessage?: string;
}

/** State-driven dot color map */
const dotColors: Record<string, string> = {
  idle: '#4CC8F4',
  listening: '#3B82F6',
  processing: '#FBBF24',
  speaking: '#06D6A0',
  error: '#F87171',
};

export function AudioStatusText({ audioState, errorMessage }: AudioStatusTextProps) {
  const { translate } = useTranslation();
  
  const statusMessages: Record<string, string> = {
    idle: translate('audio.askVitana', 'Ask VITANA...'),
    listening: translate('audio.listening', 'VITANA is listening...'),
    processing: translate('audio.processing', 'One moment...'),
    speaking: translate('audio.speaking', 'VITANA is speaking...'),
    error: translate('audio.offline', 'VITANA is offline'),
  };
  
  const message = audioState === 'error' && errorMessage ? errorMessage : statusMessages[audioState];
  const dotColor = dotColors[audioState] || dotColors.idle;

  return (
    <div className="mt-4 text-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={audioState}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-center gap-2"
        >
          {/* Pulsing color-coded dot */}
          <motion.span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: dotColor }}
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: audioState === 'processing' ? 1 : 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <p className="text-sm text-muted-foreground font-medium">
            {message}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
