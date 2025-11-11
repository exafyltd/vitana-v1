import { motion, PanInfo, animate } from "framer-motion";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { MapPin, Sparkles, Zap } from "lucide-react";
import { getVitanaIndexTier } from "@/lib/vitanaIndex";

interface BookFlipCardProps {
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
  onFlip: (direction: 'left' | 'right' | 'up') => void;
  onTap: () => void;
  isPeek?: boolean;
  peekSide?: 'left' | 'right';
}

export function BookFlipCard({ profile, onFlip, onTap, isPeek, peekSide }: BookFlipCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 120;
    const upThreshold = -120;

    if (Math.abs(info.offset.x) > threshold || Math.abs(info.offset.y) > 120) {
      // Book flip animation
      const direction = info.offset.x > 0 ? 'right' : info.offset.x < 0 ? 'left' : 'up';
      const rotateY = direction === 'right' ? [0, 12, 22] : direction === 'left' ? [0, -12, -22] : [0, 0, 0];
      const translateX = direction === 'right' ? [0, 140, 560] : direction === 'left' ? [0, -140, -560] : [0, 0, 0];
      const rotateX = direction === 'up' ? [0, -10, -20] : [0, 0, 0];

      animate(cardRef.current!, {
        opacity: [1, 0.9, 0],
        rotateY,
        rotateX,
        x: translateX,
        scale: direction === 'up' ? [1, 1.04, 0.95] : [1, 0.98, 0.85],
        filter: 'blur(12px)',
      }, { duration: 0.4, ease: [0.65, 0, 0.35, 1] });

      if (info.offset.y < upThreshold) {
        onFlip('up');
      } else if (info.offset.x > threshold) {
        onFlip('right');
      } else if (info.offset.x < -threshold) {
        onFlip('left');
      }
    }
  };

  const getVitanaGradient = () => {
    // Translucent emerald-green glass gradient for all cards - slightly reduced tint
    return "from-emerald-500/45 via-emerald-400/25 to-transparent";
  };

  const getActivityIcon = (time?: string) => {
    switch (time) {
      case 'morning': return '☀️';
      case 'afternoon': return '🌤️';
      case 'evening': return '🌙';
      case 'flexible': return '⚡';
      default: return null;
    }
  };

  if (isPeek) {
    return (
      <div 
        className={`w-full h-[640px] rounded-3xl bg-cover bg-center opacity-25 blur-[3px] pointer-events-none`}
        style={{
          backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : 'none',
          backgroundColor: profile.avatar_url ? 'transparent' : 'hsl(var(--accent))',
        }}
      />
    );
  }

  return (
    <motion.div
      ref={cardRef}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      onClick={onTap}
      whileHover={{ 
        scale: 1.02,
        rotateY: 2,
        transition: { duration: 0.15 }
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="w-full cursor-pointer will-change-transform ring-1 ring-emerald-400/40 shadow-emerald-400/20"
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className="relative w-[960px] h-[640px] max-w-[90vw] lg:max-w-[92vw] rounded-[1.75rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.25)] ring-1 ring-emerald-300/10 overflow-hidden">
        {/* Full Background Photo - face centered at 40% */}
        <div 
          className="absolute inset-0 bg-cover z-0"
          style={{
            backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : 'none',
            backgroundColor: profile.avatar_url ? 'transparent' : 'hsl(var(--accent))',
            backgroundPosition: '50% 40%',
            objectFit: 'cover',
            boxShadow: 'inset 0 0 120px rgba(0,0,0,0.35)' // Vignette
          }}
        />
        
        {/* Gradient Overlay - only from bottom 70% → 100% */}
        <div 
          className={`absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t ${getVitanaGradient()} backdrop-blur-xl z-10`}
          style={{ filter: 'brightness(1.1)' }}
        />

        {/* Top-left Match Badge with subtle glow */}
        <div className="absolute top-6 left-6 z-20">
          <div className="relative">
            {/* Subtle glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full blur-lg opacity-30" />
            
            {/* Badge */}
            <Badge className="relative bg-gradient-to-r from-emerald-400 to-cyan-400 text-white font-bold text-base px-4 py-2 shadow-2xl border-0">
              {profile.match_score}% Match 🌿
            </Badge>
          </div>
        </div>

        {/* Glass Content Panel - bottom 45% */}
        <div className="absolute bottom-0 inset-x-0 p-6 pb-8 backdrop-blur-xl bg-emerald-200/10 dark:bg-emerald-300/10 rounded-b-3xl border-t border-emerald-400/20 z-20 flex flex-col h-[45%]">
          <div className="backdrop-blur-[12px] rounded-b-3xl h-full flex flex-col">
            {/* Name & Age */}
            <div className="flex items-baseline justify-start gap-2 mb-2">
              <h2 className="text-3xl font-semibold tracking-tight text-white" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
                {profile.display_name}
              </h2>
              {profile.age && (
                <span className="text-3xl font-semibold text-white/90" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>, {profile.age}</span>
              )}
            </div>

            {/* Professional Headline */}
            {profile.professional_headline && (
              <p className="text-base text-white/90 mb-2" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
                {profile.professional_headline}
              </p>
            )}

            {/* Location & Activity Time */}
            <div className="flex items-center gap-4 mb-3 text-white/80">
              {profile.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-medium" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>{profile.location}</span>
                </div>
              )}
              {profile.activity_time_preference && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur">
                  <span className="text-base">{getActivityIcon(profile.activity_time_preference)}</span>
                  <span className="text-xs font-medium capitalize" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
                    {profile.activity_time_preference}
                  </span>
                </div>
              )}
            </div>

            {/* Vitana Index Badge */}
            {profile.vitana_index && (
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="bg-white/10 backdrop-blur text-sm px-3 py-1.5 font-semibold text-white/90" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
                  <Zap className="h-4 w-4 mr-1.5 text-emerald-400" />
                  Vitana Index: {profile.vitana_index}
                </Badge>
                {profile.vitana_percentile && (
                  <Badge variant="secondary" className="bg-white/10 backdrop-blur text-xs px-2 py-1 font-medium text-white/80" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
                    Top {profile.vitana_percentile}%
                  </Badge>
                )}
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-white/80 mb-3 line-clamp-2 leading-relaxed" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
                {profile.bio}
              </p>
            )}

            {/* Top Interests */}
            {profile.top_3_interests && profile.top_3_interests.length > 0 && (
              <div className="mb-4 pb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white/70 uppercase tracking-wider" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
                    Interests
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.top_3_interests.map((interest, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="text-xs font-medium bg-white/10 backdrop-blur px-3 py-1 rounded-full text-white/80"
                      style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Match Reason - Below the card as a separate chip */}
      <div className="mt-3 max-w-[960px] mx-auto">
        <div className="bg-gradient-to-r from-accent/20 via-accent/10 to-accent/20 rounded-xl p-3 border border-accent/30 backdrop-blur">
          <p className="text-sm text-center font-semibold text-foreground flex items-center justify-center gap-2">
            <span className="text-base">✨</span>
            {profile.match_reasons[0] || 'Great wellness alignment!'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
