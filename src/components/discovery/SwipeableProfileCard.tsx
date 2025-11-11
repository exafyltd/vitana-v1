import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Sparkles } from "lucide-react";

interface SwipeableProfileCardProps {
  profile: {
    user_id: string;
    display_name: string;
    avatar_url?: string;
    bio?: string;
    location?: string;
    match_score: number;
    match_reasons: string[];
    shared_interests?: string[];
  };
  onSwipe: (direction: 'left' | 'right' | 'up') => void;
  onTap: () => void;
  style?: React.CSSProperties;
}

export function SwipeableProfileCard({ profile, onSwipe, onTap, style }: SwipeableProfileCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 150;
    const upThreshold = -150;

    if (info.offset.y < upThreshold) {
      onSwipe('up'); // Super connect
    } else if (info.offset.x > threshold) {
      onSwipe('right'); // Connect
    } else if (info.offset.x < -threshold) {
      onSwipe('left'); // Pass
    }
  };

  // Generate gradient based on match score
  const getGradient = (score: number) => {
    if (score >= 85) return "from-green-400 to-blue-500";
    if (score >= 70) return "from-purple-400 to-pink-500";
    return "from-orange-400 to-yellow-500";
  };

  return (
    <motion.div
      style={{
        x,
        y,
        rotate,
        opacity,
        ...style,
      }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      onClick={onTap}
      className="absolute w-full cursor-pointer"
    >
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${getGradient(profile.match_score)} p-1 shadow-xl`}>
        <div className="relative h-[550px] rounded-xl bg-card p-6 flex flex-col">
          {/* Match Score Badge */}
          <div className="absolute top-4 right-4 z-10">
            <Badge className="bg-accent text-accent-foreground font-bold text-base px-3 py-1">
              {profile.match_score}% Match
            </Badge>
          </div>

          {/* Avatar */}
          <div className="flex justify-center mb-4">
            <Avatar className="h-32 w-32 ring-4 ring-background">
              <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
              <AvatarFallback className="text-3xl">
                {profile.display_name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Name */}
          <h2 className="text-3xl font-bold text-center mb-2 text-foreground">
            {profile.display_name}
          </h2>

          {/* Location */}
          {profile.location && (
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-4">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{profile.location}</span>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <p className="text-center text-sm text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Shared Interests */}
          {profile.shared_interests && profile.shared_interests.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1 mb-2 justify-center">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Shared Interests
                </span>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {profile.shared_interests.slice(0, 4).map((interest, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Match Reason */}
          <div className="mt-auto">
            <div className="bg-accent/10 rounded-lg p-3 border border-accent/20">
              <p className="text-sm text-center font-medium text-accent-foreground">
                ⚡ {profile.match_reasons[0] || 'Great wellness alignment!'}
              </p>
            </div>
          </div>

          {/* Swipe Indicators */}
          <motion.div
            style={{ opacity: useTransform(x, [-150, 0], [1, 0]) }}
            className="absolute top-1/2 left-8 -translate-y-1/2 z-10"
          >
            <div className="text-6xl">👎</div>
          </motion.div>
          <motion.div
            style={{ opacity: useTransform(x, [0, 150], [0, 1]) }}
            className="absolute top-1/2 right-8 -translate-y-1/2 z-10"
          >
            <div className="text-6xl">💚</div>
          </motion.div>
          <motion.div
            style={{ opacity: useTransform(y, [-150, 0], [1, 0]) }}
            className="absolute top-8 left-1/2 -translate-x-1/2 z-10"
          >
            <div className="text-6xl">⭐</div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
