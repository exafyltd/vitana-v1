import { describe, expect, it } from "vitest";
import { buildOrbScreenContext } from "./orbScreenContext";

describe("buildOrbScreenContext (VTID-04425)", () => {
  it("keeps the view params, the UI language and the page title", () => {
    expect(buildOrbScreenContext("?tab=events&view=list&q=hello", "  MAXINA  –  Community ", "de")).toEqual({
      screen_title: "MAXINA – Community",
      app_state: { tab: "events", view: "list", ui_lang: "de" },
    });
  });

  it("never forwards free text or unknown params", () => {
    const r = buildOrbScreenContext("?tab=a%20b&q=secret&email=a@b.c&step=<x>", "", "not a lang");
    expect(r).toEqual({ app_state: {} });
  });

  it("bounds the title", () => {
    expect(buildOrbScreenContext("", "x".repeat(300), undefined).screen_title).toHaveLength(120);
  });
});
