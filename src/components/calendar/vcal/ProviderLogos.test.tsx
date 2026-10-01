/**
 * VTID-04756 — the connect card shows each calendar app's own icon, not a letter.
 */
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarProviderLogo } from "./ProviderLogos";

describe("calendar app icons", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-30T10:00:00"));
  });
  afterEach(() => vi.useRealTimers());

  it("Google is the Google Calendar icon, drawn from its four colours", () => {
    const { container } = render(<CalendarProviderLogo p="google" size={44} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("44");
    const fills = Array.from(svg.querySelectorAll("[fill]")).map((n) => n.getAttribute("fill"));
    for (const c of ["#1e88e5", "#e53935", "#fbc02d", "#4caf50"]) expect(fills).toContain(c);
  });

  it("Apple shows today's weekday and date, like the real icon", () => {
    const { container } = render(<CalendarProviderLogo p="apple" size={44} />);
    expect(container.textContent).toMatch(/30/);
    expect(container.textContent).toMatch(/[A-ZÄÖÜ]{2,}/);
  });

  it("Outlook is the blue tile with the white O in front of the envelope", () => {
    const { container } = render(<CalendarProviderLogo p="outlook" size={44} />);
    const svg = container.querySelector("svg")!;
    expect(svg.querySelector("circle")?.getAttribute("stroke")).toBe("#fff");
    expect(svg.querySelectorAll("rect").length).toBeGreaterThanOrEqual(2);
  });

  it("none of them is a bare letter badge or readable by a screen reader on its own", () => {
    for (const p of ["google", "apple", "outlook"] as const) {
      const { container } = render(<CalendarProviderLogo p={p} />);
      expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
      expect(container.textContent).not.toMatch(/^[GAO]$/);
    }
  });
});
