/**
 * VTID-04524: `/i/<code>` remembers the invite code and lands the friend on the
 * Join tab of the community sign-up (they are almost always new).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import InviteLanding from "./InviteLanding";

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.search}</div>;
}

describe("InviteLanding", () => {
  beforeEach(() => localStorage.clear());

  it("stores the code and opens the Join tab", async () => {
    render(
      <MemoryRouter initialEntries={["/i/abc123"]}>
        <Routes>
          <Route path="/i/:code" element={<InviteLanding />} />
          <Route path="/maxina" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    expect((await screen.findByTestId("where")).textContent).toBe("/maxina?tab=signup");
    expect(localStorage.getItem("vitana.invite_code")).toContain("abc123");
  });
});
