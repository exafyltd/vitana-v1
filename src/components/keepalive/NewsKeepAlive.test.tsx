/**
 * VTID-05081 — News stays alive across tab switches.
 *
 * The real News page (src/pages/Home.tsx) and the real keep-alive host/slot,
 * inside a real router; heavy children (feed cards, popups, AppLayout's chrome)
 * are stubbed. Proves: the hidden News is not re-rendered by navigation
 * elsewhere, it is mounted once and the same DOM node comes back, only one
 * AppLayout exists, other routes' `?tab` never reaches it, the title follows
 * the visible screen, `calendar:open` navigates once, sign-out / a user switch
 * unmounts it, and its scroll offset is saved and restored.
 */
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate, type NavigateFunction } from "react-router-dom";
import { createContext, useContext, useEffect, useLayoutEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  renders: 0,
  mounts: 0,
  layoutsLive: 0,
  layoutsMax: 0,
  paths: [] as string[],
  otherCalendarOpens: 0,
  track: vi.fn(),
  navigate: null as null | ((to: string) => void),
}));

// ── Auth: a real context so a sign-out / user switch re-renders ─────
type TestAuth = { user: { id: string } | null };
const TestAuthContext = createContext<TestAuth>({ user: null });
vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => useContext(TestAuthContext),
}));
vi.mock("@/hooks/useTenant", () => ({
  useTenantSafe: () => ({ activeTenantId: "t1" }),
  useTenant: () => ({ activeTenantId: "t1", isExafyAdmin: false }),
}));
vi.mock("@/hooks/useRole", () => ({ useRole: () => ({ hasPermission: () => true, isLoading: false }) }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => true }));
vi.mock("@/lib/i18n-toast", () => ({ t: (k: string) => k }));
vi.mock("@/lib/product-analytics/client", () => ({ track: h.track }));
vi.mock("@/lib/feature-flags", () => ({ isFeedV2Enabled: () => true }));
vi.mock("@/lib/locale-format", () => ({ formatDistanceToNow: () => "" }));
vi.mock("@/lib/news-images", () => ({ getNewsImage: () => "", getArticlePillar: () => null }));

// AppLayout: counts how many are mounted at once.
vi.mock("@/components/AppLayout", () => ({
  default: function AppLayout({ children }: { children: ReactNode }) {
    useLayoutEffect(() => {
      h.layoutsLive += 1;
      h.layoutsMax = Math.max(h.layoutsMax, h.layoutsLive);
      return () => {
        h.layoutsLive -= 1;
      };
    }, []);
    return <div data-testid="app-layout">{children}</div>;
  },
}));

// News's children. useAutopilot runs on every News render (render spy);
// DidYouKnowCard mounts once per News mount (mount spy).
vi.mock("@/hooks/use-autopilot", () => ({
  useAutopilot: () => {
    h.renders += 1;
    return { pendingCount: 0 };
  },
}));
vi.mock("@/components/proactive/DidYouKnowCard", () => ({
  DidYouKnowCard: () => {
    useEffect(() => {
      h.mounts += 1;
    }, []);
    return <div data-testid="news-did-you-know" />;
  },
}));
vi.mock("@/components/ui/MobileModePill", () => ({
  MobileModePill: ({ activeMode }: { activeMode: string }) => <div data-testid="news-mode" data-mode={activeMode} />,
}));
vi.mock("@/components/ui/utility-action-button", () => ({
  UtilityActionButton: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ui/expandable-search-button", () => ({ ExpandableSearchButton: () => null }));
vi.mock("@/components/mobile/MobileActionChips", () => ({ VitanaIndexChip: () => null, AutopilotChip: () => null }));
vi.mock("@/components/StandardHeader", () => ({ default: () => null }));
vi.mock("@/components/crossover/NewsArticleCard", () => ({ NewsArticleCard: () => null }));
vi.mock("@/components/CreateContentPopup", () => ({ CreateContentPopup: () => null }));
vi.mock("@/components/profile/mobile/MobileCreatePostSheet", () => ({ MobileCreatePostSheet: () => null }));
vi.mock("@/components/event-game/EventGameFeedBadge", () => ({ EventGameFeedBadge: () => null }));
vi.mock("@/components/AutopilotPopup", () => ({ AutopilotPopup: () => null }));
vi.mock("@/components/home/VitanaIndexCard", () => ({ VitanaIndexCard: () => null }));
vi.mock("@/components/home/LongevityJourneyCard", () => ({ LongevityJourneyCard: () => null }));
vi.mock("@/components/home/InviteFriendCard", () => ({ InviteFriendCard: () => null }));
vi.mock("@/components/home/NewsFeedItemCard", () => ({ NewsFeedItemCard: () => null }));
vi.mock("@/components/home/NewMemberCard", () => ({ NewMemberCard: () => null }));
vi.mock("@/hooks/useInviteFriendShare", () => ({ useInviteFriendShare: () => ({ shareInvite: vi.fn() }) }));
vi.mock("@/hooks/useNewsFeed", () => ({
  useLongevityNewsFeed: () => ({ data: undefined, fetchNextPage: vi.fn(), hasNextPage: false, isFetchingNextPage: false, isLoading: false, refetch: vi.fn() }),
  useCommunityNews: () => ({ data: [], isLoading: false, refetch: vi.fn() }),
}));
vi.mock("@/hooks/useAllNewsFeed", () => ({
  useAllNewsFeed: () => ({ items: [], isLoading: false, refetch: vi.fn(), fetchNextPage: vi.fn(), hasNextPage: false, isFetchingNextPage: false }),
}));
// The real calendar button (its calendar:open listener is under test).
vi.mock("@/hooks/useCalendarEvents", () => ({ useCalendarEvents: () => ({ events: [], getUpcomingEvents: () => [] }) }));
vi.mock("@/hooks/useTranslation", () => ({ useTranslation: () => ({ translate: (_k: string, f: string) => f }) }));

import Home from "@/pages/Home";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { useWindowOverlay } from "@/navigation/overlay-bus";
import { NewsKeepAliveHost, __resetNewsKeepAlive } from "./NewsKeepAlive";

/**
 * Another tab: its own AppLayout, its own title, and (like MobileAppShell) its
 * own calendar:open listener — which only counts, so any navigation seen while
 * this page is shown came from somewhere else.
 */
function OtherPage({ title }: { title: string }) {
  useWindowOverlay("calendar:open", () => {
    h.otherCalendarOpens += 1;
  });
  return (
    <AppLayout>
      <SEO title={title} />
      <div data-testid={`page-${title}`} />
    </AppLayout>
  );
}

function Probe() {
  const navigate: NavigateFunction = useNavigate();
  const location = useLocation();
  h.navigate = (to: string) => navigate(to);
  useEffect(() => {
    h.paths.push(location.pathname + location.search);
  }, [location]);
  return null;
}

function TestApp({ user, initial = "/home" }: { user: TestAuth["user"]; initial?: string }) {
  return (
    <TestAuthContext.Provider value={{ user }}>
      <MemoryRouter initialEntries={[initial]}>
        <Probe />
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/inbox" element={<OtherPage title="Inbox" />} />
          <Route path="/comm/events-meetups" element={<OtherPage title="Events" />} />
          <Route path="/calendar" element={<OtherPage title="Calendar" />} />
        </Routes>
        <NewsKeepAliveHost />
      </MemoryRouter>
    </TestAuthContext.Provider>
  );
}

function go(to: string) {
  act(() => h.navigate!(to));
}

const keptNode = () => document.querySelector('[data-testid="news-keepalive"]') as HTMLElement | null;
const modeIn = (node: HTMLElement | null) => node?.querySelector('[data-testid="news-mode"]')?.getAttribute("data-mode");

let scrollY = 0;
const scrollTo = vi.fn();

beforeEach(() => {
  __resetNewsKeepAlive();
  h.renders = 0;
  h.mounts = 0;
  h.layoutsLive = 0;
  h.layoutsMax = 0;
  h.paths = [];
  h.otherCalendarOpens = 0;
  h.track.mockReset();
  scrollTo.mockReset();
  scrollY = 0;
  Object.defineProperty(window, "scrollY", { configurable: true, get: () => scrollY });
  vi.stubGlobal("scrollTo", scrollTo);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const ME = { id: "u1" };

describe("News keep-alive (VTID-05081)", () => {
  it("does not re-render the hidden News on navigation elsewhere", () => {
    render(<TestApp user={ME} />);
    expect(screen.getByTestId("news-did-you-know")).toBeInTheDocument();
    go("/inbox");
    const afterHide = h.renders;
    go("/comm/events-meetups");
    go("/inbox");
    expect(h.renders).toBe(afterHide);
  });

  it("mounts News once across /home → /inbox → /home and reattaches the same DOM node", () => {
    render(<TestApp user={ME} />);
    const node = keptNode();
    const card = screen.getByTestId("news-did-you-know");
    expect(node).not.toBeNull();
    go("/inbox");
    expect(screen.queryByTestId("news-did-you-know")).toBeNull();
    expect(node!.isConnected).toBe(false);
    go("/home");
    expect(keptNode()).toBe(node);
    expect(screen.getByTestId("news-did-you-know")).toBe(card);
    expect(h.mounts).toBe(1);
  });

  it("keeps exactly one AppLayout at a time", () => {
    render(<TestApp user={ME} />);
    expect(screen.getAllByTestId("app-layout")).toHaveLength(1);
    go("/inbox");
    expect(screen.getAllByTestId("app-layout")).toHaveLength(1);
    go("/home");
    expect(screen.getAllByTestId("app-layout")).toHaveLength(1);
    expect(h.layoutsMax).toBe(1);
  });

  it("never lets another route's ?tab reach the hidden News", () => {
    render(<TestApp user={ME} initial="/home?tab=community" />);
    // Held across the detach: a hidden News is not in the document.
    const node = keptNode();
    expect(modeIn(node)).toBe("community");
    h.track.mockReset();
    go("/inbox?tab=longevity");
    go("/inbox");
    expect(modeIn(node)).toBe("community");
    expect(h.track).not.toHaveBeenCalled();
    go("/home?tab=community");
    expect(modeIn(keptNode())).toBe("community");
  });

  it("lets document.title follow the visible screen", () => {
    render(<TestApp user={ME} />);
    expect(document.title).toBe("screens.home.newsMaxina");
    go("/inbox");
    expect(document.title).toBe("Inbox");
    go("/comm/events-meetups");
    expect(document.title).toBe("Events");
    go("/home");
    expect(document.title).toBe("screens.home.newsMaxina");
  });

  it("handles calendar:open once: through visible News, never through hidden News", () => {
    render(<TestApp user={ME} />);
    const openCalendar = () =>
      act(() => {
        window.dispatchEvent(new CustomEvent("calendar:open", { cancelable: true }));
      });
    openCalendar();
    expect(h.paths.filter((p) => p === "/calendar")).toHaveLength(1);
    go("/inbox");
    h.paths = [];
    h.otherCalendarOpens = 0;
    openCalendar();
    // The visible screen handled it; the hidden News did not navigate.
    expect(h.otherCalendarOpens).toBe(1);
    expect(h.paths).toEqual([]);
  });

  it("unmounts News on sign-out and on a user switch", () => {
    const { rerender } = render(<TestApp user={ME} />);
    expect(h.mounts).toBe(1);
    rerender(<TestApp user={{ id: "u2" }} />);
    // Still on /home: the new member gets a fresh News.
    expect(h.mounts).toBe(2);
    const node = keptNode();
    go("/inbox");
    expect(node?.querySelector('[data-testid="news-did-you-know"]')).not.toBeNull();
    rerender(<TestApp user={null} />);
    expect(node?.querySelector('[data-testid="news-did-you-know"]') ?? null).toBeNull();
    // Signing back in does not bring News back before /home is visited.
    rerender(<TestApp user={ME} />);
    expect(h.mounts).toBe(2);
    expect(node?.querySelector('[data-testid="news-did-you-know"]') ?? null).toBeNull();
  });

  it("saves the scroll offset on leave and restores it on return", () => {
    render(<TestApp user={ME} />);
    scrollY = 640;
    go("/inbox");
    // The other screen scrolls; the hidden News must not record that.
    scrollY = 25;
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    scrollTo.mockReset();
    go("/home");
    expect(scrollTo).toHaveBeenLastCalledWith(0, 640);
  });
});
