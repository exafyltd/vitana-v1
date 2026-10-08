/** VTID-04979 — the real (vaul) picker lists every channel and hands the pick back. */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SocialChannelPickerDrawer } from "./SocialChannelPickerDrawer";

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ translate: (_k: string, fallback: string) => fallback }),
}));
vi.mock("@/hooks/useOrbSuppression", () => ({ useOrbSuppression: () => undefined }));

const channels = ["linkedin", "instagram", "x", "tiktok", "youtube", "facebook"].map((id) => ({
  id,
  name: id,
  icon: <svg data-testid={`icon-${id}`} />,
  tileBg: id === "tiktok" ? "#000000" : "#FFFFFF",
  connected: id === "linkedin",
}));

describe("SocialChannelPickerDrawer", () => {
  it("lists all channels, marks connected ones, and reports the pick", () => {
    const onPick = vi.fn();
    render(
      <SocialChannelPickerDrawer open onOpenChange={() => {}} channels={channels} onPick={onPick} />,
    );
    for (const c of channels) {
      expect(screen.getByTestId(`social-channel-option-${c.id}`)).toBeTruthy();
    }
    expect(screen.getByTestId("social-channel-option-linkedin").textContent).toContain("Connected");
    expect(screen.getByTestId("social-channel-option-x").textContent).not.toContain("Connected");
    fireEvent.click(screen.getByTestId("social-channel-option-tiktok"));
    expect(onPick).toHaveBeenCalledWith("tiktok");
  });
});
