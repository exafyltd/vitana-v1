import { describe, it, expect } from "vitest";
import { visibleToMembers } from "./category-visibility";

describe("visibleToMembers (VTID-04675)", () => {
  const enabled = new Set(["post_like", "new_chat_message"]);
  it("shows an active category with a switched-on type", () => {
    expect(visibleToMembers({ is_active: true, mapped_types: ["post_like", "live_room_starting"] }, enabled)).toBe(true);
  });
  it("hides a category whose types are all switched off", () => {
    expect(visibleToMembers({ is_active: true, mapped_types: ["live_room_starting"] }, enabled)).toBe(false);
  });
  it("hides an inactive category", () => {
    expect(visibleToMembers({ is_active: false, mapped_types: ["post_like"] }, enabled)).toBe(false);
  });
  it("hides a category with no types", () => {
    expect(visibleToMembers({ is_active: true, mapped_types: null }, enabled)).toBe(false);
  });
});
