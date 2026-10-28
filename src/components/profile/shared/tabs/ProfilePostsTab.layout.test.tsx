/**
 * profile-posts-full-width — the profile Posts tab card puts the avatar and
 * the name on one header line and the post (text + media) full width below it
 * on phones (owner request 2026-10-22, Facebook-style). Desktop keeps the
 * avatar column: the avatar spans both grid rows and the post sits in column 2.
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProfilePostsTab } from "./ProfilePostsTab";
import type { ProfilePost } from "@/hooks/useProfilePosts";
import type { UserProfile } from "@/types/profile";

let posts: ProfilePost[] = [];
vi.mock("@/hooks/useProfilePosts", () => ({
  useProfilePosts: () => ({ posts, isLoading: false, deletePost: { mutateAsync: vi.fn() } }),
}));
vi.mock("@/hooks/usePostInteractions", () => ({
  usePostInteractions: () => ({
    isLiked: false, toggleLike: vi.fn(), comments: [], addComment: vi.fn(), isAddingComment: false, deleteComment: vi.fn(),
  }),
}));
vi.mock("@/context/AuthProvider", () => ({ useAuth: () => ({ user: { id: "viewer" } }) }));
vi.mock("@/hooks/useShareOrCopy", () => ({ useShareOrCopy: () => ({ shareOrCopy: vi.fn() }) }));
vi.mock("@/hooks/useTranslation", () => ({ useTranslation: () => ({ translate: (k: string, f?: string) => f ?? k }) }));
vi.mock("@/lib/i18n-toast", () => ({ t: (k: string) => k }));
vi.mock("@/lib/locale-format", () => ({ formatDistanceToNow: () => "5 days ago" }));
vi.mock("@/components/media/FeedMedia", () => ({
  FeedMedia: ({ className }: { className?: string }) => <div data-testid="feed-media" className={className} />,
}));

const profile = { id: "author", user_id: "author", name: "Stefan Ehlke", handle: "stefan66" } as UserProfile;
const post = (over: Partial<ProfilePost>): ProfilePost => ({
  id: "p1", user_id: "author", content: "Entspannt in den Urlaub", image_url: null, video_url: null,
  background_style: null, mentions: [], likes_count: 5, comments_count: 4, shares_count: 0, is_public: true,
  created_at: "2026-10-17T10:00:00Z", updated_at: "2026-10-17T10:00:00Z", ...over,
});
const renderTab = () =>
  render(<MemoryRouter><ProfilePostsTab profile={profile} scope="public" /></MemoryRouter>);
const classes = (el: Element) => (el.getAttribute("class") || "").split(/\s+/);

describe("ProfilePostsTab card layout (profile-posts-full-width)", () => {
  beforeEach(() => { posts = []; });

  it("header row holds the avatar and the name; the post body is a separate full-width block", () => {
    posts = [post({ image_url: "https://example.test/a.jpg" })];
    renderTab();
    const header = screen.getByTestId("profile-post-header");
    const body = screen.getByTestId("profile-post-body");
    expect(header.contains(screen.getByText("Stefan Ehlke"))).toBe(true);
    expect(header.contains(screen.getByText("S"))).toBe(true); // avatar fallback initial
    expect(body.contains(screen.getByText("Entspannt in den Urlaub"))).toBe(true);
    expect(body.contains(screen.getByTestId("feed-media"))).toBe(true);
    // Neither the text nor the media sits next to the avatar on a phone: the
    // body spans both grid columns; only from md up does it move to column 2.
    expect(header.contains(screen.getByText("Entspannt in den Urlaub"))).toBe(false);
    expect(classes(body)).toEqual(expect.arrayContaining(["col-span-2", "md:col-span-1", "md:col-start-2"]));
  });

  it("media goes edge to edge on phones and keeps its desktop frame from md up", () => {
    posts = [post({ image_url: "https://example.test/a.jpg" })];
    renderTab();
    expect(classes(screen.getByTestId("feed-media"))).toEqual(
      expect.arrayContaining(["-mx-5", "md:mx-0", "md:rounded-xl", "md:shadow-md"]),
    );
  });

  it("a video post: the video frame is full width under the header", () => {
    posts = [post({ video_url: "https://example.test/v.mp4" })];
    const { container } = renderTab();
    const video = container.querySelector("video")!;
    const frame = video.parentElement!;
    expect(screen.getByTestId("profile-post-body").contains(frame)).toBe(true);
    expect(classes(frame)).toEqual(expect.arrayContaining(["-mx-5", "md:mx-0", "md:rounded-xl"]));
  });

  it("the avatar keeps the desktop column: it spans both rows from md up", () => {
    posts = [post({})];
    renderTab();
    const header = screen.getByTestId("profile-post-header");
    const avatar = screen.getByText("S").parentElement!;
    expect(classes(avatar)).toContain("md:row-span-2");
    expect(classes(header)).toContain("contents");
  });
});
