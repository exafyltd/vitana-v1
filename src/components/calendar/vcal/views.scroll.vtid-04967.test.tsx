/**
 * VTID-04967 — the opened day panel scrolls into view. On a phone the panel
 * opens below the Month grid / Week list, behind the bottom bar; a member saw
 * "nothing opened". jsdom has no scrollIntoView, so it is stubbed here and the
 * calls are asserted; the real on-screen position is checked on the built app
 * and in the staging spec.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MonthView, WeekView } from "./views";

const NOW = new Date(2026, 9, 8, 12, 0, 0);
const scroll = vi.fn();
let reduced = false;

beforeEach(() => {
  scroll.mockClear();
  reduced = false;
  Element.prototype.scrollIntoView = scroll;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reduced : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});
afterEach(() => {
  // @ts-expect-error — restore the jsdom default (no implementation)
  delete Element.prototype.scrollIntoView;
});

const renderMonth = () =>
  render(
    <MemoryRouter>
      <MonthView anchor={NOW} items={[]} now={NOW} onOpen={vi.fn()} onAdd={vi.fn()} />
    </MemoryRouter>,
  );

describe("day panel scrolls into view (VTID-04967)", () => {
  it("Month: opening a day scrolls the panel once, 'nearest', smooth; another day scrolls again; closing does not", () => {
    renderMonth();
    expect(scroll).not.toHaveBeenCalled();
    const days = screen.getAllByTestId("vcal-month-day");
    fireEvent.click(days[10]);
    expect(screen.getByTestId("vcal-day-panel")).toBeTruthy();
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledWith({ block: "nearest", behavior: "smooth" });
    expect(scroll.mock.instances[0]).toBe(screen.getByTestId("vcal-day-panel"));

    fireEvent.click(days[11]); // the panel instance is reused for the next day
    expect(scroll).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByTestId("vcal-day-panel-close"));
    expect(screen.queryByTestId("vcal-day-panel")).toBeNull();
    expect(scroll).toHaveBeenCalledTimes(2);
  });

  it("Month: tapping the open day again closes it without scrolling", () => {
    renderMonth();
    const days = screen.getAllByTestId("vcal-month-day");
    fireEvent.click(days[10]);
    fireEvent.click(days[10]);
    expect(screen.queryByTestId("vcal-day-panel")).toBeNull();
    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it("an unrelated re-render does not scroll again", () => {
    const { rerender } = renderMonth();
    fireEvent.click(screen.getAllByTestId("vcal-month-day")[10]);
    expect(scroll).toHaveBeenCalledTimes(1);
    rerender(
      <MemoryRouter>
        <MonthView anchor={NOW} items={[]} now={new Date(NOW.getTime() + 60_000)} onOpen={vi.fn()} onAdd={vi.fn()} />
      </MemoryRouter>,
    );
    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it("Week: the same panel scrolls into view", () => {
    render(
      <MemoryRouter>
        <WeekView anchor={NOW} items={[]} now={NOW} onOpen={vi.fn()} onAdd={vi.fn()} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getAllByTestId("vcal-week-day")[2]);
    expect(screen.getByTestId("vcal-day-panel")).toBeTruthy();
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledWith({ block: "nearest", behavior: "smooth" });
  });

  it("prefers-reduced-motion: no smooth animation", () => {
    reduced = true;
    renderMonth();
    fireEvent.click(screen.getAllByTestId("vcal-month-day")[10]);
    expect(scroll).toHaveBeenCalledWith({ block: "nearest", behavior: "auto" });
  });

  it("the panel keeps clear of the bottom bar and the + button when scrolled", () => {
    renderMonth();
    fireEvent.click(screen.getAllByTestId("vcal-month-day")[10]);
    const cls = screen.getByTestId("vcal-day-panel").className;
    expect(cls).toContain("scroll-mb-36");
    expect(cls).toContain("scroll-mt-4");
  });

  it("without scrollIntoView (older engines) the panel still opens", () => {
    // @ts-expect-error — simulate an engine without it
    delete Element.prototype.scrollIntoView;
    renderMonth();
    fireEvent.click(screen.getAllByTestId("vcal-month-day")[10]);
    expect(screen.getByTestId("vcal-day-panel")).toBeTruthy();
  });
});
