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
export const INDEX_HERO_CLASS = "relative overflow-hidden rounded-3xl border border-border/70 p-5";
export const INDEX_HERO_STYLE: CSSProperties = {
  backgroundColor: "hsl(var(--surface-page))",
  backgroundImage: "linear-gradient(165deg, hsl(var(--surface-page-from)) 0%, hsl(var(--surface-page-via)) 55%, hsl(var(--surface-page-to)) 100%)",
  boxShadow: "0 6px 22px hsl(var(--category-3) / 0.12)",
  isolation: "isolate",
};
export const INDEX_EYEBROW = "text-center text-xs font-semibold uppercase tracking-[0.28em] text-category-1";
/** Rounded icon tile and the "next up" box used inside cards. */
export const INDEX_TILE = "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-category-1/10 text-category-1";
export const INDEX_NEXT_UP = "rounded-2xl bg-gradient-to-br from-category-1/10 to-category-7/10 p-4 ring-1 ring-category-1/15";
export const INDEX_NEXT_UP_CHIP =
  "inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-category-1 ring-1 ring-category-1/15";
