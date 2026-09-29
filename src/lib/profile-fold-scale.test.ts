import { describe, it, expect } from "vitest";
import { cardScale, headerScale, lerpPx } from "./profile-fold-scale";

describe("profile fold scale (VTID-04526)", () => {
  it("header grows from short to tall phones and stays bounded", () => {
    expect(headerScale(600)).toBe(0);
    expect(headerScale(667)).toBe(0);
    expect(headerScale(900)).toBe(1);
    expect(headerScale(1200)).toBe(1);
    expect(headerScale(783.5)).toBeCloseTo(0.5, 2);
  });

  it("card grows with the height it actually has", () => {
    expect(cardScale(undefined)).toBe(0);
    expect(cardScale(280)).toBe(0);
    expect(cardScale(380)).toBeCloseTo(0.5, 2);
    expect(cardScale(600)).toBe(1);
    expect(cardScale(Number.NaN)).toBe(0);
  });

  it("emits a calc() the browser interpolates", () => {
    expect(lerpPx(64, 100, "--ix")).toBe("calc(64px + 36px * var(--ix, 0))");
  });
});
