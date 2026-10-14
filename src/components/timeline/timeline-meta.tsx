/**
 * VTID-05170 — Life Timeline P4: pillar visuals, catalog icons and the text
 * helpers that turn a gateway item ({ topic, category, params }) into what
 * the member reads. All text from src/i18n/<locale>/timeline.json; numbers
 * through locale-format. Pillar colours use the existing --pill-* tokens.
 */
import type { LucideIcon } from "lucide-react";
import {
  Activity, Apple, ArrowLeftRight, Award, BarChart3, Bell, BellRing, BookOpen, Bookmark, BookmarkPlus, Brain,
  Calendar, CalendarCheck, CalendarPlus, CalendarX, Check, CheckCircle2, Circle, ClipboardCheck, Clock, Coins,
  Compass, Dna, Download, Droplets, Dumbbell, Eraser, FlaskConical, Flame, Gauge, Gift, Headphones, Heart,
  HeartHandshake, Languages, ListChecks, ListPlus, MessageCircle, MessageSquare, MessagesSquare, Moon, Music,
  PartyPopper, PenSquare, Phone, Pill, PlayCircle, Radio, Route, Scale, Send, Settings, Share2, ShieldAlert,
  ShieldCheck, ShoppingBag, Smile, Sparkles, Target, ThumbsUp, TrendingDown, TrendingUp, Trophy, UserCog,
  UserMinus, UserPlus, Users, Wallet, Watch, X,
} from "lucide-react";
import { t } from "@/lib/i18n-toast";
import { fmtNumber } from "@/lib/locale-format";
import { pillarLabel } from "@/hooks/useVitanaIndex";
import type { PillarKey, TimelineMoment } from "@/lib/timeline-api";

export const ICONS: Record<string, LucideIcon> = {
  Activity, Apple, ArrowLeftRight, Award, BarChart3, Bell, BellRing, BookOpen, Bookmark, BookmarkPlus, Brain,
  Calendar, CalendarCheck, CalendarPlus, CalendarX, Check, CheckCircle2, Circle, ClipboardCheck, Clock, Coins,
  Compass, Dna, Download, Droplets, Dumbbell, Eraser, FlaskConical, Flame, Gauge, Gift, Headphones, Heart,
  HeartHandshake, Languages, ListChecks, ListPlus, MessageCircle, MessageSquare, MessagesSquare, Moon, Music,
  PartyPopper, PenSquare, Phone, Pill, PlayCircle, Radio, Route, Scale, Send, Settings, Share2, ShieldAlert,
  ShieldCheck, ShoppingBag, Smile, Sparkles, Target, ThumbsUp, TrendingDown, TrendingUp, Trophy, UserCog,
  UserMinus, UserPlus, Users, Wallet, Watch, X,
};

export function iconFor(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || Circle;
}

/** Full class names (Tailwind needs them literally). Tokens: --pill-<pillar>-accent / -tint. */
export const PILLAR_STYLE: Record<PillarKey, { icon: LucideIcon; tint: string; accent: string; bar: string; border: string }> = {
  nutrition: { icon: Apple, tint: "bg-pill-nutrition-tint", accent: "text-pill-nutrition-accent", bar: "bg-pill-nutrition-accent", border: "border-pill-nutrition-accent/30" },
  hydration: { icon: Droplets, tint: "bg-pill-hydration-tint", accent: "text-pill-hydration-accent", bar: "bg-pill-hydration-accent", border: "border-pill-hydration-accent/30" },
  exercise: { icon: Dumbbell, tint: "bg-pill-exercise-tint", accent: "text-pill-exercise-accent", bar: "bg-pill-exercise-accent", border: "border-pill-exercise-accent/30" },
  sleep: { icon: Moon, tint: "bg-pill-sleep-tint", accent: "text-pill-sleep-accent", bar: "bg-pill-sleep-accent", border: "border-pill-sleep-accent/30" },
  mental: { icon: Brain, tint: "bg-pill-mental-tint", accent: "text-pill-mental-accent", bar: "bg-pill-mental-accent", border: "border-pill-mental-accent/30" },
};

/** Life categories offered under "More" (pillars have their own chips). */
export const LIFE_CATEGORIES = ["index", "cross_pillar", "diary", "goals", "journey", "vitana", "community", "events", "live_media", "shop", "wallet", "account"] as const;

/** "+6" / "−3", isolated so the sign stays in front in right-to-left text. */
export function signed(n: number): string {
  const s = fmtNumber(Math.abs(n));
  const v = n > 0 ? `+${s}` : n < 0 ? `−${s}` : s;
  return `\u2066${v}\u2069`;
}

/** The one sentence the member reads for a moment. Unknown topic → its category. */
export function momentTitle(item: Pick<TimelineMoment, "topic" | "category">): string {
  const key = `timeline.topic.${item.topic}`;
  const s = t(key);
  return s && s !== key ? s : t(`timeline.category.${item.category}`);
}

/** Short facts after the sentence: "500 ml · by voice". Only known params are shown. */
const INSIGHT_KINDS = new Set(["weakest_pillar_streak", "pillar_slipping", "pillar_rising"]);

export function momentFacts(item: Pick<TimelineMoment, "summary">): string[] {
  const p = item.summary?.params ?? {};
  const out: string[] = [];
  if (typeof p.amount_ml === "number") out.push(t("timeline.unit.ml", { n: fmtNumber(p.amount_ml) }));
  if (typeof p.hours === "number") out.push(t("timeline.unit.hours", { n: fmtNumber(p.hours, { maximumFractionDigits: 1 }) }));
  if (typeof p.minutes === "number") out.push(t("timeline.unit.minutes", { n: fmtNumber(p.minutes) }));
  if (typeof p.streak_days === "number") out.push(t("timeline.unit.days", { n: fmtNumber(p.streak_days) }));
  if (typeof p.score_total === "number") out.push(t("timeline.unit.score", { n: fmtNumber(p.score_total) }));
  // VTID-05172: a "Vitana noticed" insight reads as one sentence about its pillar.
  if (typeof p.insight_kind === "string" && INSIGHT_KINDS.has(p.insight_kind) && typeof p.pillar === "string" && isPillar(p.pillar)) {
    out.push(t(`timeline.insight.${p.insight_kind}`, { pillar: pillarLabel(p.pillar) }));
  } else if (typeof p.pillar === "string" && isPillar(p.pillar)) out.push(pillarLabel(p.pillar));
  if (p.via === "voice" || p.via === "manual" || p.via === "diary") out.push(t(`timeline.via.${p.via}`));
  return out;
}

export function isPillar(v: unknown): v is PillarKey {
  return v === "nutrition" || v === "hydration" || v === "exercise" || v === "sleep" || v === "mental";
}

/** Vitana Index tier key (gateway: starting|early|building|strong|really_good|elite) → label. */
export function tierLabel(tier: string): string {
  const camel = tier.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  const key = `vitanaIndex.tiers.${camel}`;
  const s = t(key);
  return s && s !== key ? s : tier;
}

/** Where "Open" goes for a moment (by category). */
export const CATEGORY_LINK: Partial<Record<string, string>> = {
  index: "/health/vitana-index",
  nutrition: "/health/vitana-index",
  hydration: "/health/vitana-index",
  exercise: "/health/vitana-index",
  sleep: "/health/vitana-index",
  mental: "/health/vitana-index",
  cross_pillar: "/health/vitana-index",
  diary: "/memory/diary",
  vitana: "/memory",
};
