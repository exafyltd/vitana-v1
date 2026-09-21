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
          // The header (avatar/name) sits on the blue tint; everything from
          // the Vitana Index block down sits on plain white — one seamless
          // card, not a white card nested inside this one.
          backgroundColor: "hsl(218, 65%, 92%)",
          backgroundImage: "linear-gradient(180deg, hsl(205, 85%, 89%) 0%, hsl(210, 65%, 93%) 22%, hsl(210, 40%, 98%) 38%, hsl(0, 0%, 100%) 55%, hsl(0, 0%, 100%) 100%)",
          boxShadow: "0 8px 28px rgba(99, 102, 241, 0.14)",
          isolation: "isolate",
          transform: "translateZ(0)"
        }}
        onClick={onViewFullId}
        role={onViewFullId ? "button" : undefined}
        tabIndex={onViewFullId ? 0 : undefined}
      >
        {/* Share + Get MAXINA — top right, together, as bare icons (owner
            view only). Get MAXINA is one tap straight to the app-invite QR,
            no Share sheet or in-screen mode toggle in between. */}
        {isOwner && (onShare || onGetMaxina) && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-3">
            {onShare && (
              <button
                type="button"
                aria-label={translate('common.share', 'Share')}
                className="text-slate-700 hover:text-slate-900 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare();
                }}
              >
                <Share2 className="h-5 w-5" />
              </button>
            )}
            {onGetMaxina && (
              <button
                type="button"
                aria-label={translate('common.getMaxina', 'Get MAXINA')}
                className="text-slate-700 hover:text-slate-900 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onGetMaxina();
                }}
              >
                <QrCode className="h-5 w-5" />
              </button>
            )}
          </div>
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

          {/* Vitana Index — centered, with a soft turquoise glow behind a
              big bold score, the same treatment as the shared Index drawer
              (VitanaIndexSheet) so it reads identically everywhere it
              appears in the app. Sits directly on the card's own (by-here
              white) background — no separate nested card/border, so this
              reads as one continuous card, not a card inside a card. */}
          <div className="flex flex-col items-center w-full px-2 pt-1 pb-1">
            <span className="text-lg font-extrabold tracking-wide text-slate-900 uppercase">
              {translate('profile.identity.vitanaIndex')}
            </span>

            <div className="relative flex items-center justify-center my-1">
              <div
                className="absolute w-40 h-40 rounded-full blur-2xl opacity-70"
                style={{ background: "radial-gradient(circle, hsl(199, 75%, 68%) 0%, hsl(175, 65%, 62%) 45%, hsl(150, 60%, 65%) 70%, transparent 85%)" }}
              />
              <span
                className="relative text-5xl font-extrabold"
                style={{
                  background: "linear-gradient(160deg, hsl(160, 70%, 42%) 0%, hsl(190, 65%, 38%) 60%, hsl(199, 70%, 30%) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {vitanaIndex}
              </span>
            </div>

            <span className="text-sm font-bold text-slate-600 mb-2">
              {t('screens.health.text999')}
            </span>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              <div
                className="px-3 py-1 rounded-full text-xs font-semibold text-slate-900"
                style={{ backgroundColor: `${tier.color}40` }}
              >{t(tier.labelKey)}
              </div>
              <div
                className="px-3 py-1 rounded-full text-xs font-semibold text-slate-900"
                style={{ backgroundColor: "hsl(220, 45%, 95%)" }}
              >
                {translate('health.topPercentile').replace('{percent}', vitanaPercentile.toString())}
              </div>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            </div>

            <button
              type="button"
              className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-teal-800 active:opacity-70"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/health/vitana-index');
              }}
            >
              {translate('profile.identity.understandIndex', 'Understand index')}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
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
