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
    <div className="max-w-[1280px] mx-auto px-6 lg:px-8 h-full flex items-center justify-center" style={{ perspective: '1600px' }}>
      {/* Book Spread Layout */}
      <div className="flex items-center justify-center gap-4 lg:gap-6 w-full h-full relative">
        {/* Peek Left */}
        {peekLeftProfile && (
          <motion.div 
            className="hidden lg:block absolute left-0 opacity-35 blur-[2px]"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 0.35, x: 0, scale: 0.5 }}
            transition={{ duration: 0.3 }}
            style={{ transform: 'translateX(-280px)' }}
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

        {/* Current Card - 320x190px */}
        <div className="w-full lg:w-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentProfile.user_id}
              initial={{ opacity: 0, rotateY: -12, x: -100, scale: 0.95 }}
              animate={{ opacity: 1, rotateY: 0, x: 0, scale: 1 }}
              exit={{ opacity: 0, rotateY: 12, x: 100, scale: 0.95 }}
              transition={{ 
                type: "spring", 
                stiffness: 260, 
                damping: 20,
                duration: 0.4,
                delay: 0.1,
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
            className="hidden lg:block absolute right-0 opacity-35 blur-[2px]"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 0.35, x: 0, scale: 0.5 }}
            transition={{ duration: 0.3 }}
            style={{ transform: 'translateX(280px)' }}
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
  );
}
