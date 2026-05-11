import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronRight, Share2, UserPlus, UserCheck, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { getVitanaIndexTier } from "@/lib/vitanaIndex";
import { useTranslation } from "@/hooks/useTranslation";
import { useVitanaIndexCache } from "@/components/health/VitanaIndexProvider";
import { avatarPositionStyle } from "@/lib/avatarPosition";
import { getAutoAvatarUrl } from "@/lib/autoAvatar";
import { t } from '@/lib/i18n-toast';

interface MobileIdentityCardProps {
  avatarUrl?: string | null;
  avatarOffsetX?: number;
  avatarOffsetY?: number;
  displayName: string;
  handle?: string;
  archetype?: string;
  vitanaIndex?: number;
  vitanaPercentile?: number;
  editMode?: boolean;
  isOwner?: boolean;
  onEdit?: () => void;
  onShare?: () => void;
  onFollow?: () => void;
  onMessage?: () => void;
  isFollowing?: boolean;
  followLoading?: boolean;
  onViewFullId?: () => void;
  className?: string;
}

export function MobileIdentityCard({
  avatarUrl,
  avatarOffsetX,
  avatarOffsetY,
  displayName,
  handle,
  archetype,
  vitanaIndex: vitanaIndexProp,
  vitanaPercentile = 15,
  editMode = false,
  isOwner = true,
  onEdit,
  onShare,
  onFollow,
  onMessage,
  isFollowing = false,
  followLoading = false,
  onViewFullId,
  className
}: MobileIdentityCardProps) {
  const { translate } = useTranslation();
  const { index: liveIndex } = useVitanaIndexCache();
  const vitanaIndex = vitanaIndexProp ?? liveIndex?.total ?? 0;

  const initials = displayName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const tier = getVitanaIndexTier(vitanaIndex);

  return (
    <div className={cn("px-4 pt-safe-top pb-2", className)}>
      {/* Glass Identity Card */}
      <div 
        className="relative rounded-2xl border border-white/5 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(216, 53%, 8%) 0%, hsl(222, 47%, 11%) 100%)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)"
        }}
        onClick={onViewFullId}
        role={onViewFullId ? "button" : undefined}
        tabIndex={onViewFullId ? 0 : undefined}
      >
        {/* Share button - top left (only for owner view) */}
        {isOwner && onShare && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-3 left-3 h-8 px-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-white/80 hover:text-white z-10 text-xs font-medium gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
          >
            <Share2 className="h-3.5 w-3.5" />
            {translate('common.share', 'Share')}
          </Button>
        )}

        <div className="p-6 flex flex-col items-center">
          {/* Avatar with subtle glow */}
          <div className="relative mb-4">
            <div 
              className="absolute inset-0 rounded-full blur-xl opacity-30"
              style={{ background: `radial-gradient(circle, ${tier.color}, transparent 70%)` }}
            />
            <Avatar className="relative h-24 w-24 border-[3px] border-white/10 shadow-lg">
              <AvatarImage
                src={avatarUrl && avatarUrl.length > 0 ? avatarUrl : getAutoAvatarUrl(handle ?? displayName ?? "vitana")}
                alt={displayName}
                style={avatarPositionStyle(avatarOffsetX, avatarOffsetY)}
              />
              <AvatarFallback className="text-xl font-semibold bg-white/5 text-white/80">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Name */}
          <h1 className="text-lg font-semibold text-white text-center">
            {displayName}
          </h1>

          {/* Handle + Archetype */}
          <p className="text-sm text-white/60 text-center mt-0.5">
            {handle && <span>@{handle}</span>}
            {handle && archetype && <span> · </span>}
            {archetype && <span>{archetype}</span>}
          </p>

          {/* Action buttons row for non-owner */}
          {!isOwner && (
            <div className="flex gap-2 justify-center mt-4">
              {onShare && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-white/80 hover:text-white text-xs font-medium gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare();
                  }}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {translate('common.share', 'Share')}
                </Button>
              )}
              {onFollow && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-3 rounded-full backdrop-blur-sm border border-white/20 text-xs font-medium gap-1.5",
                    isFollowing
                      ? "bg-white/20 text-white hover:bg-white/10"
                      : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFollow();
                  }}
                  disabled={followLoading}
                >
                  {isFollowing ? (
                    <UserCheck className="h-3.5 w-3.5" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  {isFollowing ? "Following" : "Follow"}
                </Button>
              )}
              {onMessage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-white/80 hover:text-white text-xs font-medium gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMessage();
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {t('screens.profile.message')}
                </Button>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="w-full h-px bg-white/5 my-5" />

          {/* Vitana Index Section */}
          <div className="flex flex-col items-center w-full">
            {/* Label */}
            <span className="text-[10px] font-medium tracking-[0.2em] text-white/40 uppercase mb-3">
              {translate('profile.identity.vitanaIndex')}
            </span>

            {/* Score with ambient glow */}
            <div className="relative flex items-center justify-center mb-2">
              {/* Ambient halo */}
              <div 
                className="absolute w-28 h-28 rounded-full blur-2xl opacity-20"
                style={{ background: `radial-gradient(circle, ${tier.color}, transparent 70%)` }}
              />
              
              {/* Score number */}
              <span 
                className="relative text-5xl font-extrabold"
                style={{
                  background: "linear-gradient(135deg, hsl(199, 36%, 58%) 0%, hsl(239, 36%, 72%) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 20px rgba(14, 165, 233, 0.25))"
                }}
              >
                {vitanaIndex}
              </span>
            </div>

            {/* Tier badge */}
            <div 
              className="px-3 py-1 rounded-full text-xs font-semibold mb-2"
              style={{ 
                backgroundColor: `${tier.color}20`,
                color: tier.color
              }}
            >{t('screens.profile.labelTopVitanapercentile', { label: t(tier.labelKey), vitanaPercentile })}
            </div>

            {/* Explanation */}
            <p className="text-[11px] text-white/40 italic text-center px-4">
              {translate('profile.identity.basedOnActivity')}
            </p>
          </div>

          {/* View Full ID CTA */}
          {onViewFullId && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-white/50 hover:text-white/80 hover:bg-white/5 text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onViewFullId();
              }}
            >
              {translate('profile.identity.viewLongevityId')}
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
