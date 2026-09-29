import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { orbSurfaceForRoute, orbViewRoleFor, orbViewProfile } from "./orb-view-profile";

describe("VTID-04561 orb view profile — the screen decides which Vitana", () => {
  it("maps routes to surfaces", () => {
    expect(orbSurfaceForRoute("/home")).toBe("vitanaland");
    expect(orbSurfaceForRoute("/admin/dashboard")).toBe("admin");
    expect(orbSurfaceForRoute("/admin")).toBe("admin");
    expect(orbSurfaceForRoute("/administrator")).toBe("vitanaland");
    expect(orbSurfaceForRoute("/backoffice/dashboard")).toBe("backoffice");
    expect(orbSurfaceForRoute("/commerce/org")).toBe("commerce");
    expect(orbSurfaceForRoute("/partner/x")).toBe("commerce");
    expect(orbSurfaceForRoute(null)).toBe("vitanaland");
  });

  it("declares the work role on a work surface whatever the stored role", () => {
    expect(orbViewRoleFor("admin", "community")).toBe("admin");
    expect(orbViewRoleFor("backoffice", "developer")).toBe("backoffice");
  });

  it("declares a member-plane role on member screens; a work role viewing them is community", () => {
    expect(orbViewRoleFor("vitanaland", "patient")).toBe("patient");
    expect(orbViewRoleFor("vitanaland", "staff")).toBe("staff");
    expect(orbViewRoleFor("vitanaland", "developer")).toBe("community");
    expect(orbViewRoleFor("vitanaland", "admin")).toBe("community");
    expect(orbViewRoleFor("vitanaland", null)).toBe("community");
  });

  it("returns both values together", () => {
    expect(orbViewProfile("/admin/users", "community")).toEqual({ surface: "admin", view_role: "admin" });
    expect(orbViewProfile("/home", "professional")).toEqual({ surface: "vitanaland", view_role: "professional" });
  });

  it("the widget hook declares the profile on init, on route change, and on a role switch", () => {
    const src = readFileSync(join(__dirname, "../hooks/useOrbVoiceWidget.ts"), "utf8");
    expect(src).toContain("...orbViewProfile(currentRouteRef.current, currentRoleRef.current)");
    expect(src).toContain("...orbViewProfile(path, currentRoleRef.current)");
    expect(src).toMatch(/orb\.setViewRole\(p\.view_role, p\.surface\)/);
  });
});
