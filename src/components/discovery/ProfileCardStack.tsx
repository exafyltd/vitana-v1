import { useState } from "react";
import { SwipeableProfileCard } from "./SwipeableProfileCard";
import { AnimatePresence } from "framer-motion";
import { t } from '@/lib/i18n-toast';

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
      <div className="relative w-full h-[620px] flex items-center justify-center">
        <div className="text-center space-y-4 backdrop-blur-xl bg-card/60 rounded-3xl border border-border/20 shadow-2xl p-8">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-foreground">
            {t('screens.discovery.youVeDiscoveredEveryone')}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t('screens.discovery.greatConnectionsBuiltDaily')}
          </p>
          <p className="text-sm text-muted-foreground">
            Check back tomorrow for 10 new fresh matches ✨
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[620px] perspective-1000">
      <AnimatePresence>
        {visibleProfiles.map((profile, index) => {
          const isTop = index === 0;
          const scale = 1 - index * 0.08;
          const yOffset = index * 20;
          const rotateZ = index * -5;
          const rotateY = index * -8;
          const opacity = index === 0 ? 1 : 0.5 - (index * 0.15);

          return (
            <SwipeableProfileCard
              key={profile.user_id}
              profile={profile}
              onSwipe={isTop ? handleSwipe : () => {}}
              onTap={isTop ? handleTap : () => {}}
              style={{
                zIndex: visibleProfiles.length - index,
                opacity,
                transform: `translateY(${yOffset}px) scale(${scale}) rotateZ(${rotateZ}deg) rotateY(${rotateY}deg)`,
                transformOrigin: 'center center',
                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                pointerEvents: isTop ? 'auto' : 'none',
              } as React.CSSProperties}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
