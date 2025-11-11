import { useState } from "react";
import { BookFlipCard } from "./BookFlipCard";
import { AnimatePresence, motion } from "framer-motion";

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
  onConnect: (userId: string) => void;
  onPass: (userId: string) => void;
  onSuperConnect: (userId: string) => void;
  onProfileTap: (userId: string) => void;
}

export function BookFlipView({
  profiles,
  onConnect,
  onPass,
  onSuperConnect,
  onProfileTap,
}: BookFlipViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

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

    setCurrentIndex(prev => prev + 1);
  };

  const handleTap = () => {
    const currentProfile = profiles[currentIndex];
    if (currentProfile) {
      onProfileTap(currentProfile.user_id);
    }
  };

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
      <div className="h-[420px] max-w-[1400px] mx-auto px-6 lg:px-8 flex items-center justify-center" style={{ perspective: '1600px' }}>
        {/* Book Spread Layout */}
        <div className="flex items-center justify-center gap-6 relative">
          {/* Peek Left */}
          {peekLeftProfile && (
            <motion.div 
              className="hidden lg:block w-[360px] h-[210px] opacity-70 blur-[0.5px] cursor-pointer z-10 rounded-[22px] ring-1 ring-white/20 shadow-2xl hover:opacity-85 hover:blur-0 hover:scale-[0.52] transition-all duration-300"
              style={{ transform: 'translateX(-280px) scale(0.5)' }}
              initial={{ opacity: 0, x: 280, scale: 0.5 }}
              animate={{ opacity: 0.70, x: -280, scale: 0.5 }}
              transition={{ duration: 0.45, ease: [0.65, 0, 0.35, 1] }}
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
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
                initial={{ opacity: 0.45, x: 420, scale: 0.7 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0.45, x: -420, scale: 0.7 }}
                transition={{ 
                  duration: 0.45,
                  ease: [0.65, 0, 0.35, 1]
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
              className="hidden lg:block w-[360px] h-[210px] opacity-70 blur-[0.5px] cursor-pointer z-10 rounded-[22px] ring-1 ring-white/20 shadow-2xl hover:opacity-85 hover:blur-0 hover:scale-[0.52] transition-all duration-300"
              style={{ transform: 'translateX(280px) scale(0.5)' }}
              initial={{ opacity: 0, x: -280, scale: 0.5 }}
              animate={{ opacity: 0.70, x: 280, scale: 0.5 }}
              transition={{ duration: 0.45, ease: [0.65, 0, 0.35, 1] }}
              onClick={() => setCurrentIndex(prev => Math.min(profiles.length - 1, prev + 1))}
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
