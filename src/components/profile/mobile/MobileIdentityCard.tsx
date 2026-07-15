import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronRight, Share2, TrendingUp, UserPlus, UserCheck, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { getVitanaIndexTier } from "@/lib/vitanaIndex";
import { useTranslation } from "@/hooks/useTranslation";
import { useVitanaIndexCache } from "@/components/health/VitanaIndexProvider";
import { avatarPositionStyle } from "@/lib/avatarPosition";
import { getAutoAvatarUrl } from "@/lib/autoAvatar";
import { useFollow } from "@/hooks/useFollow";
import { resolveProfileUserId } from "@/lib/resolveProfileUserId";
import { FollowListDialog } from "@/components/profile/FollowListDialog";
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
  /** Auth user id of the profile owner — used to resolve follower counts. */
  userId?: string;
  /** Profile row id — used for the follower/following list dialogs. */
  profileId?: string;
  followersCount?: number;
  followingCount?: number;
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
  userId,
  profileId,
  followersCount: propFollowers,
  followingCount: propFollowing,
  className
}: MobileIdentityCardProps) {
  const { translate } = useTranslation();
  const navigate = useNavigate();
  const { index: liveIndex } = useVitanaIndexCache();
  const vitanaIndex = vitanaIndexProp ?? liveIndex?.total ?? 0;
  const [followListType, setFollowListType] = useState<"followers" | "following" | null>(null);

  // Same count resolution as the old stats strip: explicit props win,
  // otherwise fall back to the live counts from useFollow.
  const resolvedUserId = resolveProfileUserId(userId, profileId);
  const { followersCount: hookFollowers, followingCount: hookFollowing } = useFollow(resolvedUserId);
  const followersCount = propFollowers ?? hookFollowers;
  const followingCount = propFollowing ?? hookFollowing;
  const statsUserId = profileId || userId || "";

  const initials = displayName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const tier = getVitanaIndexTier(vitanaIndex);
  const showStats = !!resolvedUserId || propFollowers !== undefined || propFollowing !== undefined;

  const openFollowList = (type: "followers" | "following") => {
    if (!statsUserId) return;
    setFollowListType(type);
  };

  return (
    <div className={cn("px-4 pt-safe-top pb-2", className)}>
      {/* Pastel Identity Card */}
      <div
        className="relative rounded-2xl border border-white/60 overflow-hidden"
        style={{
          // Android WebView (Appilix) drops this card's gradient `background`
          // because of the heavy blur/backdrop-blur/drop-shadow layers it
          // contains (avatar glow, score halo, glass buttons): a descendant
          // compositing layer makes the ancestor gradient paint transparent,
          // so the card washes out to the page underneath — while the
          // Social/Account cards (no such filters) render fine. Keep a SOLID
          // pastel `backgroundColor` as a fallback so the card still renders
          // on-brand even if the gradient layer fails to paint, and promote
          // the card onto its own stable compositing layer so the child
          // filters can't knock out its background.
          backgroundColor: "hsl(218, 65%, 92%)",
          backgroundImage: "linear-gradient(170deg, hsl(205, 85%, 89%) 0%, hsl(228, 72%, 92%) 40%, hsl(262, 55%, 93%) 72%, hsl(310, 55%, 94%) 100%)",
          boxShadow: "0 8px 28px rgba(99, 102, 241, 0.14)",
          isolation: "isolate",
          transform: "translateZ(0)"
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
            className="absolute top-3 left-3 h-8 px-3 rounded-full bg-gradient-to-b from-white/95 to-white/60 backdrop-blur-sm border border-white/80 hover:from-white hover:to-white/80 text-teal-800 hover:text-teal-900 z-10 text-xs font-medium gap-1.5 shadow-sm"
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
              className="absolute inset-0 rounded-full blur-xl opacity-40"
              style={{ background: `radial-gradient(circle, ${tier.color}, transparent 70%)` }}
            />
            <Avatar className="relative h-24 w-24 border-[3px] border-white/90 shadow-lg">
              <AvatarImage
                src={avatarUrl && avatarUrl.length > 0 ? avatarUrl : getAutoAvatarUrl(handle ?? displayName ?? "vitana")}
                alt={displayName}
                style={avatarPositionStyle(avatarOffsetX, avatarOffsetY)}
              />
              <AvatarFallback className="text-xl font-semibold bg-white/60 text-slate-600">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Name */}
          <h1 className="text-2xl font-bold text-slate-800 text-center">
            {displayName}
          </h1>

          {/* Handle + Archetype */}
          <p className="text-sm text-slate-500 text-center mt-0.5">
            {handle && <span>@{handle}</span>}
            {handle && archetype && <span> · </span>}
            {archetype && <span>{archetype}</span>}
          </p>

          {/* Follower / Following inline stats */}
          {showStats && (
            <div className="flex items-center justify-center gap-3 mt-3">
              <button
                type="button"
                className="flex items-baseline gap-1.5 active:opacity-70"
                onClick={(e) => {
                  e.stopPropagation();
                  openFollowList("followers");
                }}
              >
                <span className="text-base font-bold text-slate-800">{followersCount ?? 0}</span>
                <span className="text-sm text-slate-500">{translate('profileStats.followers', 'Followers')}</span>
              </button>
              <span className="w-px h-4 bg-slate-400/40" />
              <button
                type="button"
                className="flex items-baseline gap-1.5 active:opacity-70"
                onClick={(e) => {
                  e.stopPropagation();
                  openFollowList("following");
                }}
              >
                <span className="text-base font-bold text-slate-800">{followingCount ?? 0}</span>
                <span className="text-sm text-slate-500">{translate('profileStats.following', 'Following')}</span>
              </button>
            </div>
          )}

          {/* Action buttons row for non-owner */}
          {!isOwner && (
            <div className="flex gap-2 justify-center mt-4">
              {onFollow && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-10 px-5 rounded-full backdrop-blur-sm text-sm font-semibold gap-2",
                    isFollowing
                      ? "bg-gradient-to-b from-white/95 to-white/60 border border-white/80 text-teal-900 hover:from-white hover:to-white/80 shadow-sm"
                      : "bg-gradient-to-br from-teal-50 via-emerald-100 to-emerald-300 border border-emerald-200/70 text-teal-900 hover:from-teal-100 hover:to-emerald-400 shadow-[0_4px_14px_rgba(16,185,129,0.25)]"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFollow();
                  }}
                  disabled={followLoading}
                >
                  {isFollowing ? (
                    <UserCheck className="h-4 w-4" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  {isFollowing
                    ? translate('profile.identity.followingState', 'Following')
                    : translate('profile.identity.follow', 'Follow')}
                </Button>
              )}
              {onMessage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 px-5 rounded-full bg-gradient-to-b from-white/95 to-white/60 backdrop-blur-sm border border-white/80 hover:from-white hover:to-white/80 text-teal-800 hover:text-teal-900 text-sm font-semibold gap-2 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMessage();
                  }}
                >
                  <MessageSquare className="h-4 w-4" />
                  {t('screens.profile.message')}
                </Button>
              )}
              {onShare && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={translate('common.share', 'Share')}
                  className="h-10 w-10 rounded-full bg-gradient-to-b from-white/95 to-white/60 backdrop-blur-sm border border-white/80 hover:from-white hover:to-white/80 text-teal-800 hover:text-teal-900 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare();
                  }}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* Vitana Index Section — frosted inner card */}
          <div className="flex flex-col items-center w-full mt-6 rounded-3xl bg-gradient-to-b from-white/80 via-white/55 to-white/40 border border-white/70 backdrop-blur-sm px-4 pt-5 pb-4 shadow-[0_2px_16px_rgba(255,255,255,0.45)_inset]">
            {/* Label */}
            <span className="text-[10px] font-semibold tracking-[0.2em] text-teal-700/80 uppercase mb-3">
              {translate('profile.identity.vitanaIndex')}
            </span>

            {/* Score with ambient glow */}
            <div className="relative flex items-center justify-center mb-2">
              {/* Ambient halo */}
              <div
                className="absolute w-28 h-28 rounded-full blur-2xl opacity-25"
                style={{ background: `radial-gradient(circle, ${tier.color}, transparent 70%)` }}
              />

              {/* Score number */}
              <span
                className="relative text-6xl font-extrabold"
                style={{
                  background: "linear-gradient(160deg, hsl(150, 75%, 55%) 0%, hsl(163, 70%, 42%) 45%, hsl(175, 75%, 28%) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 2px 10px rgba(16, 185, 129, 0.25))"
                }}
              >
                {vitanaIndex}
              </span>
            </div>

            {/* Tier badge + trend chip */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-800 shadow-sm"
                style={{
                  backgroundColor: tier.color,
                  backgroundImage: `linear-gradient(135deg, ${tier.color}66 0%, ${tier.color} 55%, ${tier.color}cc 100%), linear-gradient(135deg, #ffffff, #ffffff)`,
                }}
              >{t('screens.profile.labelTopVitanapercentile', { label: t(tier.labelKey), vitanaPercentile })}
              </div>
              <div className="h-7 w-7 rounded-full bg-gradient-to-b from-white to-white/70 border border-white/90 flex items-center justify-center shadow-sm">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              </div>
            </div>

            {/* Explanation */}
            <p className="text-[11px] text-slate-500 text-center px-4">
              {translate('profile.identity.basedOnActivity')}
            </p>

            {/* Understand index link */}
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800 active:opacity-70"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/health/vitana-index');
              }}
            >
              {translate('profile.identity.understandIndex', 'Understand index')}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* View Full ID CTA */}
          {onViewFullId && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-slate-500 hover:text-slate-700 hover:bg-black/5 text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onViewFullId();
              }}
            >
              {translate('profile.identity.viewLongevityId')}
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}

          {/* Brand footer */}
          <span className="mt-5 text-[10px] font-medium tracking-[0.3em] text-slate-400 uppercase">
            {translate('profile.identity.brandFooter', 'MAXINA × VITANA')}
          </span>
        </div>
      </div>

      {/* Follower / Following list dialogs */}
      {statsUserId && (
        <FollowListDialog
          open={followListType !== null}
          onOpenChange={(open) => { if (!open) setFollowListType(null); }}
          userId={statsUserId}
          type={followListType || "followers"}
        />
      )}
    </div>
  );
}
