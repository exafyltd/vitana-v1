/**
 * VTID-04528 — every way into the calendar lands on the /calendar screen.
 * VTID-04915 — the older popup is retired: a request for the reminders list
 * lands on /reminders (inside the app shell), and nothing mounts the popup.
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { CALENDAR_ROUTE, REMINDERS_ROUTE, calendarTargetFor, opensReminders } from "./calendar-entry";

const src = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("calendar entry (VTID-04528, VTID-04915)", () => {
  it("routes to the redesigned screen", () => {
    expect(CALENDAR_ROUTE).toBe("/calendar");
    expect(src("App.tsx")).toContain('<Route path="/calendar"');
  });

  it("sends the reminders list to /reminders and everything else to /calendar", () => {
    expect(REMINDERS_ROUTE).toBe("/reminders");
    expect(opensReminders("reminders")).toBe(true);
    expect(opensReminders(undefined)).toBe(false);
    expect(calendarTargetFor("reminders")).toBe("/reminders");
    expect(calendarTargetFor(undefined)).toBe("/calendar");
    expect(calendarTargetFor("agenda")).toBe("/calendar");
    expect(calendarTargetFor("month")).toBe("/calendar");
  });

  it("the header button navigates, and calendar:open follows calendarTargetFor", () => {
    const s = src("components/UniversalCalendarButton.tsx");
    expect(s).toContain("onClick={() => navigate(CALENDAR_ROUTE)}");
    expect(s).toContain("navigate(calendarTargetFor(detail?.tab))");
  });

  it("the mobile drawer button navigates", () => {
    expect(src("components/mobile/SideDrawerNav.tsx")).toContain("navigate(CALENDAR_ROUTE)");
  });

  it("the mobile shell sends calendar:open through calendarTargetFor", () => {
    expect(src("components/mobile/MobileAppShell.tsx")).toContain("navigate(calendarTargetFor(detail?.tab))");
  });

  it("the older popup is gone and nothing mounts it", () => {
    expect(existsSync(resolve(__dirname, "EnhancedCalendarPopup.tsx"))).toBe(false);
    expect(existsSync(resolve(__dirname, "MobileCalendarModal.tsx"))).toBe(false);
    for (const f of ["components/UniversalCalendarButton.tsx", "components/mobile/MobileAppShell.tsx", "components/mobile/SideDrawerNav.tsx", "pages/Reminders.tsx", "components/AppLayout.tsx"]) {
      expect(src(f)).not.toContain("EnhancedCalendarPopup");
    }
  });

  it("/reminders and the fire deep link render the list inside the app shell; the global overlay handles the fire", () => {
    const page = src("pages/Reminders.tsx");
    expect(page).toContain("<AppLayout>");
    expect(page).toContain("<RemindersPanel />");
    const app = src("App.tsx");
    expect(app).toContain('<Route path="/reminders/fire/:fireId"');
    expect(app).toContain("<ReminderInterruptOverlay />");
  });

  it("a reminder notification opens the entry itself", () => {
    expect(src("App.tsx")).toContain('<Route path="/calendar/entry/:entryId"');
    expect(src("lib/notification-types.ts")).toContain("route: '/calendar/entry/{id}'");
  });
});
