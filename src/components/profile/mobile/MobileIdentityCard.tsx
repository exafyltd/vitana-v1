import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronRight, Share2, TrendingUp, UserPlus, UserCheck, MessageSquare, QrCode, Pencil } from "lucide-react";
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
import { displayHandle } from '@/lib/handle-display';

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
  /** Opens the QR share screen directly in "Get MAXINA" (app-invite) mode —
   * a one-tap shortcut so a member can hand their phone to someone and let
   * them scan straight to the app store, without going through Share. */
  onGetMaxina?: () => void;
  onFollow?: () => void;
  onMessage?: () => void;
  /** Opens the QR share screen in "profile" mode — lets a visitor pull up
   * this profile's own scannable QR (distinct from `onGetMaxina`, which is
   * the owner-only app-invite shortcut). Rendered in the Follow/Message
   * action row for non-owner views. */
  onShowQr?: () => void;
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
  onGetMaxina,
  onFollow,
  onMessage,
  onShowQr,
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

  // VTID-03978: never render the /u/:identifier routing fallback (an auth
  // UUID) as if it were the member's handle.
  const shownHandle = displayHandle(handle);

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
            className="absolute top-3 left-3 h-8 px-3 rounded-full bg-gradient-to-b from-white/95 to-white/75 backdrop-blur-sm border border-white/80 hover:from-white hover:to-white/80 text-teal-800 hover:text-teal-900 z-10 text-xs font-medium gap-1.5 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
          >
            <Share2 className="h-3.5 w-3.5" />
            {translate('common.share', 'Share')}
          </Button>
        )}

        {/* Get MAXINA — top right (owner view only), mirrors the Share
            button. One tap straight to the app-invite QR, no Share sheet
            or in-screen mode toggle in between. */}
        {isOwner && onGetMaxina && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={translate('common.getMaxina', 'Get MAXINA')}
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-gradient-to-b from-white/95 to-white/75 backdrop-blur-sm border border-white/80 hover:from-white hover:to-white/80 text-teal-800 hover:text-teal-900 z-10 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              onGetMaxina();
            }}
          >
            <QrCode className="h-3.5 w-3.5" />
          </Button>
        )}

        <div className="p-4 pt-11 flex flex-col gap-3">
          {/* Header row: bigger avatar on the left, name/handle/stats on the right */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div
                className="absolute inset-0 rounded-full blur-lg opacity-40"
                style={{ background: `radial-gradient(circle, ${tier.color}, transparent 70%)` }}
              />
              <Avatar className="relative h-28 w-28 border-[3px] border-white/90 shadow-lg">
                <AvatarImage
                  src={avatarUrl && avatarUrl.length > 0 ? avatarUrl : getAutoAvatarUrl(handle ?? displayName ?? "vitana")}
                  alt={displayName}
                  style={avatarPositionStyle(avatarOffsetX, avatarOffsetY)}
                />
                <AvatarFallback className="text-2xl font-semibold bg-white/60 text-slate-600">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {isOwner && editMode && onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  aria-label={translate('profile.identity.editPhoto', 'Edit profile photo')}
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-md flex items-center justify-center transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-slate-900 truncate">
                {displayName}
              </h1>
              <p className="text-sm text-slate-600 truncate mt-0.5">
                {shownHandle && <span>@{shownHandle}</span>}
                {shownHandle && archetype && <span> · </span>}
                {archetype && <span>{archetype}</span>}
              </p>

              {/* Follower / Following inline stats */}
              {showStats && (
                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    className="flex items-baseline gap-1.5 active:opacity-70"
                    onClick={(e) => {
                      e.stopPropagation();
                      openFollowList("followers");
                    }}
                  >
                    <span className="text-sm font-bold text-slate-900">{followersCount ?? 0}</span>
                    <span className="text-xs text-slate-600">{translate('profileStats.followers', 'Followers')}</span>
                  </button>
                  <span className="w-px h-3.5 bg-slate-400/40" />
                  <button
                    type="button"
                    className="flex items-baseline gap-1.5 active:opacity-70"
                    onClick={(e) => {
                      e.stopPropagation();
                      openFollowList("following");
                    }}
                  >
                    <span className="text-sm font-bold text-slate-900">{followingCount ?? 0}</span>
                    <span className="text-xs text-slate-600">{translate('profileStats.following', 'Following')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons row for non-owner */}
          {!isOwner && (
            <div className="flex gap-2 justify-center">
              {onFollow && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-9 px-5 rounded-full backdrop-blur-sm text-sm font-semibold gap-2",
                    isFollowing
                      ? "bg-gradient-to-b from-white/95 to-white/75 border border-white/80 text-teal-900 hover:from-white hover:to-white/80 shadow-sm"
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
                  className="h-9 px-5 rounded-full bg-gradient-to-b from-white/95 to-white/75 backdrop-blur-sm border border-white/80 hover:from-white hover:to-white/80 text-teal-800 hover:text-teal-900 text-sm font-semibold gap-2 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMessage();
                  }}
                >
                  <MessageSquare className="h-4 w-4" />
                  {t('screens.profile.message')}
                </Button>
              )}
              {onShowQr && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={translate('common.showQrCode', 'Show QR code')}
                  className="h-9 w-9 rounded-full bg-gradient-to-b from-white/95 to-white/75 backdrop-blur-sm border border-white/80 hover:from-white hover:to-white/80 text-teal-800 hover:text-teal-900 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowQr();
                  }}
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* Vitana Index — turquoise circle, the same treatment as the
              shared Index drawer (VitanaIndexSheet) so the score reads
              identically everywhere it appears in the app. */}
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-b from-white/90 via-white/80 to-white/65 border border-white/80 backdrop-blur-sm px-3.5 py-3 shadow-[0_2px_16px_rgba(255,255,255,0.45)_inset]">
            <div
              className="relative shrink-0 h-20 w-20 rounded-full flex items-center justify-center shadow-md"
              style={{ background: "linear-gradient(160deg, hsl(var(--sys-vitana-accent) / 1) 0%, hsl(199, 42%, 34%) 100%)" }}
              role="img"
              aria-label={`Vitana Index ${vitanaIndex}`}
            >
              <div className="text-center">
                <div className="text-xl font-extrabold text-white leading-none">{vitanaIndex}</div>
                <div className="text-[9px] font-medium text-white/85 leading-none mt-1">
                  {t('screens.health.text999')}
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold tracking-[0.18em] text-teal-700 uppercase block">
                {translate('profile.identity.vitanaIndex')}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                <div
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-900 shadow-sm"
                  style={{
                    backgroundColor: tier.color,
                    backgroundImage: `linear-gradient(135deg, ${tier.color}66 0%, ${tier.color} 55%, ${tier.color}cc 100%)`,
                  }}
                >{t(tier.labelKey)}
                </div>
                <div className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-900 bg-white/80 border border-white/90 shadow-sm">
                  {translate('health.topPercentile').replace('{percent}', vitanaPercentile.toString())}
                </div>
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              </div>
              <button
                type="button"
                className="mt-1.5 inline-flex items-center gap-0.5 text-xs font-semibold text-teal-800 active:opacity-70"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/health/vitana-index');
                }}
              >
                {translate('profile.identity.understandIndex', 'Understand index')}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* View Full ID CTA */}
          {onViewFullId && (
            <Button
              variant="ghost"
              size="sm"
              className="self-center text-slate-600 hover:text-slate-800 hover:bg-black/5 text-xs gap-1 h-8"
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
