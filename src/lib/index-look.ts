/**
 * VTID-04852 — the look of the Vitana Index page ("Understand index"), shared.
 *
 * The calendar follows the Index page: a pale blue hero, white rounded-3xl
 * cards with a soft shadow, teal accents, slate text and dark pill buttons.
 * These strings are copied from src/pages/health/VitanaIndexDetail.tsx, and
 * index-look.test.ts fails the build if the two ever differ, so the pages
 * cannot drift apart.
 */
import type { CSSProperties } from "react";

export const INDEX_CARD = "rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.06)]";
export const INDEX_PRIMARY_BTN =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-[15px] font-semibold text-white active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2";
export const INDEX_SOFT_BTN =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-[15px] font-semibold text-slate-800 ring-1 ring-slate-200 active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500";

/** The pale blue hero card at the top of the page. */
export const INDEX_HERO_CLASS = "relative overflow-hidden rounded-3xl border border-white/70 p-5";
export const INDEX_HERO_STYLE: CSSProperties = {
  backgroundColor: "hsl(208, 72%, 93%)",
  backgroundImage: "linear-gradient(165deg, hsl(200, 80%, 91%) 0%, hsl(212, 72%, 94%) 55%, hsl(225, 65%, 95%) 100%)",
  boxShadow: "0 6px 22px rgba(56, 132, 214, 0.12)",
  isolation: "isolate",
};
export const INDEX_EYEBROW = "text-center text-xs font-semibold uppercase tracking-[0.28em] text-teal-800";
export const INDEX_GLOW_STYLE: CSSProperties = {
  background: "radial-gradient(circle, hsl(165, 80%, 70%), hsl(200, 80%, 80%) 55%, transparent 72%)",
};
export const INDEX_NUMBER_STYLE: CSSProperties = {
  background: "linear-gradient(170deg, hsl(152, 70%, 42%) 0%, hsl(168, 72%, 30%) 55%, hsl(180, 75%, 22%) 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

/** Rounded icon tile and the "next up" box used inside cards. */
export const INDEX_TILE = "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700";
export const INDEX_NEXT_UP = "rounded-2xl bg-gradient-to-br from-teal-50 to-sky-50 p-4 ring-1 ring-teal-100";
export const INDEX_NEXT_UP_CHIP =
  "inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-teal-800 ring-1 ring-teal-100";
