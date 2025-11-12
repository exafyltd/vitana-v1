import { BookFlipCard } from "./BookFlipCard";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Profile {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  match_score: number;
  match_reasons: string[];
  shared_interests?: string[];
}

interface BookFlipViewProps {
  profiles: Profile[];
  currentIndex: number;
  onConnect: (userId: string) => void;
  onPass: (userId: string) => void;
  onSuperConnect: (userId: string) => void;
  onProfileTap: (userId: string) => void;
  onIndexChange: (newIndex: number) => void;
}

export function BookFlipView({
  profiles,
  currentIndex,
  onConnect,
  onPass,
  onSuperConnect,
  onProfileTap,
  onIndexChange,
}: BookFlipViewProps) {
  const [keyPulse, setKeyPulse] = useState<'left' | 'right' | 'up' | null>(null);

  const handleFlip = (direction: 'left' | 'right' | 'up') => {
    const currentProfile = profiles[currentIndex];
    if (!currentProfile) return;

    if (direction === 'left') {
      onPass(currentProfile.user_id);
    } else if (direction === 'right') {
      onConnect(currentProfile.user_id);
    } else if (direction === 'up') {
      onSuperConnect(currentProfile.user_id);
    }

    onIndexChange(currentIndex + 1);
  };

  const handleTap = () => {
    const currentProfile = profiles[currentIndex];
    if (currentProfile) {
      onProfileTap(currentProfile.user_id);
    }
  };

  // Keyboard pulse feedback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'ArrowLeft') {
        setKeyPulse('left');
      } else if (e.key === 'ArrowRight') {
        setKeyPulse('right');
      } else if (e.key === 'ArrowUp') {
        setKeyPulse('up');
      }
      
      setTimeout(() => setKeyPulse(null), 300);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentProfile = profiles[currentIndex];
  const peekLeftProfile = currentIndex > 0 ? profiles[currentIndex - 1] : null;
  const peekRightProfile = profiles[currentIndex + 1];

  if (!currentProfile) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-4 backdrop-blur-xl bg-card/60 rounded-3xl border border-border/20 shadow-2xl p-8">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-foreground">
            You've discovered everyone!
          </h3>
          <p className="text-muted-foreground mb-4">
            Great connections are built daily
          </p>
          <p className="text-sm text-muted-foreground">
            Check back tomorrow for fresh matches ✨
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Roulette Deck Area */}
      <div className="h-[420px] max-w-[1520px] mx-auto px-6 lg:px-8 flex items-center justify-center" style={{ perspective: '1600px' }}>
        {/* Book Spread Layout */}
        <div className="flex items-center justify-center gap-8 xl:gap-10 relative">
          {/* Peek Left */}
          {peekLeftProfile && (
            <motion.div 
              className="hidden lg:block xl:w-[360px] xl:h-[210px] lg:w-[320px] lg:h-[190px] opacity-60 cursor-pointer z-10 rounded-[22px] ring-1 ring-border/20 shadow-2xl hover:opacity-75 hover:brightness-100 hover:blur-0 hover:scale-[0.78] transition-all duration-300"
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 0.6, scale: 0.75, filter: 'brightness(0.9) blur(0.5px)' }}
              transition={{ duration: 0.5, ease: [0.455, 0.03, 0.515, 0.955] }}
              onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
            >
              <BookFlipCard
                profile={peekLeftProfile}
                onFlip={() => {}}
                onTap={() => {}}
                isPeek
                peekSide="left"
              />
            </motion.div>
          )}

          {/* Current Page */}
          <div className="xl:w-[720px] lg:w-[640px] md:w-[560px] w-[92vw] z-20">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentProfile.user_id}
                initial={{ opacity: 0.6, x: 420, scale: 0.7 }}
                animate={{ 
                  opacity: 1, 
                  x: 0, 
                  scale: keyPulse ? 0.98 : 1,
                  rotate: keyPulse === 'left' ? -2 : keyPulse === 'right' ? 2 : keyPulse === 'up' ? -1 : 0
                }}
                exit={{ opacity: 0.6, x: -420, scale: 0.7 }}
                transition={{ 
                  duration: 0.5,
                  ease: [0.455, 0.03, 0.515, 0.955]
                }}
              >
                <BookFlipCard
                  profile={currentProfile}
                  onFlip={handleFlip}
                  onTap={handleTap}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Peek Right */}
          {peekRightProfile && (
            <motion.div 
              className="hidden lg:block xl:w-[360px] xl:h-[210px] lg:w-[320px] lg:h-[190px] opacity-60 cursor-pointer z-10 rounded-[22px] ring-1 ring-border/20 shadow-2xl hover:opacity-75 hover:brightness-100 hover:blur-0 hover:scale-[0.78] transition-all duration-300"
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 0.6, scale: 0.75, filter: 'brightness(0.9) blur(0.5px)' }}
              transition={{ duration: 0.5, ease: [0.455, 0.03, 0.515, 0.955] }}
              onClick={() => onIndexChange(Math.min(profiles.length - 1, currentIndex + 1))}
            >
              <BookFlipCard
                profile={peekRightProfile}
                onFlip={() => {}}
                onTap={() => {}}
                isPeek
                peekSide="right"
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Match Reason Chip Below */}
      <div className="mt-2 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100/10 backdrop-blur-md text-sm italic text-foreground">
          <span>✨</span>
          {currentProfile.match_reasons[0] || 'Great wellness alignment!'}
        </div>
      </div>
    </div>
  );
}
