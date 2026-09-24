import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronRight,
  Info,
  MessageSquare,
  Pencil,
  QrCode,
  Share2,
  TrendingUp,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getVitanaIndexTier } from "@/lib/vitanaIndex";
import { useTranslation } from "@/hooks/useTranslation";
import { useVitanaIndexCache } from "@/components/health/VitanaIndexProvider";
import { VITANA_INDEX_OPEN_EVENT } from "@/components/health/VitanaIndexSheet";
import { useVitanaStreaks } from "@/hooks/useVitanaStreaks";
import { pillarLabel } from "@/hooks/useVitanaIndex";
import { deriveIndexHighlights } from "@/lib/vitana-index-highlights";
import { useIndexBoost, describeBoostDriver } from "@/hooks/useIndexBoost";
import { fmtNumber } from "@/lib/locale-format";
import { avatarPositionStyle } from "@/lib/avatarPosition";
import { getAutoAvatarUrl } from "@/lib/autoAvatar";
import { useFollow } from "@/hooks/useFollow";
import { resolveProfileUserId } from "@/lib/resolveProfileUserId";
import { FollowListDialog } from "@/components/profile/FollowListDialog";
import { MobileProfileStats } from "./MobileProfileStats";
import { VitanaAchievementDrawer } from "./VitanaAchievementDrawer";
import { t } from "@/lib/i18n-toast";
import { displayHandle } from "@/lib/handle-display";

/** Upper bound of the Vitana Index scale (see lib/vitanaIndex tiers). */
const VITANA_INDEX_MAX = 999;
/** Space kept between the Index card and the bottom navigation. */
const FOLD_GAP_PX = 8;

/**
 * VTID-04489 — stretch the Vitana Index card so it ends exactly at the fold:
 * the card's bottom (the Posts · Media · Groups row) sits just above the
 * bottom navigation and nothing else is visible until the member scrolls.
 * Measured, not hardcoded, so it holds for every phone height and for the
 * Appilix wrapper. When the content is taller than the space (very short
 * phones) the card simply keeps its natural height.
 */
function useFillToFold(ref: RefObject<HTMLElement>): number | undefined {
  const [minHeight, setMinHeight] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      // The fold is the highest fixed bottom element: the bottom navigation or
      // the ORB button that rises above it (it would otherwise cover the
      // Posts · Media · Groups row).
      let foldTop = window.innerHeight;
      document.querySelectorAll<HTMLElement>(".mobile-bottom-nav, .vtorb-fab").forEach((node) => {
        const r = node.getBoundingClientRect();
        if (r.height > 0 && r.top > window.innerHeight / 2) foldTop = Math.min(foldTop, r.top);
      });
      const cardTopInDocument = el.getBoundingClientRect().top + window.scrollY;
      const target = Math.floor(foldTop - cardTopInDocument - FOLD_GAP_PX);
      setMinHeight((prev) => {
        const next = target > 0 ? target : undefined;
        return prev === next ? prev : next;
      });
    };
    measure();
    const late = window.setTimeout(measure, 400); // after the bottom nav and avatar settle
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(document.body);
    return () => {
      window.clearTimeout(late);
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, [ref]);
  return minHeight;
}

interface MobileIdentityCardProps {
  avatarUrl?: string | null;
  avatarOffsetX?: number;
  avatarOffsetY?: number;
  displayName: string;
  handle?: string;
  archetype?: string;
  /** The profile's Index. For another member this is the public RPC value
   *  (undefined when none / not public) — never the viewer's own Index. */
  vitanaIndex?: number;
  isOwner?: boolean;
  /** Owner only: the existing identity editor (name, handle, photo). */
  onEditIdentity?: () => void;
  onShare?: () => void;
  /** Owner QR: opens the QR screen in "Get MAXINA" (app-invite) mode. */
  onGetMaxina?: () => void;
  /** Visitor QR: opens the QR screen for this profile. */
  onShowQr?: () => void;
  onFollow?: () => void;
  onMessage?: () => void;
  isFollowing?: boolean;
  followLoading?: boolean;
  /** Auth user id of the profile owner — used to resolve follower counts. */
  userId?: string;
  /** Profile row id — used for the follower/following list dialogs. */
  profileId?: string;
  followersCount?: number;
  followingCount?: number;
  className?: string;
}

const ICON_BUTTON_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2";

export function MobileIdentityCard({
  avatarUrl,
  avatarOffsetX,
  avatarOffsetY,
  displayName,
  handle,
  archetype,
  vitanaIndex: vitanaIndexProp,
  isOwner = true,
  onEditIdentity,
  onShare,
  onGetMaxina,
  onShowQr,
  onFollow,
  onMessage,
  isFollowing = false,
  followLoading = false,
  userId,
  profileId,
  followersCount: propFollowers,
  followingCount: propFollowing,
  className,
}: MobileIdentityCardProps) {
  const { translate } = useTranslation();
  const navigate = useNavigate();
  const { index: liveIndex, isLoading: liveLoading } = useVitanaIndexCache();
  const { current: streakDays } = useVitanaStreaks();
  const [followListType, setFollowListType] = useState<"followers" | "following" | null>(null);
  const [achievementOpen, setAchievementOpen] = useState(false);

  // VTID-04470: the live Index cache is the SIGNED-IN member's own Index.
  // Only the owner may fall back to it — on someone else's profile a missing
  // public Index must read as "none", not as the viewer's score.
  const rawScore = isOwner ? (vitanaIndexProp || liveIndex?.total) : vitanaIndexProp;
  const score = typeof rawScore === "number" && Number.isFinite(rawScore) && rawScore > 0 ? rawScore : null;
  const scoreLoading = isOwner && score === null && liveLoading;

  // Personalised praise is owner-only: another member's pillar data is private.
  const highlights = useMemo(
    () => deriveIndexHighlights(isOwner && liveIndex ? liveIndex : null),
    [isOwner, liveIndex],
  );

  const resolvedUserId = resolveProfileUserId(userId, profileId);
  // VTID-04489: what drove this member's Index, in activity terms. Public
  // with numbers (owner decision) — the RPC returns `hidden` if they opted out.
  const { data: boost } = useIndexBoost(resolvedUserId);
  // Resolved every render (cheap) so a language switch re-labels it.
  const topBoostDriver = boost && !boost.hidden ? boost.drivers[0] : undefined;
  const boostSentence = topBoostDriver
    ? describeBoostDriver(topBoostDriver, boost!.windowDays, (k) => t(k), (n, d) => fmtNumber(n, { maximumFractionDigits: d ?? 0 }))
    : null;
  const indexCardRef = useRef<HTMLElement>(null);
  const indexCardMinHeight = useFillToFold(indexCardRef);
  const { followersCount: hookFollowers, followingCount: hookFollowing } = useFollow(resolvedUserId);
  const followersCount = propFollowers ?? hookFollowers ?? 0;
  const followingCount = propFollowing ?? hookFollowing ?? 0;
  const statsUserId = profileId || userId || "";
  const showFollowStats = !!resolvedUserId || propFollowers !== undefined || propFollowing !== undefined;

  const initials =
    displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  const tier = score !== null ? getVitanaIndexTier(score) : null;
  // VTID-03978: never render the /u/:identifier routing fallback (an auth
  // UUID) as if it were the member's handle.
  const shownHandle = displayHandle(handle);
  const qrAction = isOwner ? onGetMaxina : onShowQr;

  const openDetailedIndex = () => window.dispatchEvent(new CustomEvent(VITANA_INDEX_OPEN_EVENT));
  const openFollowList = (type: "followers" | "following") => {
    if (statsUserId) setFollowListType(type);
  };

  // The detailed drawer only knows the signed-in member's own Index, so it is
  // the score's destination on the owner's profile only.
  const canOpenDetailed = isOwner && score !== null;

  const cardLine = (() => {
    if (score === null) {
      return <span>{isOwner ? t("profile.indexHero.noIndexOwner") : t("profile.indexHero.noIndexPublic")}</span>;
    }
    if (boost && boostSentence) {
      return (
        <>
          <span className="font-semibold text-teal-700">
            {boost.kind === "boost" ? t("profile.indexHero.boostPrefix") : t("profile.indexBoost.mostActivePrefix")}
          </span>{" "}
          {t(boostSentence.key, boostSentence.params)}
        </>
      );
    }
    if (!isOwner) return <span>{t("profile.indexHero.publicLine")}</span>;
    if (highlights.kind === "boost") {
      const [a, b] = highlights.lifts;
      const names = b
        ? t("profile.indexHero.pillarListTwo", { a: pillarLabel(a.pillar), b: pillarLabel(b.pillar) })
        : pillarLabel(a.pillar);
      return (
        <>
          <span className="font-semibold text-teal-700">{t("profile.indexHero.boostPrefix")}</span> {names}
        </>
      );
    }
    if (highlights.kind === "strongest" && highlights.strongest) {
      return (
        <>
          <span className="font-semibold text-teal-700">{t("profile.indexHero.strongestPrefix")}</span>{" "}
          {pillarLabel(highlights.strongest)}
        </>
      );
    }
    return <span>{t("profile.indexHero.fallback")}</span>;
  })();

  return (
    <div className={cn("px-4 pb-2", className)}>
      {/* ── Profile header ─────────────────────────────────────────── */}
      <section
        className="relative rounded-3xl border border-white/70 p-4"
        style={{
          // Solid fallback + own compositing layer: Android WebView (Appilix)
          // can drop a gradient background under blurred descendants.
          backgroundColor: "hsl(208, 72%, 93%)",
          backgroundImage: "linear-gradient(165deg, hsl(200, 80%, 91%) 0%, hsl(212, 72%, 94%) 55%, hsl(225, 65%, 95%) 100%)",
          boxShadow: "0 6px 22px rgba(56, 132, 214, 0.12)",
          isolation: "isolate",
          transform: "translateZ(0)",
        }}
      >
        {onShare && (
          <button
            type="button"
            aria-label={t("profile.indexHero.shareProfileAria")}
            onClick={onShare}
            data-testid="profile-share-icon"
            className={cn(
              "absolute end-2 top-2 flex h-10 w-10 items-center justify-center rounded-full text-slate-800 active:opacity-60",
              ICON_BUTTON_FOCUS,
            )}
          >
            <Share2 className="h-[22px] w-[22px]" strokeWidth={2} />
          </button>
        )}

        <div className="flex items-center gap-3.5 min-[375px]:gap-4">
          {/* Avatar (+ owner-only edit pencil) */}
          <div className="relative shrink-0">
            <Avatar className="h-20 w-20 border-[3px] border-white shadow-md min-[375px]:h-[88px] min-[375px]:w-[88px]">
              <AvatarImage
                src={avatarUrl && avatarUrl.length > 0 ? avatarUrl : getAutoAvatarUrl(handle ?? displayName ?? "vitana")}
                alt={displayName}
                style={avatarPositionStyle(avatarOffsetX, avatarOffsetY)}
              />
              <AvatarFallback className="bg-white/70 text-xl font-semibold text-slate-600">{initials}</AvatarFallback>
            </Avatar>
            {isOwner && onEditIdentity && (
              <button
                type="button"
                aria-label={t("profile.indexHero.editPhotoAria")}
                onClick={onEditIdentity}
                data-testid="profile-edit-photo"
                className={cn(
                  "absolute -bottom-0.5 -end-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-700 shadow-md active:opacity-70",
                  ICON_BUTTON_FOCUS,
                )}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Name, handle, follow counts */}
          <div className={cn("min-w-0 flex-1", onShare && "pe-8")}>
            <h1 className="line-clamp-2 break-words text-[21px] font-bold leading-tight text-slate-900 min-[375px]:text-[22px]">
              {displayName}
            </h1>
            {(shownHandle || archetype) && (
              <p className="mt-0.5 line-clamp-2 break-words text-[13px] leading-snug text-slate-600">
                {shownHandle && <span dir="ltr">@{shownHandle}</span>}
                {shownHandle && archetype && <span aria-hidden> · </span>}
                {archetype && <span>{archetype}</span>}
              </p>
            )}
            {showFollowStats && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <button
                  type="button"
                  className="flex items-baseline gap-1 rounded active:opacity-70"
                  onClick={() => openFollowList("followers")}
                >
                  <span className="text-[15px] font-bold text-slate-900">{followersCount}</span>
                  <span className="text-[13px] text-slate-600">{translate("profileStats.followers", "Followers")}</span>
                </button>
                <span className="h-3.5 w-px bg-slate-400/40 max-[359px]:hidden" aria-hidden />
                <button
                  type="button"
                  className="flex items-baseline gap-1 rounded active:opacity-70"
                  onClick={() => openFollowList("following")}
                >
                  <span className="text-[15px] font-bold text-slate-900">{followingCount}</span>
                  <span className="text-[13px] text-slate-600">{translate("profileStats.following", "Following")}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action row: visitor = Follow · Message · QR, owner = Edit · QR */}
        {(isOwner ? onEditIdentity || qrAction : onFollow || onMessage || qrAction) && (
          <div className="mt-3 flex gap-2">
            {!isOwner && onFollow && (
              <button
                type="button"
                onClick={onFollow}
                disabled={followLoading}
                className={cn(
                  "flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-semibold transition-colors disabled:opacity-60 min-[375px]:gap-2 min-[375px]:px-3 min-[375px]:text-sm",
                  isFollowing
                    ? "bg-sky-100 text-slate-900 hover:bg-sky-200"
                    : "bg-gradient-to-r from-teal-300 to-emerald-300 text-teal-950 shadow-[0_4px_12px_rgba(16,185,129,0.22)]",
                  ICON_BUTTON_FOCUS,
                )}
              >
                {isFollowing ? <UserCheck className="h-4 w-4 shrink-0 max-[359px]:hidden" /> : <UserPlus className="h-4 w-4 shrink-0 max-[359px]:hidden" />}
                <span className="truncate">
                  {isFollowing
                    ? translate("profile.identity.followingState", "Following")
                    : translate("profile.identity.follow", "Follow")}
                </span>
              </button>
            )}
            {!isOwner && onMessage && (
              <button
                type="button"
                onClick={onMessage}
                className={cn(
                  "flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-white/85 px-2 text-[13px] font-semibold text-slate-900 shadow-sm hover:bg-white min-[375px]:gap-2 min-[375px]:px-3 min-[375px]:text-sm",
                  ICON_BUTTON_FOCUS,
                )}
              >
                <MessageSquare className="h-4 w-4 shrink-0 max-[359px]:hidden" />
                <span className="truncate">{t("screens.profile.message")}</span>
              </button>
            )}
            {isOwner && onEditIdentity && (
              <button
                type="button"
                onClick={onEditIdentity}
                className={cn(
                  "flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-white/85 px-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-white",
                  ICON_BUTTON_FOCUS,
                )}
              >
                <Pencil className="h-4 w-4 shrink-0" />
                <span className="truncate">{t("profile.indexHero.editProfile")}</span>
              </button>
            )}
            {qrAction && (
              <button
                type="button"
                aria-label={isOwner ? translate("common.getMaxina", "Get MAXINA") : t("profile.indexHero.showQrAria")}
                onClick={qrAction}
                data-testid="profile-qr"
                className={cn(
                  "flex h-11 w-12 shrink-0 items-center justify-center rounded-full bg-white/85 text-slate-900 shadow-sm hover:bg-white min-[375px]:w-14",
                  ICON_BUTTON_FOCUS,
                )}
              >
                <QrCode className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── VITANA INDEX hero ──────────────────────────────────────── */}
      <section
        ref={indexCardRef}
        className="relative mt-3 flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white px-4 pb-1 pt-4 shadow-[0_6px_24px_rgba(15,23,42,0.06)]"
        style={{ isolation: "isolate", transform: "translateZ(0)", minHeight: indexCardMinHeight }}
        data-testid="profile-vitana-index-card"
      >
        <button
          type="button"
          aria-label={t("profile.indexHero.aboutIndexAria")}
          onClick={() => setAchievementOpen(true)}
          data-testid="profile-index-info"
          className={cn(
            "absolute end-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full text-sky-600 active:opacity-60",
            ICON_BUTTON_FOCUS,
          )}
        >
          <Info className="h-[22px] w-[22px]" />
        </button>

        {/* Label stays at the top; the score block is centred in whatever
            space the card gets from reaching the fold. */}
        <span className="self-center text-xs font-semibold uppercase tracking-[0.28em] text-teal-800">
          {translate("profile.identity.vitanaIndex")}
        </span>
        <div className="flex flex-1 flex-col items-center justify-center">

          {/* Score — gateway to the existing detailed Index drawer (owner) */}
          {(() => {
            const scoreBody = (
              <>
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-2xl"
                  style={{ background: "radial-gradient(circle, hsl(165, 80%, 70%), hsl(200, 80%, 80%) 55%, transparent 72%)" }}
                />
                {scoreLoading ? (
                  <Skeleton className="my-2 h-14 w-32 rounded-xl" />
                ) : (
                  <span
                    className="text-[64px] font-extrabold leading-none tabular-nums"
                    style={{
                      background: "linear-gradient(170deg, hsl(152, 70%, 42%) 0%, hsl(168, 72%, 30%) 55%, hsl(180, 75%, 22%) 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                    data-testid="profile-index-score"
                  >
                    {score ?? "—"}
                  </span>
                )}
                <span className="mt-1 text-sm text-slate-500">
                  {t("profile.indexHero.ofMax", { max: VITANA_INDEX_MAX })}
                </span>
              </>
            );
            return canOpenDetailed ? (
              <button
                type="button"
                onClick={openDetailedIndex}
                aria-label={t("profile.indexHero.openIndexAria")}
                data-testid="profile-index-open-detailed"
                className={cn("relative mt-2 flex flex-col items-center rounded-2xl px-6 pt-1 active:opacity-80", ICON_BUTTON_FOCUS)}
              >
                {scoreBody}
              </button>
            ) : (
              <div className="relative mt-2 flex flex-col items-center px-6 pt-1">{scoreBody}</div>
            );
          })()}

          {/* Status pills — tier always, momentum only when history shows it */}
          {tier && (
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
              <span
                className="rounded-full px-4 py-1 text-sm font-semibold text-slate-900"
                style={{ backgroundColor: `${tier.color}55` }}
              >
                {t(tier.labelKey)}
              </span>
              {highlights.momentum && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                  <TrendingUp className="h-4 w-4" aria-hidden />
                  {highlights.momentum === "rising_fast"
                    ? t("profile.indexHero.risingFast")
                    : t("profile.indexHero.improving")}
                </span>
              )}
            </div>
          )}

          {/* Personalised line (owner) / public-safe line (visitor) */}
          <p className="mt-2.5 line-clamp-3 px-2 text-center text-sm leading-snug text-slate-700" data-testid="profile-index-line">
            {cardLine}
          </p>

          <button
            type="button"
            className={cn(
              "mt-1.5 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-teal-800 hover:text-teal-900 active:opacity-70",
              ICON_BUTTON_FOCUS,
            )}
            onClick={() => navigate("/health/vitana-index")}
          >
            {translate("profile.identity.understandIndex", "Understand index")}
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </button>
        </div>

        {/* Posts · Media · Groups — the card's (and the first screen's) last row */}
        <div className="mt-auto border-t border-slate-100 pt-0.5" data-testid="profile-index-stats">
          <MobileProfileStats userId={userId} profileId={profileId} variant="divided" />
        </div>
      </section>

      <VitanaAchievementDrawer
        open={achievementOpen}
        onOpenChange={setAchievementOpen}
        mode={isOwner ? "owner" : "public"}
        highlights={highlights}
        boost={boost && !boost.hidden ? boost : null}
        streakDays={streakDays}
        onSeeFullBreakdown={
          canOpenDetailed
            ? () => {
                setAchievementOpen(false);
                // Let the drawer finish closing before the sheet takes focus.
                window.setTimeout(openDetailedIndex, 280);
              }
            : undefined
        }
        onShareProgress={
          isOwner && onShare && score !== null
            ? () => {
                setAchievementOpen(false);
                window.setTimeout(onShare, 280);
              }
            : undefined
        }
      />

      {statsUserId && (
        <FollowListDialog
          open={followListType !== null}
          onOpenChange={(open) => {
            if (!open) setFollowListType(null);
          }}
          userId={statsUserId}
          type={followListType || "followers"}
        />
      )}
    </div>
  );
}
