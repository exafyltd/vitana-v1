import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { t } from "@/lib/i18n-toast";
import { FeatureAnnouncementCard } from "./FeatureAnnouncementCard";

function renderCard(variant: "did-you-know-feature" | "brand-new-feature") {
  return render(
    <MemoryRouter>
      <FeatureAnnouncementCard
        variant={variant}
        featureTitle="Live Rooms"
        description="Join real-time voice conversations with other members."
        deepLink="/comm/events-meetups"
      />
    </MemoryRouter>,
  );
}

describe("FeatureAnnouncementCard (VTID-04973)", () => {
  it("did-you-know is a Vitana card: Vitana header, tip text first, no 'You can:' lead-in", () => {
    const { container } = renderCard("did-you-know-feature");
    // Vitana identity header = the orb avatar image
    expect(container.querySelector("img")).not.toBeNull();
    // the obsolete lead-in line is gone
    expect(screen.queryByText(t("featureAnnouncementCard.didYouKnow.intro"))).toBeNull();
    // the tip itself is shown, title before description
    expect(screen.getByText("Live Rooms")).toBeTruthy();
    expect(screen.getByText("Join real-time voice conversations with other members.")).toBeTruthy();
    expect(screen.getByTestId("feature-announcement-did-you-know-feature")).toBeTruthy();
  });

  it("brand-new-feature keeps its own chrome and its 'From now on, you can:' line", () => {
    const { container } = renderCard("brand-new-feature");
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText(t("featureAnnouncementCard.brandNew.intro"))).toBeTruthy();
  });
});
