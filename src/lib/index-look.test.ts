/**
 * VTID-04852 — the shared Index look must match the Vitana Index page itself.
 */
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  INDEX_CARD,
  INDEX_EYEBROW,
  INDEX_HERO_CLASS,
  INDEX_HERO_STYLE,
  INDEX_NEXT_UP,
  INDEX_NEXT_UP_CHIP,
  INDEX_NUMBER_STYLE,
  INDEX_PRIMARY_BTN,
  INDEX_SOFT_BTN,
  INDEX_TILE,
} from "./index-look";

const page = fs.readFileSync(path.resolve(__dirname, "../pages/health/VitanaIndexDetail.tsx"), "utf8");

describe("index-look matches the Vitana Index page", () => {
  it("cards and buttons", () => {
    expect(page).toContain(`const CARD = ${JSON.stringify(INDEX_CARD)};`);
    expect(page).toContain(JSON.stringify(INDEX_PRIMARY_BTN));
    expect(page).toContain(JSON.stringify(INDEX_SOFT_BTN));
  });

  it("hero card, eyebrow and number", () => {
    expect(page).toContain(INDEX_HERO_CLASS);
    expect(page).toContain(INDEX_EYEBROW);
    expect(page).toContain(INDEX_HERO_STYLE.backgroundColor as string);
    expect(page).toContain(INDEX_HERO_STYLE.backgroundImage as string);
    expect(page).toContain(INDEX_HERO_STYLE.boxShadow as string);
    expect(page).toContain(INDEX_NUMBER_STYLE.background as string);
  });

  it("icon tile and the next-up box", () => {
    expect(page).toContain(INDEX_TILE);
    expect(page).toContain(INDEX_NEXT_UP);
    expect(page).toContain(INDEX_NEXT_UP_CHIP);
  });
});
