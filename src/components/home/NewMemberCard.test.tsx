import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { NewMemberCard } from "./NewMemberCard";

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

describe("NewMemberCard (VTID-04574)", () => {
  it("Say hello opens the direct conversation with the new member", () => {
    renderCard();
    fireEvent.click(screen.getAllByRole("button").find((b) => b.tagName === "BUTTON")!);
    expect(screen.getByTestId("where").textContent).toBe("/inbox/u/user-123");
  });

  it("View profile opens the member's profile", () => {
    renderCard();
    const buttons = screen.getAllByRole("button").filter((b) => b.tagName === "BUTTON");
    fireEvent.click(buttons[1]);
    expect(screen.getByTestId("where").textContent).toBe("/u/user-123");
  });

  it("tapping the card body opens the profile", () => {
    renderCard();
    fireEvent.click(screen.getByTestId("new-member-card"));
    expect(screen.getByTestId("where").textContent).toBe("/u/user-123");
  });
});
