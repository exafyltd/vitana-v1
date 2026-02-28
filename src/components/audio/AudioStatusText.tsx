import { motion, AnimatePresence } from 'framer-motion';

interface AudioStatusTextProps {
  audioState: 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
  errorMessage?: string;
}

const STATE_COLORS: Record<string, string> = {
  listening: '#3B82F6',
  speaking: '#06D6A0',
  processing: '#FBBF24',
  idle: '#F87171',
  error: '#F87171',
};

const STATUS_MESSAGES: Record<string, string> = {
  listening: 'VITANA is listening...',
  speaking: 'VITANA is talking...',
  processing: 'VITANA is thinking...',
  idle: 'VITANA is offline',
  error: 'VITANA is offline',
};

export function AudioStatusText({ audioState, errorMessage }: AudioStatusTextProps) {
  const message = audioState === 'error' && errorMessage ? errorMessage : STATUS_MESSAGES[audioState];
  const color = STATE_COLORS[audioState] || STATE_COLORS.idle;

  return (
    <div className="mt-4 text-center">
      <AnimatePresence mode="wait">
        <motion.p
          key={audioState}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className="text-sm font-medium"
          style={{ color }}
        >
          {message}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
