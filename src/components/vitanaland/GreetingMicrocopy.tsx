import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const greetings = [
  "Welcome to VITANALAND.",
  "It's good to see you.",
  "How would you like to begin?",
  "I'm here to guide you.",
  "Just speak when you're ready.",
  "Ask me anything.",
  "Let's explore together.",
  "Where shall we go today?",
];

export function GreetingMicrocopy() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % greetings.length);
    }, 11000); // 1.5s fade in + 8s display + 1.5s fade out = 11s total

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-8 flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.p
          key={currentIndex}
          className="absolute text-center text-white/90 text-base lg:text-lg font-medium tracking-wide drop-shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{
            opacity: { duration: 1.5, ease: 'easeInOut' },
            y: { duration: 0.6, ease: 'easeOut' },
          }}
        >
          {greetings[currentIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
