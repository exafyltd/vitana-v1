import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { MapPin, Sparkles, Zap } from "lucide-react";
import { getVitanaIndexTier } from "@/lib/vitanaIndex";

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
  
  const rotate = useTransform(x, [-200, 200], [-8, 8]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 120;
    const upThreshold = -120;

    if (info.offset.y < upThreshold) {
      onSwipe('up');
    } else if (info.offset.x > threshold) {
      onSwipe('right');
    } else if (info.offset.x < -threshold) {
      onSwipe('left');
    }
  };

  // Get gradient overlay based on Vitana Index
  const getVitanaGradient = () => {
    if (!profile.vitana_index) return "from-accent/40 via-accent/20 to-transparent";
    
    const tier = getVitanaIndexTier(profile.vitana_index);
    const colorMap: Record<string, string> = {
      "Excellent": "from-blue-500/50 via-cyan-400/30 to-transparent",
      "Good": "from-green-500/50 via-emerald-400/30 to-transparent",
      "Improving": "from-lime-500/50 via-green-400/30 to-transparent",
      "Fair": "from-yellow-500/50 via-amber-400/30 to-transparent",
      "Poor": "from-orange-500/50 via-yellow-400/30 to-transparent",
      "Very Poor": "from-red-400/50 via-orange-400/30 to-transparent"
    };
    
    return colorMap[tier.label] || "from-accent/40 via-accent/20 to-transparent";
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
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      onClick={onTap}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="absolute w-full cursor-pointer will-change-transform"
    >
      <div className="relative overflow-hidden rounded-3xl shadow-2xl h-[600px]">
        {/* Background Image with Blur */}
        <div 
          className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-40"
          style={{
            backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : 'none',
            backgroundColor: profile.avatar_url ? 'transparent' : 'hsl(var(--accent))'
          }}
        />
        
        {/* Gradient Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-b ${getVitanaGradient()}`} />
        
        {/* Glass Background */}
        <div className="absolute inset-0 backdrop-blur-3xl bg-background/60" />

        {/* Content Container */}
        <div className="relative h-full flex flex-col p-6">
          
          {/* Top Badges */}
          <div className="absolute top-6 right-6 z-20 flex flex-col gap-2 items-end">
            {profile.vitana_percentile && (
              <Badge className="bg-gradient-to-r from-accent/90 to-accent text-accent-foreground font-bold text-sm px-3 py-1.5 shadow-lg backdrop-blur">
                Top {profile.vitana_percentile}%
              </Badge>
            )}
          </div>

          {/* Avatar Section - Top Third */}
          <div className="flex-shrink-0 flex flex-col items-center pt-8 pb-6">
            <div className="relative">
              <div className="h-40 w-40 rounded-full overflow-hidden ring-4 ring-background/50 shadow-2xl">
                <img 
                  src={profile.avatar_url} 
                  alt={profile.display_name}
                  className="h-full w-full object-cover"
                />
              </div>
              {/* Match Score Ring */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-base px-4 py-1.5 shadow-xl">
                  {profile.match_score}% Match
                </Badge>
              </div>
            </div>
          </div>

          {/* Glass Info Panel - Bottom Two Thirds */}
          <div className="flex-1 flex flex-col backdrop-blur-xl bg-card/70 rounded-2xl p-6 shadow-xl border border-border/20">
            
            {/* Name & Age */}
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <h2 className="text-3xl font-bold text-foreground">
                {profile.display_name}
              </h2>
              {profile.age && (
                <span className="text-2xl font-semibold text-muted-foreground">, {profile.age}</span>
              )}
            </div>

            {/* Professional Headline */}
            {profile.professional_headline && (
              <p className="text-center text-base font-semibold text-accent mb-3">
                {profile.professional_headline}
              </p>
            )}

            {/* Location & Activity Time */}
            <div className="flex items-center justify-center gap-4 mb-4 text-muted-foreground">
              {profile.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-medium">{profile.location}</span>
                </div>
              )}
              {profile.activity_time_preference && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/40">
                  <span className="text-base">{getActivityIcon(profile.activity_time_preference)}</span>
                  <span className="text-xs font-medium capitalize">
                    {profile.activity_time_preference}
                  </span>
                </div>
              )}
            </div>

            {/* Vitana Index Badge */}
            {profile.vitana_index && (
              <div className="flex justify-center mb-4">
                <Badge variant="secondary" className="bg-background/60 backdrop-blur text-sm px-3 py-1.5 font-semibold">
                  <Zap className="h-4 w-4 mr-1.5 text-accent" />
                  Vitana Index: {profile.vitana_index}
                </Badge>
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="text-center text-sm text-foreground/80 mb-4 line-clamp-3 leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Top Interests */}
            {profile.top_3_interests && profile.top_3_interests.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2 justify-center">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Interests
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {profile.top_3_interests.map((interest, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="text-xs font-medium bg-background/60 backdrop-blur px-3 py-1"
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Certification Badges */}
            {profile.certification_badges && profile.certification_badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                {profile.certification_badges.slice(0, 2).map((cert, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="text-[10px] px-2 py-0.5 bg-accent/10 border-accent/30"
                  >
                    {cert}
                  </Badge>
                ))}
              </div>
            )}

            {/* Match Reason - Spacer Push to Bottom */}
            <div className="mt-auto pt-4">
              <div className="bg-gradient-to-r from-accent/20 via-accent/10 to-accent/20 rounded-xl p-3 border border-accent/30">
                <p className="text-sm text-center font-semibold text-foreground flex items-center justify-center gap-2">
                  <span className="text-base">✨</span>
                  {profile.match_reasons[0] || 'Great wellness alignment!'}
                </p>
              </div>
            </div>
          </div>

          {/* Swipe Action Indicators */}
          <motion.div
            style={{ opacity: useTransform(x, [-150, 0], [1, 0]) }}
            className="absolute top-1/3 left-8 z-30 bg-background/90 backdrop-blur rounded-2xl p-4 shadow-2xl border-2 border-red-500/50"
          >
            <div className="text-5xl">❌</div>
          </motion.div>
          
          <motion.div
            style={{ opacity: useTransform(x, [0, 150], [0, 1]) }}
            className="absolute top-1/3 right-8 z-30 bg-background/90 backdrop-blur rounded-2xl p-4 shadow-2xl border-2 border-green-500/50"
          >
            <div className="text-5xl">💚</div>
          </motion.div>
          
          <motion.div
            style={{ opacity: useTransform(y, [-150, 0], [1, 0]) }}
            className="absolute top-12 left-1/2 -translate-x-1/2 z-30 bg-background/90 backdrop-blur rounded-2xl p-4 shadow-2xl border-2 border-yellow-500/50"
          >
            <div className="text-5xl">⭐</div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
