import { motion, PanInfo, animate } from "framer-motion";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { MapPin, Sparkles, Zap } from "lucide-react";
import { getVitanaIndexTier } from "@/lib/vitanaIndex";
import { ProfileImage } from "./ProfileImage";
import { t } from '@/lib/i18n-toast';
import type { MatchReason } from '@/lib/matchReason';

interface BookFlipCardProps {
  profile: {
    user_id: string;
    display_name: string;
    age?: number;
    avatar_url?: string;
    bio?: string;
    location?: string;
    professional_headline?: string;
    story_cue?: string;
    vitana_index?: number;
    vitana_percentile?: number;
    activity_time_preference?: 'morning' | 'afternoon' | 'evening' | 'flexible';
    top_3_interests?: string[];
    certification_badges?: string[];
    match_score: number;
    match_reasons: MatchReason[];
    shared_interests?: string[];
    streak_days?: number;
    primary_pillar?: string;
  };
  onFlip: (direction: 'left' | 'right' | 'up') => void;
  onTap: () => void;
  isPeek?: boolean;
  peekSide?: 'left' | 'right';
}

export function BookFlipCard({ profile, onFlip, onTap, isPeek, peekSide }: BookFlipCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Text stroke for maximum legibility on transparent backgrounds
  const textStrokeStyle = {
    WebkitTextStroke: '0.8px rgba(0,0,0,0.95)',
    paintOrder: 'stroke fill' as const,
    textShadow: '0 0 1px rgba(0,0,0,1), 0 1px 6px rgba(0,0,0,0.9), 0 2px 16px rgba(0,0,0,0.7)'
  };

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
    // Vibrant emerald gradient matching the reference aesthetic
    return "from-emerald-600/75 via-emerald-500/50 to-transparent";
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

  const getPillarGlyph = (pillar?: string) => {
    switch (pillar?.toLowerCase()) {
      case 'vitality': return '⚡';
      case 'nutrition': return '🥗';
      case 'movement': return '🏃';
      case 'recovery': return '🧘';
      case 'mental': return '🧠';
      case 'purpose': return '🎯';
      default: return '🌿';
    }
  };

  if (isPeek) {
    return (
      <div className="w-full h-[210px] rounded-[22px] ring-1 ring-white/20 shadow-xl overflow-hidden">
        <ProfileImage
          src={profile.avatar_url}
          alt={`${profile.display_name}'s profile`}
          className="w-full h-full"
          priority="normal"
          objectPosition="50% 35%"
        />
      </div>
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
      className="w-full cursor-pointer will-change-transform"
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className="relative w-[580px] h-[340px] max-w-[92vw] rounded-[22px] shadow-[0_18px_48px_-12px_rgba(0,0,0,0.35)] overflow-hidden">
        {/* Full Background Photo - face centered at 35% */}
        <div className="absolute inset-0 z-0" style={{ boxShadow: 'inset 0 0 80px rgba(0,0,0,0.2)' }}>
          <ProfileImage
            src={profile.avatar_url}
            alt={`${profile.display_name}'s profile`}
            className="w-full h-full"
            priority="high"
            objectPosition="50% 35%"
          />
        </div>

        {/* Faint Background Pillar Glyph */}
        {profile.primary_pillar && (
          <div 
            className="absolute top-1/3 right-8 text-[180px] leading-none opacity-15 pointer-events-none transition-opacity duration-300 group-hover:opacity-25 z-[5]"
            style={{ textShadow: '0 0 60px rgba(255,255,255,0.3)' }}
          >
            {getPillarGlyph(profile.primary_pillar)}
          </div>
        )}
        

        {/* Top-left Match Badge with enhanced glow */}
        <div className="absolute top-4 left-4 z-20">
          <div className="relative">
            {/* Enhanced glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full blur-xl opacity-40" />
            
            {/* Larger Badge */}
            <Badge className="relative bg-gradient-to-r from-emerald-400 to-cyan-400 text-white font-extrabold text-lg px-4 py-2 shadow-2xl border-0">
              <span style={{ textShadow: '0 1px 6px rgba(0,0,0,0.35)' }}>{t('screens.discovery.match_scoreMatch', { match_score: profile.match_score })}
              </span>
            </Badge>
          </div>
        </div>

        {/* Bottom Scrim for Premium Glass Contrast */}
        <div className="absolute bottom-0 inset-x-0 h-[46%] bg-gradient-to-t from-emerald-600/35 via-emerald-400/18 to-transparent pointer-events-none z-15" />

        {/* Glass Content Panel - ultra-light premium glass */}
        <div className="absolute bottom-0 inset-x-0 px-4 py-3 backdrop-blur-xl bg-emerald-100/10 dark:bg-emerald-300/10 rounded-2xl ring-1 ring-white/12 z-20 flex flex-col h-[42%]">
          <div className="rounded-2xl h-full flex flex-col">
            {/* Name & Age */}
            <div className="flex items-baseline justify-start gap-2 mb-1">
              <h2 className="text-xl font-semibold tracking-tight text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]" style={textStrokeStyle}>
                {profile.display_name}
              </h2>
              {profile.age && (
                <span className="text-xl font-semibold text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]" style={textStrokeStyle}>, {profile.age}</span>
              )}
            </div>

            {/* Professional Headline */}
            {profile.professional_headline && (
              <p className="text-sm text-white font-medium mb-0.5 drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]" style={textStrokeStyle}>
                {profile.professional_headline}
              </p>
            )}

            {/* Story Cue */}
            {profile.story_cue && (
              <p className="text-xs text-white italic mb-1 drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]" style={textStrokeStyle}>
                "{profile.story_cue.slice(0, 45)}{profile.story_cue.length > 45 ? '...' : ''}"
              </p>
            )}

            {/* Location & Activity Time */}
            <div className="flex items-center gap-2 mb-1.5 text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]">
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-medium" style={textStrokeStyle}>{profile.location}</span>
                </div>
              )}
              {profile.activity_time_preference && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/12 ring-1 ring-white/15 backdrop-blur-md">
                  <span className="text-sm">{getActivityIcon(profile.activity_time_preference)}</span>
                  <span className="text-xs font-medium capitalize" style={textStrokeStyle}>
                    {profile.activity_time_preference}
                  </span>
                </div>
              )}
            </div>

            {/* Vitana Index Badge with Merged Micro-badges */}
            {profile.vitana_index && (
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <Badge variant="secondary" className="bg-white/12 ring-1 ring-white/15 backdrop-blur-md text-sm px-3 py-1.5 font-semibold text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]" style={textStrokeStyle}>
                  <Zap className="h-4 w-4 mr-1 text-emerald-400" />{t('screens.discovery.viVitana_index', { vitana_index: profile.vitana_index })}</Badge>
                {profile.vitana_percentile && (
                  <Badge variant="secondary" className="bg-white/12 ring-1 ring-white/15 backdrop-blur-md text-xs px-2 py-0.5 font-semibold text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]" style={textStrokeStyle}>{t('screens.discovery.topVitana_percentile', { vitana_percentile: profile.vitana_percentile })}
                  </Badge>
                )}
                {profile.streak_days && profile.streak_days > 0 && (
                  <Badge variant="secondary" className="bg-white/12 ring-1 ring-white/15 backdrop-blur-md text-xs px-2 py-0.5 font-semibold text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]" style={textStrokeStyle}>
                    🔥 {profile.streak_days}d
                  </Badge>
                )}
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="text-[10px] text-white mb-1.5 line-clamp-2 leading-relaxed drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]" style={textStrokeStyle}>
                {profile.bio}
              </p>
            )}

            {/* Top Interests */}
            {profile.top_3_interests && profile.top_3_interests.length > 0 && (
              <div className="mb-2 pb-2">
                <div className="flex items-center gap-1 mb-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]" style={textStrokeStyle}>
                    {t('screens.discovery.interests')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.top_3_interests.map((interest, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="text-xs font-medium bg-white/12 ring-1 ring-white/15 backdrop-blur-md px-3 py-1 rounded-full text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]"
                      style={textStrokeStyle}
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
      
    </motion.div>
  );
}
