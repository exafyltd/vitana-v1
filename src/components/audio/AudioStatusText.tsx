import { motion, AnimatePresence } from 'framer-motion';

interface AudioStatusTextProps {
  audioState: 'idle' | 'listening' | 'processing' | 'error';
  errorMessage?: string;
}

const statusMessages = {
  idle: 'Welcome to VITANALAND.',
  listening: "I'm listening…",
  processing: 'Thinking about the best way to help…',
  error: 'Connection issue. Please try again.',
};

export function AudioStatusText({ audioState, errorMessage }: AudioStatusTextProps) {
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
