/**
 * desktop-spotlight-finish / colours-batch-2 (VTID-05286 fix-forward) — the
 * shared NotificationBadge (sidebar autopilot/cart counts, NotificationBell,
 * calendar button) rendered `bg-blue-500` on every route that shows a count,
 * which the batch's staging spec reads as a raw palette leak. It now uses the
 * existing status-info token, with primary-foreground text so the count keeps
 * contrast in both the dark sidebar and light surfaces.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotificationBadge } from "@/components/ui/notification-badge";

function rawPaletteClass(el: HTMLElement): string[] {
  return (el.getAttribute("class") ?? "").split(/\s+/).filter((cls) =>
    /(^|:)(bg|text|border|ring|from|via|to)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d/.test(cls),
  );
}

describe("colours-batch-2 › NotificationBadge", () => {
  it("uses the status-info token and no raw palette class", () => {
    render(<NotificationBadge count={3} ariaLabel="3 suggestions" />);
    const badge = screen.getByRole("status");
    expect(badge.className).toContain("bg-status-info");
    expect(badge.className).toContain("text-primary-foreground");
    expect(rawPaletteClass(badge)).toEqual([]);
  });

  it("keeps the same token when collapsed", () => {
    render(<NotificationBadge count={120} collapsed />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("99+");
    expect(rawPaletteClass(badge)).toEqual([]);
  });
});
