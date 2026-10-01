import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';
import { t } from '@/lib/i18n-toast';

interface OnboardingSpeechProps {
  onComplete: () => void;
}

// VTID-04760: the welcome bubbles come from the i18n catalog (they were
// hardcoded English, and promised a multi-month journey no screen shows).
// They now point a newcomer at the one effortless start: the Audiobook.
const SPEECH_KEYS = [
  'screens.onboarding.speechWelcome',
  'screens.onboarding.speechNoRush',
  'screens.onboarding.speechAudiobook',
  'screens.onboarding.speechOrb',
  'screens.onboarding.speechNavigate',
  'screens.onboarding.speechActions',
  'screens.onboarding.speechGetToKnow',
] as const;

/** Base delay in ms between messages; longer messages get more time */
const BASE_INTERVAL = 3000;
const MS_PER_CHAR = 12; // extra ~12ms per character for reading time
/** Time for the last message before calling onComplete */
const FINAL_DELAY = 2000;

function getMessageDelay(messages: string[], messageIndex: number): number {
  const msg = messages[messageIndex];
  if (!msg) return BASE_INTERVAL;
  return BASE_INTERVAL + Math.min(msg.length * MS_PER_CHAR, 4000);
}

export function OnboardingSpeech({ onComplete }: OnboardingSpeechProps) {
  const { translate } = useTranslation();
  const messages = SPEECH_KEYS.map((key) => t(key));
  const messageCount = messages.length;
  // Read through a ref so the timer chain keeps using the current language
  // without restarting the sequence when it re-renders.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [visibleCount, setVisibleCount] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = useCallback(() => {
    setVisibleCount(prev => {
      const next = prev + 1;
      if (next >= SPEECH_KEYS.length) {
        // All messages shown — fire completion after a short pause
        timerRef.current = setTimeout(onComplete, FINAL_DELAY);
        return SPEECH_KEYS.length;
      }
      // Schedule next message with dynamic delay based on message length
      timerRef.current = setTimeout(advance, getMessageDelay(messagesRef.current, next));
      return next;
    });
  }, [onComplete]);

  // Start the message sequence
  useEffect(() => {
    if (skipped) return;
    timerRef.current = setTimeout(advance, 800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [advance, skipped]);

  // Auto-scroll to bottom as messages appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [visibleCount]);

  const handleSkip = () => {
    setSkipped(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisibleCount(messageCount);
    setTimeout(onComplete, 600);
  };

  return (
    <div className="flex flex-col h-full max-h-[70vh] relative">
      {/* Message area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-thin"
      >
        <AnimatePresence>
          {messages.slice(0, visibleCount).map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="flex items-start gap-3"
            >
              {/* Orb avatar */}
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF7BAC] to-[#C084FC] flex items-center justify-center shadow-md">
                  <span className="text-white text-xs font-bold">V</span>
                </div>
              </div>
              {/* Message bubble */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl rounded-tl-md px-4 py-3 shadow-sm max-w-[85%]">
                <p className="text-sm text-gray-800 leading-relaxed">{msg}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator while messages are still incoming */}
        {visibleCount < messageCount && !skipped && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-3"
          >
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF7BAC] to-[#C084FC] flex items-center justify-center shadow-md">
                <span className="text-white text-xs font-bold">V</span>
              </div>
            </div>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Skip button */}
      {visibleCount < messageCount && !skipped && (
        <div className="px-4 pb-4 pt-2">
          <button
            onClick={handleSkip}
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            {translate('onboarding.skipIntro', 'Skip intro')}
          </button>
        </div>
      )}
    </div>
  );
}
