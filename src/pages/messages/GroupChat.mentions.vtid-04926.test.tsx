/**
 * VTID-04926 — the group chat offers its own members as @mentions: never
 * yourself, never the Vitana bot, never an account the gateway marks as not
 * mentionable (service/test accounts), never a member without a name.
 */
import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const composerProps = vi.fn();

vi.mock("@/hooks/useChatApi", () => ({
  fetchGroup: () =>
    Promise.resolve({
      id: "g1",
      name: "Alle Beisammen",
      is_system: true,
      metadata: {},
      member_count: 6,
      members: [
        { user_id: "me", display_name: "Me", avatar_url: null, is_bot: false, mentionable: true },
        { user_id: "u-stefan", display_name: " Stefan Ehlke ", avatar_url: "a.png", is_bot: false, mentionable: true },
        { user_id: "u-old-gw", display_name: "Older Gateway", avatar_url: null, is_bot: false },
        { user_id: "bot", display_name: "Vitana", avatar_url: null, is_bot: true, mentionable: false },
        { user_id: "e2e", display_name: "E2E Test User", avatar_url: null, is_bot: false, mentionable: false },
        { user_id: "noname", display_name: null, avatar_url: null, is_bot: false, mentionable: true },
      ],
    }),
  fetchGroupMessages: () => Promise.resolve([]),
  sendGroupMessage: vi.fn(),
  markGroupRead: vi.fn(() => Promise.resolve()),
  updateGroupMessage: vi.fn(),
  deleteGroupMessage: vi.fn(),
}));
vi.mock("@/context/AuthProvider", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
vi.mock("@/hooks/useTranslation", () => ({ useTranslation: () => ({ translate: (k: string) => k }) }));
vi.mock("@/integrations/supabase/client", () => {
  const channel = { on: () => channel, subscribe: () => channel };
  return { supabase: { channel: () => channel, removeChannel: vi.fn() } };
});
vi.mock("@/components/messages/MessageInput", () => ({
  default: (props: unknown) => {
    composerProps(props);
    return <div data-testid="composer" />;
  },
}));
vi.mock("@/components/messages/MessageBubble", () => ({ default: () => null }));

import GroupChat from "./GroupChat";

describe("GroupChat @mention candidates (VTID-04926)", () => {
  it("passes the mentionable roster to the composer", async () => {
    render(
      <MemoryRouter initialEntries={["/inbox/g/g1"]}>
        <Routes>
          <Route path="/inbox/g/:groupId" element={<GroupChat />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(composerProps).toHaveBeenCalled());
    const last = composerProps.mock.calls.at(-1)![0] as { mentionCandidates: unknown };
    expect(last.mentionCandidates).toEqual([
      { user_id: "u-stefan", display_name: "Stefan Ehlke", avatar_url: "a.png" },
      { user_id: "u-old-gw", display_name: "Older Gateway", avatar_url: null },
    ]);
  });
});
