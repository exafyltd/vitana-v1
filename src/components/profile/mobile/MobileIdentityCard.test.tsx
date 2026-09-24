/**
 * VTID-04470 — owner vs visitor contract of the redesigned profile header +
 * Vitana Index hero. These are the parts a regression would turn into a
 * privacy or honesty bug, not a cosmetic one:
 *   - the photo-edit pencil only ever renders for the owner;
 *   - a visitor never sees the VIEWER's own Index when the profile has none;
 *   - the score opens the EXISTING detailed drawer (window event), the (i)
 *     opens the new achievement drawer — two different actions;
 *   - no "Top X%" is rendered (there is no ranking data for the Index).
 */
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ComponentProps, ReactNode } from "react";
import { MobileIdentityCard } from "./MobileIdentityCard";
import { VITANA_INDEX_OPEN_EVENT } from "@/components/health/VitanaIndexSheet";

const liveIndex = {
  total: 122,
  tier: { labelKey: "vitanaIndex.tiers.early", color: "#fde68a" },
  pillars: { nutrition: 30, hydration: 20, exercise: 40, sleep: 25, mental: 15 },
  subscores: null,
  balanceFactor: null,
  history: [
    { date: "d1", score: 100 },
    { date: "d7", score: 122 },
  ],
  pillarHistory: [
    { date: "d1", pillars: { nutrition: 20, hydration: 20, exercise: 25, sleep: 25, mental: 15 } },
    { date: "d7", pillars: { nutrition: 30, hydration: 20, exercise: 40, sleep: 25, mental: 15 } },
  ],
  trend: "up",
  confidence: 1,
  isBaseline: false,
  lastUpdated: "d7",
};

vi.mock("@/components/health/VitanaIndexProvider", () => ({
  useVitanaIndexCache: () => ({ index: liveIndex, isLoading: false }),
}));
vi.mock("@/components/health/VitanaIndexSheet", () => ({
  VITANA_INDEX_OPEN_EVENT: "vitana:open-index",
}));
vi.mock("@/components/ui/drawer", () => {
  const Pass = ({ children, ...rest }: { children?: ReactNode; [k: string]: unknown }) => (
    <div data-testid={rest["data-testid"] as string | undefined}>{children}</div>
  );
  return {
    Drawer: ({ open, children }: { open: boolean; children?: ReactNode }) => (open ? <>{children}</> : null),
    DrawerContent: Pass,
    DrawerTitle: Pass,
    DrawerDescription: Pass,
    DrawerClose: ({ children }: { children?: ReactNode }) => <button type="button">{children}</button>,
  };
});
let boostData: unknown = null;
vi.mock("@/hooks/useIndexBoost", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useIndexBoost")>();
  return { ...actual, useIndexBoost: () => ({ data: boostData }) };
});
let standingData: unknown = null;
vi.mock("@/hooks/useIndexStanding", () => ({ useIndexStanding: () => ({ data: standingData }) }));
vi.mock("@/lib/locale-format", () => ({ fmtNumber: (n: number) => String(n) }));
vi.mock("@/hooks/useVitanaStreaks", () => ({ useVitanaStreaks: () => ({ current: 0 }) }));
vi.mock("@/hooks/useFollow", () => ({ useFollow: () => ({ followersCount: 7, followingCount: 7 }) }));
vi.mock("@/hooks/useProfileStatsCount", () => ({
  useProfileStatsCount: () => ({ postsCount: 53, mediaCount: 3, groupsCount: 0, isPending: false }),
}));
vi.mock("@/components/profile/FollowListDialog", () => ({ FollowListDialog: () => null }));
vi.mock("@/components/profile/GroupListDialog", () => ({ GroupListDialog: () => null }));
vi.mock("@/lib/i18n-toast", () => ({
  t: (k: string, p?: Record<string, unknown>) => (p ? `${k}${JSON.stringify(p)}` : k),
  lookup: (k: string) => k,
}));
vi.mock("@/hooks/useVitanaIndex", () => ({ pillarLabel: (k: string) => `pillar:${k}` }));
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ translate: (k: string, fallback?: string) => fallback ?? k }),
}));

function renderCard(props: Partial<ComponentProps<typeof MobileIdentityCard>> = {}) {
  return render(
    <MemoryRouter>
      <MobileIdentityCard displayName="Jovana Tadić" handle="jovana4" userId="u1" profileId="u1" {...props} />
    </MemoryRouter>,
  );
}

describe("MobileIdentityCard (VTID-04470)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    boostData = null;
    standingData = null;
  });

  it("owner: shows the photo pencil wired to the existing identity editor", () => {
    const onEditIdentity = vi.fn();
    renderCard({ isOwner: true, onEditIdentity, onShare: vi.fn() });
    fireEvent.click(screen.getByTestId("profile-edit-photo"));
    expect(onEditIdentity).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Follow")).toBeNull();
  });

  it("visitor: no pencil even if an edit handler leaks through", () => {
    renderCard({ isOwner: false, onEditIdentity: vi.fn(), onFollow: vi.fn(), onMessage: vi.fn() });
    expect(screen.queryByTestId("profile-edit-photo")).toBeNull();
    expect(screen.getByText("Follow")).toBeTruthy();
    expect(screen.getByText("screens.profile.message")).toBeTruthy();
  });

  it("visitor without a public Index never shows the viewer's own score", () => {
    renderCard({ isOwner: false, vitanaIndex: undefined });
    expect(screen.getByTestId("profile-index-score").textContent).not.toContain("122");
    expect(screen.getByText("profile.indexHero.noIndexPublic")).toBeTruthy();
    expect(screen.queryByTestId("profile-index-open-detailed")).toBeNull();
  });

  it("owner: tapping the score opens the existing detailed drawer", () => {
    const listener = vi.fn();
    window.addEventListener(VITANA_INDEX_OPEN_EVENT, listener);
    renderCard({ isOwner: true });
    fireEvent.click(screen.getByTestId("profile-index-open-detailed"));
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(VITANA_INDEX_OPEN_EVENT, listener);
  });

  it("owner: biggest boost names the pillars that actually rose, no percentile", () => {
    renderCard({ isOwner: true });
    const line = screen.getByTestId("profile-index-line").textContent ?? "";
    expect(line).toContain("profile.indexHero.boostPrefix");
    expect(line).toContain("pillar:exercise");
    expect(line).toContain("pillar:nutrition");
    expect(document.body.textContent).not.toMatch(/Top\s*\d+\s*%/);
  });

  it("shows the real Top X% badge only when the server vouches for it (VTID-04498)", () => {
    standingData = { topPercent: 11, cohortSize: 66 };
    renderCard({ isOwner: false });
    const badge = screen.getByTestId("profile-index-top-percent");
    expect(badge.textContent).toContain('profile.indexHero.topPercent{"percent":11}');
    expect(badge.getAttribute("aria-label")).toContain('"count":66');
  });

  it("no badge when the server returns no standing", () => {
    renderCard({ isOwner: true });
    expect(screen.queryByTestId("profile-index-top-percent")).toBeNull();
  });

  it("the (i) icon opens the achievement drawer, not the detailed one", () => {
    const listener = vi.fn();
    window.addEventListener(VITANA_INDEX_OPEN_EVENT, listener);
    renderCard({ isOwner: true, onShare: vi.fn() });
    fireEvent.click(screen.getByTestId("profile-index-info"));
    const drawer = screen.getByTestId("vitana-achievement-drawer");
    expect(within(drawer).getByText("profile.indexHero.aboutTitle")).toBeTruthy();
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(VITANA_INDEX_OPEN_EVENT, listener);
  });

  it("renders Posts / Media / Groups inside the Index card", () => {
    renderCard({ isOwner: true });
    const card = screen.getByTestId("profile-vitana-index-card");
    expect(within(card).getByText("53")).toBeTruthy();
    expect(within(card).getByText("Posts")).toBeTruthy();
  });
  it("real activity drives the line — for visitors too, with numbers (VTID-04489)", () => {
    boostData = { hidden: false, windowDays: 7, kind: "boost", drivers: [{ type: "workout", activity: "running", count: 4, total: 120 }] };
    renderCard({ isOwner: false, vitanaIndex: 200 });
    const line = screen.getByTestId("profile-index-line").textContent ?? "";
    expect(line).toContain("profile.indexHero.boostPrefix");
    expect(line).toContain("profile.indexBoost.workout7");
    expect(line).toContain('"count":4');
    expect(line).toContain("profile.indexBoost.activity.running");
  });

  it("says 'Most active' when the Index did not rise", () => {
    boostData = { hidden: false, windowDays: 30, kind: "active", drivers: [{ type: "journey", activity: null, count: 18, total: 36 }] };
    renderCard({ isOwner: true });
    const line = screen.getByTestId("profile-index-line").textContent ?? "";
    expect(line).toContain("profile.indexBoost.mostActivePrefix");
    expect(line).toContain("profile.indexBoost.journey30");
    expect(line).not.toContain("profile.indexHero.boostPrefix");
  });

  it("a member who hid it falls back to the public line", () => {
    boostData = { hidden: true, windowDays: 30, kind: "active", drivers: [] };
    renderCard({ isOwner: false, vitanaIndex: 200 });
    expect(screen.getByTestId("profile-index-line").textContent).toBe("profile.indexHero.publicLine");
  });

  it("the drawer lists the real top activities as 'What helped most'", () => {
    boostData = { hidden: false, windowDays: 7, kind: "boost", drivers: [
      { type: "workout", activity: "running", count: 4, total: 120 },
      { type: "nutrition", activity: null, count: 5, total: null },
    ] };
    renderCard({ isOwner: false, vitanaIndex: 200 });
    fireEvent.click(screen.getByTestId("profile-index-info"));
    const chips = screen.getByTestId("achievement-drivers").textContent ?? "";
    expect(chips).toContain("profile.indexBoost.activity.running");
    expect(chips).toContain("profile.indexBoost.type.nutrition");
  });

  it("stretches the Index card to the fold and pins Posts/Media/Groups to its bottom", () => {
    renderCard({ isOwner: true });
    const card = screen.getByTestId("profile-vitana-index-card");
    // jsdom: no bottom nav, card at top 0 → fills window.innerHeight minus the gap.
    expect(card.style.minHeight).toBe(`${window.innerHeight - 8}px`);
    expect(screen.getByTestId("profile-index-stats").className).toContain("mt-auto");
  });
});
