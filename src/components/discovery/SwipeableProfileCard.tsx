import { motion, useMotionValue, useTransform, PanInfo, animate } from "framer-motion";
import { useState, useRef } from "react";
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
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 120;
    const upThreshold = -120;

    if (Math.abs(info.offset.x) > threshold || Math.abs(info.offset.y) > 120) {
      // Enhanced exit animation with blur and rotation
      animate(cardRef.current!, {
        opacity: 0,
        scale: 0.8,
        filter: 'blur(8px)',
        rotateZ: info.offset.x > 0 ? 15 : info.offset.x < 0 ? -15 : 0,
      }, { duration: 0.3 });

      if (info.offset.y < upThreshold) {
        onSwipe('up');
      } else if (info.offset.x > threshold) {
        onSwipe('right');
      } else if (info.offset.x < -threshold) {
        onSwipe('left');
      }
    }
  };

  // Get gradient overlay based on Vitana Index
  const getVitanaGradient = () => {
    if (!profile.vitana_index) return "from-accent/30 via-accent/15 to-transparent";
    
    const tier = getVitanaIndexTier(profile.vitana_index);
    const colorMap: Record<string, string> = {
      "Excellent": "from-blue-500/40 via-cyan-400/25 to-transparent",
      "Good": "from-green-500/40 via-emerald-400/25 to-transparent",
      "Improving": "from-lime-500/40 via-green-400/25 to-transparent",
      "Fair": "from-yellow-500/40 via-amber-400/25 to-transparent",
      "Poor": "from-orange-500/40 via-yellow-400/25 to-transparent",
      "Very Poor": "from-red-400/40 via-orange-400/25 to-transparent"
    };
    
    return colorMap[tier.label] || "from-accent/30 via-accent/15 to-transparent";
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPos = (e.clientX - rect.left) / rect.width;
    const yPos = (e.clientY - rect.top) / rect.height;
    
    setTiltX((yPos - 0.5) * 8);
    setTiltY((xPos - 0.5) * -8);
  };

  const handleMouseLeave = () => {
    setTiltX(0);
    setTiltY(0);
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
      ref={cardRef}
      style={{
        x,
        y,
        rotate,
        opacity,
        rotateX: tiltX,
        rotateY: tiltY,
        transformStyle: 'preserve-3d',
        ...style,
      }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      onClick={onTap}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="absolute w-full cursor-pointer will-change-transform"
    >
      <div className="relative overflow-hidden rounded-3xl shadow-2xl h-[600px]">
        {/* Full Background Photo - face centered at 25% */}
        <div 
          className="absolute inset-0 bg-cover"
          style={{
            backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : 'none',
            backgroundColor: profile.avatar_url ? 'transparent' : 'hsl(var(--accent))',
            backgroundPosition: 'center 25%'
          }}
        />
        
        {/* Soft top fade for contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-transparent h-[20%]" />
        
        {/* Gradient Overlay with Vitana tier color - starts from 60% height downward */}
        <div className={`absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-b ${getVitanaGradient()}`} />
        
        {/* Vignette for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />

        {/* Top-left Match Badge with Glow - repositioned to avoid face */}
        <div className="absolute top-6 left-6 z-30">
          <div className="relative">
            {/* Animated glow ring */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full blur-xl opacity-50 animate-pulse" />
            
            {/* Badge */}
            <Badge className="relative bg-gradient-to-r from-emerald-400 to-cyan-400 text-white font-bold text-base px-4 py-2 shadow-2xl border-0">
              {profile.match_score}% Match 🌿
            </Badge>
          </div>
        </div>

        {/* Glass Info Panel - Lowered by ~40px for better visual balance */}
        <div className="absolute inset-x-0 backdrop-blur-2xl bg-background/35 rounded-t-3xl border-t border-border/30 p-6 flex flex-col" 
             style={{ bottom: '0px', height: 'calc(60% - 40px)', minHeight: '280px' }}>
          
          {/* Name & Age */}
          <div className="flex items-baseline justify-start gap-2 mb-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              {profile.display_name}
            </h2>
            {profile.age && (
              <span className="text-2xl font-semibold text-white/80">, {profile.age}</span>
            )}
          </div>

          {/* Professional Headline */}
          {profile.professional_headline && (
            <p className="text-base font-semibold text-accent mb-3">
              {profile.professional_headline}
            </p>
          )}

          {/* Location & Activity Time */}
          <div className="flex items-center gap-4 mb-4 text-white/90">
            {profile.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">{profile.location}</span>
              </div>
            )}
            {profile.activity_time_preference && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/40 backdrop-blur">
                <span className="text-base">{getActivityIcon(profile.activity_time_preference)}</span>
                <span className="text-xs font-medium capitalize">
                  {profile.activity_time_preference}
                </span>
              </div>
            )}
          </div>

          {/* Vitana Index Badge */}
          {profile.vitana_index && (
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary" className="bg-background/60 backdrop-blur text-sm px-3 py-1.5 font-semibold">
                <Zap className="h-4 w-4 mr-1.5 text-accent" />
                Vitana Index: {profile.vitana_index}
              </Badge>
              {profile.vitana_percentile && (
                <Badge variant="secondary" className="bg-background/60 backdrop-blur text-xs px-2 py-1 font-medium">
                  Top {profile.vitana_percentile}%
                </Badge>
              )}
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-white/90 mb-4 line-clamp-3 leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Top Interests */}
          {profile.top_3_interests && profile.top_3_interests.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Interests
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.top_3_interests.map((interest, idx) => (
                  <Badge 
                    key={idx} 
                    variant="secondary" 
                    className="text-xs font-medium bg-background/60 backdrop-blur px-3 py-1 rounded-full"
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Match Reason - Pushed to Bottom */}
          <div className="mt-auto pt-4">
            <div className="bg-gradient-to-r from-accent/20 via-accent/10 to-accent/20 rounded-xl p-3 border border-accent/30 backdrop-blur">
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
          className="absolute top-1/3 left-8 z-30 bg-background/90 backdrop-blur rounded-2xl p-4 shadow-2xl border-2 border-red-500/60"
        >
          <div className="text-5xl">❌</div>
        </motion.div>
        
        <motion.div
          style={{ opacity: useTransform(x, [0, 150], [0, 1]) }}
          className="absolute top-1/3 right-8 z-30 bg-background/90 backdrop-blur rounded-2xl p-4 shadow-2xl border-2 border-green-500/60"
        >
          <div className="text-5xl">💚</div>
        </motion.div>
        
        <motion.div
          style={{ opacity: useTransform(y, [-150, 0], [1, 0]) }}
          className="absolute top-12 left-1/2 -translate-x-1/2 z-30 bg-background/90 backdrop-blur rounded-2xl p-4 shadow-2xl border-2 border-yellow-500/60"
        >
          <div className="text-5xl">⭐</div>
        </motion.div>
      </div>
    </motion.div>
  );
}
