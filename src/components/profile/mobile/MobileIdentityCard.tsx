import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
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
  Trophy,
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
import { useIndexStanding } from "@/hooks/useIndexStanding";
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
import { cardScale, headerScale, lerpPx } from "@/lib/profile-fold-scale";

/** Upper bound of the Vitana Index scale (see lib/vitanaIndex tiers). */
const VITANA_INDEX_MAX = 999;
/** Space kept between the Index card and the bottom navigation. */
const FOLD_GAP_PX = 8;

/*
 * VTID-04526 — sizes grow with the space they have. `--hx` (0..1) follows the
 * viewport height and drives the header; `--ix` (0..1) follows the Index
 * card's measured height and drives everything inside it. At 0 the sizes are
 * the compact ones that fit an iPhone SE; at 1 they fill a tall phone, so the
 * first screen reads as one proportionate composition instead of small
 * content floating in white space.
 */
const ACTION_BUTTON_STYLE: CSSProperties = {
  height: lerpPx(44, 52, "--hx"),
  fontSize: lerpPx(14, 17, "--hx"),
};
const SCORE_BLOCK_STYLE: CSSProperties = {
  marginTop: lerpPx(2, 10, "--ix"),
};
const PILL_STYLE: CSSProperties = {
  fontSize: lerpPx(14, 17, "--ix"),
  paddingTop: lerpPx(4, 7, "--ix"),
  paddingBottom: lerpPx(4, 7, "--ix"),
};

/**
 * VTID-04489 — stretch the Vitana Index card so it ends exactly at the fold:
 * the card's bottom (the Posts · Media · Groups row) sits just above the
 * bottom navigation and nothing else is visible until the member scrolls.
 * Measured, not hardcoded, so it holds for every phone height and for the
 * Appilix wrapper. When the content is taller than the space (very short
 * phones) the card simply keeps its natural height.
 */
function useFillToFold(ref: RefObject<HTMLElement>): { minHeight: number | undefined; viewportHeight: number } {
  const [minHeight, setMinHeight] = useState<number | undefined>(undefined);
  const [viewportHeight, setViewportHeight] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerHeight : 0,
  );
  useLayoutEffect(() => {
    const measure = () => {
      setViewportHeight(window.innerHeight);
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
  return { minHeight, viewportHeight };
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
  // VTID-04498 — real community rank; null unless the server vouches for a badge.
  const { data: standing } = useIndexStanding(resolvedUserId);
  // Resolved every render (cheap) so a language switch re-labels it.
  const topBoostDriver = boost && !boost.hidden ? boost.drivers[0] : undefined;
  const boostSentence = topBoostDriver
    ? describeBoostDriver(topBoostDriver, boost!.windowDays, (k) => t(k), (n, d) => fmtNumber(n, { maximumFractionDigits: d ?? 0 }))
    : null;
  const indexCardRef = useRef<HTMLElement>(null);
  const { minHeight: indexCardMinHeight, viewportHeight } = useFillToFold(indexCardRef);
  const scaleVars = {
    "--hx": headerScale(viewportHeight),
    "--ix": cardScale(indexCardMinHeight),
  } as CSSProperties;
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
    <div className={cn("px-4 pb-2", className)} style={scaleVars}>
      {/* ── Profile header ─────────────────────────────────────────── */}
      <section
        className="relative rounded-3xl border border-white/70"
        style={{
          padding: lerpPx(16, 20, "--hx"),
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
            <Avatar
              className="border-[3px] border-white shadow-md"
              style={{ width: lerpPx(84, 108, "--hx"), height: lerpPx(84, 108, "--hx") }}
            >
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
            <h1
              className="line-clamp-2 break-words font-bold leading-tight text-slate-900"
              style={{ fontSize: lerpPx(21, 28, "--hx") }}
            >
              {displayName}
            </h1>
            {(shownHandle || archetype) && (
              <p
                className="mt-0.5 line-clamp-2 break-words leading-snug text-slate-600"
                style={{ fontSize: lerpPx(13, 16, "--hx") }}
              >
                {shownHandle && <span dir="ltr">@{shownHandle}</span>}
                {shownHandle && archetype && <span aria-hidden> · </span>}
                {archetype && <span>{archetype}</span>}
              </p>
            )}
            {showFollowStats && (
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1" style={{ marginTop: lerpPx(6, 10, "--hx") }}>
                <button
                  type="button"
                  className="flex items-baseline gap-1 rounded active:opacity-70"
                  onClick={() => openFollowList("followers")}
                >
                  <span className="font-bold text-slate-900" style={{ fontSize: lerpPx(15, 18, "--hx") }}>{followersCount}</span>
                  <span className="text-slate-600" style={{ fontSize: lerpPx(13, 16, "--hx") }}>{translate("profileStats.followers", "Followers")}</span>
                </button>
                <span className="h-3.5 w-px bg-slate-400/40 max-[359px]:hidden" aria-hidden />
                <button
                  type="button"
                  className="flex items-baseline gap-1 rounded active:opacity-70"
                  onClick={() => openFollowList("following")}
                >
                  <span className="font-bold text-slate-900" style={{ fontSize: lerpPx(15, 18, "--hx") }}>{followingCount}</span>
                  <span className="text-slate-600" style={{ fontSize: lerpPx(13, 16, "--hx") }}>{translate("profileStats.following", "Following")}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action row: visitor = Follow · Message · QR, owner = Edit · QR */}
        {(isOwner ? onEditIdentity || qrAction : onFollow || onMessage || qrAction) && (
          <div className="flex gap-2" style={{ marginTop: lerpPx(12, 16, "--hx") }}>
            {!isOwner && onFollow && (
              <button
                type="button"
                onClick={onFollow}
                style={ACTION_BUTTON_STYLE}
                disabled={followLoading}
                className={cn(
                  "flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 font-semibold transition-colors disabled:opacity-60 min-[375px]:gap-2 min-[375px]:px-3",
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
                style={ACTION_BUTTON_STYLE}
                className={cn(
                  "flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-white/85 px-2 font-semibold text-slate-900 shadow-sm hover:bg-white min-[375px]:gap-2 min-[375px]:px-3",
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
                style={ACTION_BUTTON_STYLE}
                className={cn(
                  "flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-white/85 px-3 font-semibold text-slate-900 shadow-sm hover:bg-white",
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
                style={{ height: ACTION_BUTTON_STYLE.height }}
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
        className="relative mt-3 flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white px-4 pb-1 shadow-[0_6px_24px_rgba(15,23,42,0.06)]"
        style={{
          isolation: "isolate",
          transform: "translateZ(0)",
          minHeight: indexCardMinHeight,
          paddingTop: lerpPx(12, 22, "--ix"),
          // A soft mint wash behind the score so the card does not read as a
          // blank white sheet on tall phones.
          backgroundImage:
            "radial-gradient(ellipse 85% 55% at 50% 42%, hsla(165, 75%, 90%, 0.75) 0%, hsla(190, 80%, 94%, 0.45) 45%, transparent 75%)",
        }}
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
            space the card gets from reaching the fold, and scales with it
            (--ix) so a short phone gets the compact sizes and a tall one
            fills the card. */}
        <span
          className="self-center font-semibold uppercase tracking-[0.28em] text-teal-800"
          style={{ fontSize: lerpPx(12, 15, "--ix") }}
        >
          {translate("profile.identity.vitanaIndex")}
        </span>
        <div className="flex flex-1 flex-col items-center justify-center">

          {/* Score — gateway to the existing detailed Index drawer (owner) */}
          {(() => {
            const scoreBody = (
              <>
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-2xl"
                  style={{ width: lerpPx(150, 250, "--ix"), height: lerpPx(150, 250, "--ix"), background: "radial-gradient(circle, hsl(165, 80%, 70%), hsl(200, 80%, 80%) 55%, transparent 72%)" }}
                />
                {scoreLoading ? (
                  <Skeleton className="my-2 h-14 w-32 rounded-xl" />
                ) : (
                  <span
                    className="font-extrabold leading-none tabular-nums"
                    style={{
                      fontSize: lerpPx(48, 104, "--ix"),
                      background: "linear-gradient(170deg, hsl(152, 70%, 42%) 0%, hsl(168, 72%, 30%) 55%, hsl(180, 75%, 22%) 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                    data-testid="profile-index-score"
                  >
                    {score ?? "—"}
                  </span>
                )}
                <span className="text-slate-500" style={{ fontSize: lerpPx(14, 18, "--ix"), marginTop: lerpPx(0, 6, "--ix") }}>
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
                style={SCORE_BLOCK_STYLE}
                className={cn("relative flex flex-col items-center rounded-2xl px-6 active:opacity-80", ICON_BUTTON_FOCUS)}
              >
                {scoreBody}
              </button>
            ) : (
              <div className="relative flex flex-col items-center px-6" style={SCORE_BLOCK_STYLE}>{scoreBody}</div>
            );
          })()}

          {/* Status pills — tier always, real rank when the server vouches for it, momentum only when history shows it */}
          {tier && (
            <div className="flex flex-wrap items-center justify-center gap-2" style={{ marginTop: lerpPx(6, 16, "--ix") }}>
              <span
                className="rounded-full px-4 font-semibold text-slate-900"
                style={{ ...PILL_STYLE, backgroundColor: `${tier.color}55` }}
              >
                {t(tier.labelKey)}
              </span>
              {standing && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 font-semibold text-amber-800 ring-1 ring-amber-200"
                  style={PILL_STYLE}
                  aria-label={t("profile.indexHero.topPercentAria", { percent: standing.topPercent, count: standing.cohortSize })}
                  data-testid="profile-index-top-percent"
                >
                  <Trophy className="h-4 w-4" aria-hidden />
                  {t("profile.indexHero.topPercent", { percent: standing.topPercent })}
                </span>
              )}
              {highlights.momentum && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 font-semibold text-emerald-700" style={PILL_STYLE}>
                  <TrendingUp className="h-4 w-4" aria-hidden />
                  {highlights.momentum === "rising_fast"
                    ? t("profile.indexHero.risingFast")
                    : t("profile.indexHero.improving")}
                </span>
              )}
            </div>
          )}

          {/* Personalised line (owner) / public-safe line (visitor) */}
          <p
            className="line-clamp-3 px-2 text-center leading-snug text-slate-700"
            style={{ fontSize: lerpPx(14, 17, "--ix"), marginTop: lerpPx(6, 16, "--ix") }}
            data-testid="profile-index-line"
          >
            {cardLine}
          </p>

          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold text-teal-800 hover:text-teal-900 active:opacity-70",
              ICON_BUTTON_FOCUS,
            )}
            style={{ fontSize: lerpPx(14, 17, "--ix"), marginTop: lerpPx(2, 8, "--ix") }}
            onClick={() => navigate("/health/vitana-index")}
          >
            {translate("profile.identity.understandIndex", "Understand index")}
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </button>
        </div>

        {/* Posts · Media · Groups — the card's (and the first screen's) last row */}
        <div className="mt-auto border-t border-slate-100 pt-0.5" data-testid="profile-index-stats">
          <MobileProfileStats
            userId={userId}
            profileId={profileId}
            variant="divided"
            valueStyle={{ fontSize: lerpPx(18, 26, "--ix") }}
            labelStyle={{ fontSize: lerpPx(12, 15, "--ix") }}
            rowStyle={{ paddingTop: lerpPx(10, 14, "--ix"), paddingBottom: lerpPx(10, 14, "--ix") }}
          />
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
