import { BookFlipCard } from "./BookFlipCard";
import { AnimatePresence, motion } from "framer-motion";
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

  const currentProfile = profiles[currentIndex];
  const peekLeftProfile = currentIndex > 0 ? profiles[currentIndex - 1] : null;
  const peekRightProfile = profiles[currentIndex + 1];

  if (!currentProfile) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-4 backdrop-blur-xl bg-card/60 rounded-3xl border border-border/20 shadow-2xl p-8">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-foreground">
            {t('screens.discovery.youVeDiscoveredEveryone')}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t('screens.discovery.greatConnectionsBuiltDaily')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('screens.discovery.checkBackTomorrowForFreshMatches')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Roulette Deck Area */}
      <div className="h-[340px] max-w-[1520px] mx-auto px-6 lg:px-8 flex items-center justify-center" style={{ perspective: '1600px' }}>
        {/* Book Spread Layout */}
        <div className="flex items-center justify-center gap-4 xl:gap-6 relative">
          {/* Peek Left */}
          {peekLeftProfile && (
            <motion.div 
              className="hidden lg:block xl:w-[290px] xl:h-[170px] lg:w-[260px] lg:h-[155px] opacity-70 blur-[0.5px] cursor-pointer z-10 rounded-[22px] ring-1 ring-border/20 shadow-2xl hover:opacity-85 hover:blur-0 hover:scale-[1.02] transition-all duration-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.70 }}
              transition={{ duration: 0.45, ease: [0.65, 0, 0.35, 1] }}
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
          <div className="xl:w-[580px] lg:w-[520px] md:w-[450px] w-[92vw] z-20">
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
              className="hidden lg:block xl:w-[290px] xl:h-[170px] lg:w-[260px] lg:h-[155px] opacity-70 blur-[0.5px] cursor-pointer z-10 rounded-[22px] ring-1 ring-border/20 shadow-2xl hover:opacity-85 hover:blur-0 hover:scale-[1.02] transition-all duration-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.70 }}
              transition={{ duration: 0.45, ease: [0.65, 0, 0.35, 1] }}
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
      <div className="mt-1.5 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/10 backdrop-blur-md text-xs italic text-foreground">
          <span>✨</span>
          {currentProfile.match_reasons[0] || 'Great wellness alignment!'}
        </div>
      </div>
    </div>
  );
}
