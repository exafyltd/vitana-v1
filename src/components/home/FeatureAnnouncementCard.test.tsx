import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { activateOrb } from "@/lib/orbActivate";
import { t } from "@/lib/i18n-toast";
import { FeatureAnnouncementCard } from "./FeatureAnnouncementCard";

vi.mock("@/lib/orbActivate", () => ({ activateOrb: vi.fn(() => true) }));

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

describe("FeatureAnnouncementCard: the Talk to Vitana tip opens the voice ORB", () => {
  beforeEach(() => {
    vi.mocked(activateOrb).mockClear();
  });

  function renderTip(deepLink: string) {
    return render(
      <MemoryRouter initialEntries={["/home"]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <FeatureAnnouncementCard
                  variant="did-you-know-feature"
                  featureTitle="Talk to Vitana"
                  description="Du kannst mit Vitana auch per Sprache reden."
                  deepLink={deepLink}
                />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  function LocationProbe() {
    const location = useLocation();
    return <div data-testid="location">{location.pathname}</div>;
  }

  it("/assistant opens the ORB and does not navigate", () => {
    const { container } = renderTip("/assistant");
    fireEvent.click(container.querySelector("[role='button']") as HTMLElement);
    expect(activateOrb).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("location").textContent).toBe("/home");
  });

  it("any other deep link still navigates", () => {
    const { container } = renderTip("/comm/events-meetups");
    fireEvent.click(container.querySelector("[role='button']") as HTMLElement);
    expect(activateOrb).not.toHaveBeenCalled();
    expect(screen.getByTestId("location").textContent).toBe("/comm/events-meetups");
  });
});
