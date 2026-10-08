/**
 * VTID-04979 — Social tab: brand-coloured logos and the "+" channel picker.
 *   - the connect row shows the logos in full colour (no grayscale/opacity);
 *   - TikTok's white glyph sits on a black tile;
 *   - "+" opens a picker with every channel; picking one opens the SAME edit
 *     dialog a logo tap opens, only after the picker has closed;
 *   - a connected channel opens the dialog pre-filled with its stored URL;
 *   - visitors never get a "+" or a picker.
 */
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { UserProfile } from "@/types/profile";
import { MobileIdCardBack } from "./MobileIdCardBack";

vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "a27552a3-0257-4305-8ed0-351a80fd3701" } }),
}));
vi.mock("@/context/ProfileProvider", () => ({
  useProfile: () => ({ refreshProfile: vi.fn() }),
}));
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ translate: (_k: string, fallback: string) => fallback }),
}));

const dialogCalls: Array<{ open: boolean; platform: string; initialUrl?: string }> = [];
vi.mock("@/components/profile/dialogs/SocialMediaImportDialog", () => ({
  SocialMediaImportDialog: (props: { open: boolean; platform: string; initialUrl?: string }) => {
    dialogCalls.push({ open: props.open, platform: props.platform, initialUrl: props.initialUrl });
    return props.open ? (
      <div data-testid="import-dialog" data-platform={props.platform} data-initial-url={props.initialUrl ?? ""} />
    ) : null;
  },
}));

// The real vaul drawer animates via CSS; jsdom has no animations, so render a
// plain stand-in that exposes open state and the close callback.
vi.mock("./SocialChannelPickerDrawer", () => ({
  SocialChannelPickerDrawer: (props: {
    open: boolean;
    channels: Array<{ id: string; connected: boolean; tileBg: string }>;
    onPick: (id: string) => void;
  }) =>
    props.open ? (
      <div data-testid="social-channel-picker">
        {props.channels.map((c) => (
          <button
            key={c.id}
            data-testid={`social-channel-option-${c.id}`}
            data-connected={String(c.connected)}
            onClick={() => props.onPick(c.id)}
          />
        ))}
      </div>
    ) : null,
}));

const baseProfile = { user_id: "a27552a3-0257-4305-8ed0-351a80fd3701" } as unknown as UserProfile;

describe("MobileIdCardBack (VTID-04979)", () => {
  beforeEach(() => {
    dialogCalls.length = 0;
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the connect-row logos in full brand colour, TikTok on black", () => {
    render(<MobileIdCardBack profile={baseProfile} editMode isOwner />);
    for (const id of ["linkedin", "instagram", "x", "tiktok", "youtube", "facebook"]) {
      const tile = screen.getByTestId(`social-connect-${id}`);
      expect(tile.innerHTML).not.toMatch(/grayscale|opacity-40/);
    }
    expect(screen.getByTestId("social-connect-tiktok").style.backgroundColor).toBe("rgb(0, 0, 0)");
    expect(screen.getByTestId("social-connect-linkedin").style.backgroundColor).toBe("rgb(255, 255, 255)");
  });

  it("tapping a logo opens the edit dialog for that platform", () => {
    render(<MobileIdCardBack profile={baseProfile} editMode isOwner />);
    fireEvent.click(screen.getByTestId("social-connect-instagram"));
    expect(screen.getByTestId("import-dialog").dataset.platform).toBe("instagram");
  });

  it("'+' opens the picker with all six channels; a pick opens the same dialog after the picker closed", () => {
    render(<MobileIdCardBack profile={baseProfile} editMode isOwner />);
    fireEvent.click(screen.getByTestId("social-add-channel"));
    const picker = screen.getByTestId("social-channel-picker");
    expect(picker.querySelectorAll("button")).toHaveLength(6);

    fireEvent.click(screen.getByTestId("social-channel-option-youtube"));
    // Picker is closed, dialog not yet open (never two modals at once).
    expect(screen.queryByTestId("social-channel-picker")).toBeNull();
    expect(screen.queryByTestId("import-dialog")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByTestId("import-dialog").dataset.platform).toBe("youtube");
  });

  it("closing the picker without a pick opens nothing", () => {
    render(<MobileIdCardBack profile={baseProfile} editMode isOwner />);
    fireEvent.click(screen.getByTestId("social-add-channel"));
    expect(screen.getByTestId("social-channel-picker")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByTestId("import-dialog")).toBeNull();
  });

  it("a connected channel is marked connected and its URL pre-fills the dialog", () => {
    const profile = { ...baseProfile, linkedin_url: "https://www.linkedin.com/in/someone" } as UserProfile;
    render(<MobileIdCardBack profile={profile} editMode isOwner />);
    // With a connected account the "+" lives in the connected grid.
    fireEvent.click(screen.getByTestId("social-add-channel"));
    expect(screen.getByTestId("social-channel-option-linkedin").dataset.connected).toBe("true");
    expect(screen.getByTestId("social-channel-option-x").dataset.connected).toBe("false");
    fireEvent.click(screen.getByTestId("social-channel-option-linkedin"));
    act(() => {
      vi.advanceTimersByTime(600);
    });
    const dialog = screen.getByTestId("import-dialog");
    expect(dialog.dataset.platform).toBe("linkedin");
    expect(dialog.dataset.initialUrl).toBe("https://www.linkedin.com/in/someone");
  });

  it("visitors get no '+' and no picker", () => {
    render(<MobileIdCardBack profile={baseProfile} isOwner={false} />);
    expect(screen.queryByTestId("social-add-channel")).toBeNull();
    expect(screen.queryByTestId("social-channel-picker")).toBeNull();
  });
});
