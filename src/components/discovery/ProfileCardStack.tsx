import { useState } from "react";
import { SwipeableProfileCard } from "./SwipeableProfileCard";
import { AnimatePresence } from "framer-motion";

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

interface ProfileCardStackProps {
  profiles: Profile[];
  onConnect: (userId: string) => void;
  onPass: (userId: string) => void;
  onSuperConnect: (userId: string) => void;
  onProfileTap: (userId: string) => void;
}

export function ProfileCardStack({
  profiles,
  onConnect,
  onPass,
  onSuperConnect,
  onProfileTap,
}: ProfileCardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleSwipe = (direction: 'left' | 'right' | 'up') => {
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

  // Show up to 3 cards in the stack
  const visibleProfiles = profiles.slice(currentIndex, currentIndex + 3);

  if (visibleProfiles.length === 0) {
    return (
      <div className="relative w-full h-[550px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-foreground">
            You've seen all matches for today!
          </h3>
          <p className="text-muted-foreground">
            Check back tomorrow for new connections
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[550px]">
      <AnimatePresence>
        {visibleProfiles.map((profile, index) => {
          const isTop = index === 0;
          const scale = 1 - index * 0.05;
          const yOffset = index * 10;

          return (
            <SwipeableProfileCard
              key={profile.user_id}
              profile={profile}
              onSwipe={isTop ? handleSwipe : () => {}}
              onTap={isTop ? handleTap : () => {}}
              style={{
                zIndex: visibleProfiles.length - index,
                scale,
                transform: `translateY(${yOffset}px)`,
                pointerEvents: isTop ? 'auto' : 'none',
              } as React.CSSProperties}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
