import { describe, expect, it } from "vitest";
import { profilePath } from "./profile-path";

describe("profilePath (VTID-04992)", () => {
  it("uses the handle when there is one", () => {
    expect(profilePath("123e4567-e89b-12d3-a456-426614174000", "maria")).toBe("/u/maria");
  });
  it("falls back to the id", () => {
    expect(profilePath("123e4567-e89b-12d3-a456-426614174000")).toBe("/u/123e4567-e89b-12d3-a456-426614174000");
  });
  it("gives nothing when there is no id and no handle", () => {
    expect(profilePath()).toBeNull();
    expect(profilePath(null, "  ")).toBeNull();
  });
  it("encodes characters that would break the path", () => {
    expect(profilePath(undefined, "a/b")).toBe("/u/a%2Fb");
  });
});
