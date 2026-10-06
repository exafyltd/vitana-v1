/**
 * VTID-04926 — PostDetail is where the "you were tagged" push lands
 * (/post/post/<id>). It used to rebuild the post without its `mentions`, so
 * the tagged member saw their own tag as plain text.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const cardItem = vi.fn();
vi.mock("@/components/home/CommunityPostCard", () => ({
  CommunityPostCard: ({ item }: { item: unknown }) => {
    cardItem(item);
    return <div data-testid="card" />;
  },
}));
vi.mock("@/lib/i18n-toast", () => ({ t: (k: string) => k }));

const ROW = {
  id: "p1",
  user_id: "author",
  content: "Toller Abend mit @Stefan Ehlke",
  mentions: [{ user_id: "u-stefan", display_name: "Stefan Ehlke" }],
  background_style: "sunset",
  likes_count: 2,
  comments_count: 1,
  created_at: "2026-10-06T19:00:00Z",
};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: table === "profile_posts" ? ROW : { display_name: "Michael", avatar_url: null }, error: null }),
        }),
      }),
    }),
  },
}));

import PostDetail from "./PostDetail";

describe("PostDetail keeps the post's tags (VTID-04926)", () => {
  it("passes mentions and background through to the card", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/post/post/p1"]}>
          <Routes>
            <Route path="/post/:source/:id" element={<PostDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("card")).toBeTruthy());
    const item = cardItem.mock.calls.at(-1)![0] as { mentions: unknown; background_style: unknown };
    expect(item.mentions).toEqual(ROW.mentions);
    expect(item.background_style).toBe("sunset");
  });
});
