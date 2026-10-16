/**
 * VTID-05206 — the migration and the texts.
 * Migration: existing members false, members registering afterwards true, no
 * backfill, no policy/grant/trigger change, passes the PR-GATE lint. Its real
 * behaviour on Postgres is proven on PGlite: docs/validation/VTID-05206/
 * outputs/pglite-community-intro-check.txt.
 * Texts: every locale carries the five keys.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { lintMigration } from "../../scripts/ci/pr-gate/lib.mjs";

const ROOT = join(__dirname, "../..");
const sql = readFileSync(join(ROOT, "supabase/migrations/20261016110000_vtid_05206_community_intro_opt_in.sql"), "utf8");
const code = sql.replace(/--[^\n]*/g, "");
const body = code.replace(/\$\$[\s\S]*?\$\$/g, "$$body$$");

describe("VTID-05206 migration", () => {
  it("passes the PR-GATE migration lint (one transaction, idempotent)", () => {
    expect(lintMigration(sql)).toEqual([]);
  });

  it("existing rows get false, then the default becomes true — in that order", () => {
    const add = body.search(/ADD COLUMN IF NOT EXISTS community_intro_opt_in boolean NOT NULL DEFAULT false/);
    const setDefault = body.search(/ALTER COLUMN community_intro_opt_in SET DEFAULT true/);
    expect(add).toBeGreaterThan(-1);
    expect(setDefault).toBeGreaterThan(add);
  });

  it("writes no rows and changes no policy, grant, trigger, replica identity or publication", () => {
    expect(body).not.toMatch(/\b(INSERT INTO|UPDATE\s+public\.|DELETE FROM)\b/i);
    expect(body).not.toMatch(/\b(CREATE|DROP|ALTER)\s+POLICY\b/i);
    expect(body).not.toMatch(/\b(GRANT|REVOKE)\b/i);
    expect(body).not.toMatch(/\bTRIGGER\b/i);
    expect(body).not.toMatch(/REPLICA IDENTITY|ALTER PUBLICATION/i);
  });

  it("checks itself: column, replica identity, realtime publication, owner policy", () => {
    expect(code).toMatch(/column_default = 'true'/);
    expect(code).toMatch(/relreplident FROM pg_class/);
    expect(code).toMatch(/pg_publication_tables/);
    expect(code).toMatch(/Users can manage their own global profile/);
  });
});

describe("VTID-05206 texts", () => {
  const LOCALES = readdirSync(join(ROOT, "src/i18n")).filter((d) => /^[a-z]{2}$/.test(d));
  const read = (lc: string, shard: string) => JSON.parse(readFileSync(join(ROOT, "src/i18n", lc, `${shard}.json`), "utf8"));
  const SETTINGS = ["communityIntroTitle", "communityIntroBody", "communityIntroSaveFailed"];
  const NAMEFORM = ["communityIntroLabel", "communityIntroHint"];

  it("covers all 11 locales", () => {
    expect(LOCALES.sort()).toEqual(["ar", "de", "en", "es", "fr", "pl", "pt", "ru", "sr", "tr", "zh"]);
  });

  it.each(["ar", "de", "en", "es", "fr", "pl", "pt", "ru", "sr", "tr", "zh"])("%s has every key, non-empty", (lc) => {
    const settings = read(lc, "screens").screens.settings;
    const nameForm = read(lc, "onboarding").onboarding.nameForm;
    for (const k of SETTINGS) expect(typeof settings[k] === "string" && settings[k].trim().length > 0, `${lc} screens.settings.${k}`).toBe(true);
    for (const k of NAMEFORM) expect(typeof nameForm[k] === "string" && nameForm[k].trim().length > 0, `${lc} onboarding.nameForm.${k}`).toBe(true);
  });

  it("non-German locales are translated (not the German source)", () => {
    const de = read("de", "screens").screens.settings.communityIntroBody;
    for (const lc of LOCALES.filter((l) => l !== "de")) {
      expect(read(lc, "screens").screens.settings.communityIntroBody, lc).not.toBe(de);
    }
  });

  it("the German text uses du, never Sie", () => {
    const de = [
      ...SETTINGS.map((k) => read("de", "screens").screens.settings[k]),
      ...NAMEFORM.map((k) => read("de", "onboarding").onboarding.nameForm[k]),
    ].join(" ");
    expect(de).toMatch(/\b(du|dir|dich|deine?)\b/i);
    expect(de).not.toMatch(/\b(Sie|Ihnen|Ihre?)\b/);
  });
});
