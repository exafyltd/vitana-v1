import { describe, expect, it } from "vitest";
import { displayHandle, isDisplayableHandle, normalizeHandle } from "./handle-display";

describe("handle-display (VTID-03978)", () => {
  it("shows a real handle, with any leading @ stripped", () => {
    expect(displayHandle("jovana4")).toBe("jovana4");
    expect(displayHandle("@jovana4")).toBe("jovana4");
    expect(displayHandle("  @jovana4 ")).toBe("jovana4");
    expect(isDisplayableHandle("jovana4")).toBe(true);
  });

  it("never shows an auth user id (the /u/:identifier routing fallback) as a handle", () => {
    // The exact shape members saw as "@c7d3260d-…" on the identity card.
    const uuid = "c7d3260d-8311-4a0b-ab1c-53928a37caec";
    expect(isDisplayableHandle(uuid)).toBe(false);
    expect(isDisplayableHandle(uuid.toUpperCase())).toBe(false);
    expect(isDisplayableHandle(`@${uuid}`)).toBe(false);
    expect(displayHandle(uuid)).toBeUndefined();
  });

  it("treats empty, blank, null and undefined as nothing to show", () => {
    expect(displayHandle("")).toBeUndefined();
    expect(displayHandle("   ")).toBeUndefined();
    expect(displayHandle("@")).toBeUndefined();
    expect(displayHandle(null)).toBeUndefined();
    expect(displayHandle(undefined)).toBeUndefined();
    expect(normalizeHandle(undefined)).toBe("");
  });

  it("does not misclassify handles that merely contain hex or dashes", () => {
    expect(isDisplayableHandle("dead-beef")).toBe(true);
    expect(isDisplayableHandle("user-2026")).toBe(true);
    expect(isDisplayableHandle("abcdef12")).toBe(true);
  });
});
