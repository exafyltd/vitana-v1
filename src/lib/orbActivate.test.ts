/**
 * VTID-04951 — "Ask Vitana" from a screen opens the guide with that screen's
 * context, and still opens the ORB when the loaded widget predates startGuide.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { activateOrbGuide } from "./orbActivate";

type W = { VitanaOrb?: Record<string, unknown> };
const ctx = { feature: "calendar_entry", state: "ended" as const, kind: "live_room", title: "Test 10" };

afterEach(() => {
  delete (window as unknown as W).VitanaOrb;
  document.body.innerHTML = "";
});

describe("activateOrbGuide", () => {
  it("hands the context to the widget's startGuide", () => {
    const startGuide = vi.fn();
    (window as unknown as W).VitanaOrb = { startGuide };
    expect(activateOrbGuide(ctx)).toBe(true);
    expect(startGuide).toHaveBeenCalledWith(ctx);
  });

  it("falls back to a plain open when the widget has no startGuide", () => {
    const fab = document.createElement("button");
    fab.className = "vtorb-fab";
    const click = vi.fn();
    fab.addEventListener("click", click);
    document.body.appendChild(fab);
    (window as unknown as W).VitanaOrb = {};
    expect(activateOrbGuide(ctx)).toBe(true);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("reports false when there is no widget at all", () => {
    expect(activateOrbGuide(ctx)).toBe(false);
  });
});
