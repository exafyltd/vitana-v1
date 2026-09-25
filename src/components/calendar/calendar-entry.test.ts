/**
 * VTID-04528 — every way into the calendar lands on the /calendar screen.
 *
 * The redesigned calendar shipped at /calendar, but the header button, the
 * mobile drawer button and the `calendar:open` event (voice "open my
 * calendar", deep links) all still opened the old popup, so the new screen
 * could only be reached by typing the URL. Only a request for the reminders
 * list keeps the popup, because the new screen has no reminders list.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { CALENDAR_ROUTE, opensRemindersPopup } from "./calendar-entry";

const src = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("calendar entry (VTID-04528)", () => {
  it("routes to the redesigned screen", () => {
    expect(CALENDAR_ROUTE).toBe("/calendar");
    expect(src("App.tsx")).toContain('<Route path="/calendar"');
  });

  it("keeps the popup only for the reminders list", () => {
    expect(opensRemindersPopup("reminders")).toBe(true);
    expect(opensRemindersPopup(undefined)).toBe(false);
    expect(opensRemindersPopup("agenda")).toBe(false);
    expect(opensRemindersPopup("month")).toBe(false);
  });

  it("the header button navigates instead of opening the popup", () => {
    const s = src("components/UniversalCalendarButton.tsx");
    expect(s).toContain("onClick={() => navigate(CALENDAR_ROUTE)}");
    expect(s).not.toContain("onClick={() => setCalendarOpen(true)}");
    expect(s).toMatch(/opensRemindersPopup\(detail\?\.tab\)[\s\S]*navigate\(CALENDAR_ROUTE\)/);
  });

  it("the mobile drawer button navigates and no longer mounts the popup", () => {
    const s = src("components/mobile/SideDrawerNav.tsx");
    expect(s).toContain("navigate(CALENDAR_ROUTE)");
    expect(s).not.toContain("EnhancedCalendarPopup");
  });

  it("the mobile shell sends calendar:open to the screen, reminders to the popup", () => {
    const s = src("components/mobile/MobileAppShell.tsx");
    expect(s).toMatch(/opensRemindersPopup\(detail\?\.tab\)[\s\S]*navigate\(CALENDAR_ROUTE\)/);
  });
});
