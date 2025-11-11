import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Sparkles } from "lucide-react";

interface SwipeableProfileCardProps {
  profile: {
    user_id: string;
    display_name: string;
    age?: number;
    avatar_url?: string;
    bio?: string;
    location?: string;
    professional_headline?: string;
    vitana_index?: number;
    vitana_percentile?: number;
    activity_time_preference?: 'morning' | 'afternoon' | 'evening' | 'flexible';
    top_3_interests?: string[];
    certification_badges?: string[];
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

  // Get activity time icon
  const getActivityIcon = (time?: string) => {
    switch (time) {
      case 'morning': return '☀️';
      case 'afternoon': return '🌤️';
      case 'evening': return '🌙';
      case 'flexible': return '⚡';
      default: return null;
    }
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
          {/* Vitana Index & Match Score Badges */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
            <Badge className="bg-accent text-accent-foreground font-bold text-base px-3 py-1">
              {profile.match_score}% Match
            </Badge>
            {profile.vitana_index && (
              <Badge variant="secondary" className="bg-card/90 backdrop-blur text-xs px-2.5 py-1">
                Vitana {profile.vitana_index} {profile.vitana_percentile && `• Top ${profile.vitana_percentile}%`}
              </Badge>
            )}
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

          {/* Name & Age */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="text-3xl font-bold text-center text-foreground">
              {profile.display_name}
            </h2>
            {profile.age && (
              <span className="text-2xl font-semibold text-muted-foreground">{profile.age}</span>
            )}
          </div>

          {/* Professional Headline */}
          {profile.professional_headline && (
            <p className="text-center text-sm font-medium text-accent mb-2">
              {profile.professional_headline}
            </p>
          )}

          {/* Location & Activity Time */}
          <div className="flex items-center justify-center gap-3 mb-3">
            {profile.location && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{profile.location}</span>
              </div>
            )}
            {profile.activity_time_preference && getActivityIcon(profile.activity_time_preference) && (
              <div className="flex items-center gap-1">
                <span className="text-base">{getActivityIcon(profile.activity_time_preference)}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  {profile.activity_time_preference}
                </span>
              </div>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-center text-sm text-muted-foreground mb-3 line-clamp-3 leading-relaxed px-2">
              {profile.bio}
            </p>
          )}

          {/* Certification Badges */}
          {profile.certification_badges && profile.certification_badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center mb-3">
              {profile.certification_badges.map((cert, idx) => (
                <Badge key={idx} variant="outline" className="text-[10px] px-2 py-0.5 bg-accent/5">
                  {cert}
                </Badge>
              ))}
            </div>
          )}

          {/* Top 3 Interests (or Shared Interests fallback) */}
          {((profile.top_3_interests && profile.top_3_interests.length > 0) || 
            (profile.shared_interests && profile.shared_interests.length > 0)) && (
            <div className="mb-4">
              <div className="flex items-center gap-1 mb-2 justify-center">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {profile.top_3_interests ? 'Top Interests' : 'Shared Interests'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {(profile.top_3_interests || profile.shared_interests?.slice(0, 3) || []).map((interest, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs font-medium">
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
