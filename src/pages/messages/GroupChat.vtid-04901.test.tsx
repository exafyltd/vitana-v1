/**
 * VTID-04901 — the group chat ("Alle Beisammen") can always be left.
 *
 * Owner report 2026-10-05: on Android the member could not exit the group
 * chat. The header's tiny "←" sat under the status bar (the app draws under
 * it, `viewport-fit=cover`), the loading state had no exit at all, and every
 * 8s poll re-fetched the whole roster.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const fetchGroup = vi.fn();
const fetchGroupMessages = vi.fn();

vi.mock("@/hooks/useChatApi", () => ({
  fetchGroup: (...a: unknown[]) => fetchGroup(...a),
  fetchGroupMessages: (...a: unknown[]) => fetchGroupMessages(...a),
  sendGroupMessage: vi.fn(),
  markGroupRead: vi.fn(() => Promise.resolve()),
  updateGroupMessage: vi.fn(),
  deleteGroupMessage: vi.fn(),
}));

vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "me" } }),
}));

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ translate: (k: string) => k }),
}));

vi.mock("@/integrations/supabase/client", () => {
  const channel = { on: () => channel, subscribe: () => channel };
  return { supabase: { channel: () => channel, removeChannel: vi.fn() } };
});

vi.mock("@/components/messages/MessageInput", () => ({ default: () => <div data-testid="composer" /> }));
vi.mock("@/components/messages/MessageBubble", () => ({ default: () => <div data-testid="bubble" /> }));

import GroupChat from "./GroupChat";

const GROUP = {
  id: "g1",
  name: "Alle Beisammen 🤗",
  is_system: true,
  metadata: {},
  members: [{ user_id: "me", display_name: "Me" }],
  member_count: 1,
};

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname}</div>;
}

function renderAt(entries: string[], index?: number) {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={index}>
      <Routes>
        <Route path="/inbox" element={<Where />} />
        <Route path="/comm/news" element={<Where />} />
        <Route path="/inbox/g/:groupId" element={<GroupChat />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("GroupChat exit (VTID-04901)", () => {
  beforeEach(() => {
    fetchGroup.mockReset();
    fetchGroupMessages.mockReset();
    fetchGroupMessages.mockResolvedValue([]);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the back button while the group is still loading", () => {
    fetchGroup.mockReturnValue(new Promise(() => {}));
    renderAt(["/inbox/g/g1"]);
    expect(screen.getByTestId("group-chat-back")).toBeTruthy();
    expect(screen.getByText("inbox.group.loading")).toBeTruthy();
  });

  it("pads the header below the status bar and gives the button a 44px target", async () => {
    fetchGroup.mockResolvedValue(GROUP);
    renderAt(["/inbox/g/g1"]);
    const back = await screen.findByTestId("group-chat-back");
    expect(back.className).toContain("h-11");
    expect(back.className).toContain("w-11");
    const header = back.closest("header") as HTMLElement;
    expect(header.getAttribute("style") || "").toContain("safe-area-inset-top");
  });

  it("deep link without in-app history goes to the inbox", async () => {
    fetchGroup.mockResolvedValue(GROUP);
    renderAt(["/inbox/g/g1"]);
    fireEvent.click(await screen.findByTestId("group-chat-back"));
    expect((await screen.findByTestId("where")).textContent).toBe("/inbox");
  });

  it("returns from sign-in/onboarding (in-app history, not from the inbox) to the inbox, not back", async () => {
    fetchGroup.mockResolvedValue(GROUP);
    render(
      <MemoryRouter initialEntries={["/maxina"]}>
        <Routes>
          <Route path="/maxina" element={<OpenLink />} />
          <Route path="/inbox" element={<Where />} />
          <Route path="/inbox/g/:groupId" element={<GroupChat />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("open"));
    fireEvent.click(await screen.findByTestId("group-chat-back"));
    expect((await screen.findByTestId("where")).textContent).toBe("/inbox");
  });

  it("shows an error, not an empty chat, when the messages fail to load", async () => {
    fetchGroup.mockResolvedValue(GROUP);
    fetchGroupMessages.mockRejectedValue(new Error("Gateway 500"));
    renderAt(["/inbox/g/g1"]);
    expect(await screen.findByText("inbox.group.cantOpen")).toBeTruthy();
    expect(screen.queryByText("inbox.group.empty")).toBeNull();
  });

  it("goes back to the inbox list it was opened from (history back)", async () => {
    fetchGroup.mockResolvedValue(GROUP);
    render(
      <MemoryRouter initialEntries={["/inbox"]}>
        <Routes>
          <Route path="/inbox" element={<Opener />} />
          <Route path="/inbox/g/:groupId" element={<GroupChat />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("open"));
    fireEvent.click(await screen.findByTestId("group-chat-back"));
    expect((await screen.findByTestId("where")).textContent).toBe("/inbox");
  });

  it("polls messages without re-fetching the whole roster", async () => {
    vi.useFakeTimers();
    fetchGroup.mockResolvedValue(GROUP);
    renderAt(["/inbox/g/g1"]);
    await act(async () => { await Promise.resolve(); });
    expect(fetchGroup).toHaveBeenCalledTimes(1);
    const before = fetchGroupMessages.mock.calls.length;
    await act(async () => { vi.advanceTimersByTime(8000 * 3); });
    expect(fetchGroupMessages.mock.calls.length).toBeGreaterThanOrEqual(before + 3);
    expect(fetchGroup).toHaveBeenCalledTimes(1);
  });
});

function Opener() {
  const loc = useLocation();
  return (
    <div>
      <div data-testid="where">{loc.pathname}</div>
      <OpenLink fromInbox />
    </div>
  );
}

import { useNavigate } from "react-router-dom";
function OpenLink({ fromInbox = false }: { fromInbox?: boolean }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate("/inbox/g/g1", fromInbox ? { state: { fromInbox: true } } : undefined)}>
      open
    </button>
  );
}
