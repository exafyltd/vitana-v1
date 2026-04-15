import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';

interface OnboardingSpeechProps {
  onComplete: () => void;
}

const SPEECH_MESSAGES = [
  "Welcome to Maxina, your longevity community! I'm Vitana, your personal guide.",
  "I'm always here for you \u2014 just tap the glowing orb button at the bottom of your screen to talk to me anytime.",
  "When you're done chatting, simply press the X to close our conversation.",
  "You can navigate anywhere by telling me \u2014 just say things like \u201COpen the calendar\u201D or \u201CShow me events\u201D and I'll take you there.",
  "I've set up your Autopilot \u2014 it's your personal wellness assistant that suggests daily actions tailored just for you.",
  "Your Calendar keeps track of everything: events, meetups, and your wellness tasks, all in one place.",
  "And here's something special \u2014 I've prepared a 90-day journey for you. It's a step-by-step path designed to help you build healthy habits and connect with the community.",
  "Remember, you're never alone \u2014 I'm always here to help and guide you whenever you need me. The beauty of your new journey is that I'm not just a companion who answers questions and points the way \u2014 I can also take action on your behalf. Just tell me what you need, and I'll take care of it. And to help you get started, I've already prepared a list of things for us to accomplish together in your 90-day journey \u2014 you'll find it all in your calendar!",
  "Now, let me get to know you a little better\u2026",
];

/** Base delay in ms between messages; longer messages get more time */
const BASE_INTERVAL = 3000;
const MS_PER_CHAR = 12; // extra ~12ms per character for reading time
/** Time for the last message before calling onComplete */
const FINAL_DELAY = 2000;

function getMessageDelay(messageIndex: number): number {
  const msg = SPEECH_MESSAGES[messageIndex];
  if (!msg) return BASE_INTERVAL;
  return BASE_INTERVAL + Math.min(msg.length * MS_PER_CHAR, 4000);
}

export function OnboardingSpeech({ onComplete }: OnboardingSpeechProps) {
  const { translate } = useTranslation();
  const [visibleCount, setVisibleCount] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = useCallback(() => {
    setVisibleCount(prev => {
      const next = prev + 1;
      if (next >= SPEECH_MESSAGES.length) {
        // All messages shown — fire completion after a short pause
        timerRef.current = setTimeout(onComplete, FINAL_DELAY);
        return SPEECH_MESSAGES.length;
      }
      // Schedule next message with dynamic delay based on message length
      timerRef.current = setTimeout(advance, getMessageDelay(next));
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
    setVisibleCount(SPEECH_MESSAGES.length);
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
          {SPEECH_MESSAGES.slice(0, visibleCount).map((msg, i) => (
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
        {visibleCount < SPEECH_MESSAGES.length && !skipped && (
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
      {visibleCount < SPEECH_MESSAGES.length && !skipped && (
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
