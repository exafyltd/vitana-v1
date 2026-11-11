import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { NewMemberCard } from "./NewMemberCard";

// The composer is covered by its own suite; here we only care that the card
// opens it (and sends nothing itself), so stub it to a marker element.
vi.mock("@/components/home/NewMemberGreetingComposer", () => ({
  NewMemberGreetingComposer: ({ userId }: { userId: string }) => (
    <div data-testid="composer-stub">{userId}</div>
  ),
}));

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname}</div>;
}

function renderCard() {
  render(
    <MemoryRouter initialEntries={["/home"]}>
      <Routes>
        <Route
          path="/home"
          element={
            <NewMemberCard
              userId="user-123"
              title="Welcome Amy!"
              summary="Amy just joined."
              displayInitial="A"
              timestamp="10h"
            />
          }
        />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("NewMemberCard (VTID-04574, VTID-05207)", () => {
  // The card chrome (its tappable root) also has role="button"; the two action
  // controls are the real <button> elements, in order: Say hello, View profile.
  function actionButtons(): HTMLButtonElement[] {
    return screen
      .getAllByRole("button")
      .filter((b) => b.tagName === "BUTTON") as HTMLButtonElement[];
  }

  it("Say hello opens the inline greeting composer and navigates nowhere", () => {
    renderCard();
    expect(screen.queryByTestId("composer-stub")).toBeNull();
    fireEvent.click(actionButtons()[0]);
    // Composer appears; the router stayed on /home (nothing was sent/opened).
    expect(screen.getByTestId("composer-stub").textContent).toBe("user-123");
    expect(screen.queryByTestId("where")).toBeNull();
  });

  it("View profile opens the member's profile", () => {
    renderCard();
    fireEvent.click(actionButtons()[1]);
    expect(screen.getByTestId("where").textContent).toBe("/u/user-123");
  });

  it("tapping the card body opens the profile", () => {
    renderCard();
    fireEvent.click(screen.getByTestId("new-member-card"));
    expect(screen.getByTestId("where").textContent).toBe("/u/user-123");
  });

  it("tidies the welcome title: no space before '!', last two words kept together", () => {
    render(
      <MemoryRouter>
        <NewMemberCard userId="u" title="Welcome Helena Victoria Sander !" displayInitial="H" />
      </MemoryRouter>,
    );
    const text = screen.getByTestId("new-member-card").querySelector("p")!.textContent!;
    expect(text).not.toMatch(/\s!/);
    expect(text).toContain("Victoria Sander!".replace(" ", "\u00a0"));
  });
});
