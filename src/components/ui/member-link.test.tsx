import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { MemberLink } from "./member-link";

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;
const setup = (ui: JSX.Element, onCard?: () => void) =>
  render(
    <MemoryRouter initialEntries={["/feed"]}>
      <Routes>
        <Route path="*" element={<div onClick={onCard}><Where />{ui}</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("MemberLink (VTID-04992)", () => {
  it("opens the profile by handle", () => {
    setup(<MemberLink userId="u1" handle="maria">Maria</MemberLink>);
    fireEvent.click(screen.getByText("Maria"));
    expect(screen.getByTestId("where").textContent).toBe("/u/maria");
  });
  it("falls back to the id", () => {
    setup(<MemberLink userId="u1">Maria</MemberLink>);
    fireEvent.click(screen.getByText("Maria"));
    expect(screen.getByTestId("where").textContent).toBe("/u/u1");
  });
  it("does not trigger the surrounding card", () => {
    let card = 0;
    setup(<MemberLink userId="u1">Maria</MemberLink>, () => { card += 1; });
    fireEvent.click(screen.getByText("Maria"));
    expect(card).toBe(0);
  });
  it("is plain text without an id", () => {
    setup(<MemberLink>Maria</MemberLink>);
    expect(screen.queryByTestId("member-link")).toBeNull();
    expect(screen.getByText("Maria")).toBeTruthy();
  });
});
