import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';

interface AudioStatusTextProps {
  audioState: 'idle' | 'listening' | 'processing' | 'speaking' | 'error' | 'reconnecting';
  errorMessage?: string;
}

export function AudioStatusText({ audioState, errorMessage }: AudioStatusTextProps) {
  const { translate } = useTranslation();

  const statusMessages = {
    idle: '', // VITANALAND speaks instead
    listening: translate('audio.listening', "I'm listening..."),
    processing: translate('audio.processing', 'One moment...'),
    speaking: translate('audio.speaking', 'VITANA is speaking...'),
    error: translate('audio.connectionError', 'Connection issue. Please try again.'),
    reconnecting: translate('audio.reconnecting', 'Reconnecting — one moment, please pause.'),
  };

  const message = audioState === 'error' && errorMessage ? errorMessage : statusMessages[audioState];

  return (
    <div className="mt-4 text-center">
      <AnimatePresence mode="wait">
        <motion.p
          key={audioState}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className="text-sm text-muted-foreground font-medium"
        >
          {message}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
