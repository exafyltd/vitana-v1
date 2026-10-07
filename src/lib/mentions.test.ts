/**
 * VTID-04926 — the shared @mention engine (group chat, posts, comments).
 */
import { describe, it, expect } from "vitest";
import {
  addMention,
  filterLocalCandidates,
  findActiveMentionToken,
  insertMention,
  isPickedMentionToken,
  pruneMentions,
  shouldKeepOpen,
  splitMentionSegments,
} from "./mentions";

const STEFAN = { user_id: "u-stefan", display_name: "Stefan Ehlke" };
const ANNA = { user_id: "u-anna", display_name: "Anna" };

const at = (text: string) => findActiveMentionToken(text, text.length);

describe("findActiveMentionToken", () => {
  it("finds the token the caret is in (the owner's screenshot: '@stefan')", () => {
    expect(at("@stefan")).toEqual({ query: "stefan", start: 0 });
    expect(at("Hallo @ste")).toEqual({ query: "ste", start: 6 });
  });

  it("opens on a bare '@' with an empty query", () => {
    expect(at("Hi @")).toEqual({ query: "", start: 3 });
  });

  it("triggers after emoji and punctuation, never inside an e-mail address", () => {
    expect(at("😊@an")).toEqual({ query: "an", start: 2 });
    expect(at("(@an")).toEqual({ query: "an", start: 1 });
    expect(at("anna@example")).toBeNull();
  });

  it("keeps ONE inner space for two-word names, ends on the second", () => {
    expect(at("@Stefan Eh")).toEqual({ query: "Stefan Eh", start: 0 });
    expect(at("@Stefan Ehlke war")).toBeNull();
  });

  it("ends on a newline and after 40 characters", () => {
    expect(at("@ste\nhallo")).toBeNull();
    expect(at(`@${"a".repeat(41)}`)).toBeNull();
  });

  it("does not start a token on '@ ' (at sign followed by a space)", () => {
    expect(at("@ ste")).toBeNull();
  });

  it("works on right-to-left text (logical order)", () => {
    expect(at("مرحبا @سار")).toEqual({ query: "سار", start: 6 });
  });

  it("reads the caret position, not the end of the text", () => {
    const text = "@an und mehr";
    expect(findActiveMentionToken(text, 3)).toEqual({ query: "an", start: 0 });
  });
});

describe("shouldKeepOpen", () => {
  it("stays open while typing a single word, even with no match yet", () => {
    expect(shouldKeepOpen({ query: "xy", start: 0 }, 0, false)).toBe(true);
  });
  it("closes when a spaced query matches nobody ('@Stefan hallo')", () => {
    expect(shouldKeepOpen({ query: "Stefan hallo", start: 0 }, 0, false)).toBe(false);
    expect(shouldKeepOpen({ query: "Stefan Eh", start: 0 }, 1, false)).toBe(true);
    expect(shouldKeepOpen({ query: "Stefan h", start: 0 }, 0, true)).toBe(true);
  });
  it("is closed for no token or an empty query", () => {
    expect(shouldKeepOpen(null, 3, false)).toBe(false);
    expect(shouldKeepOpen({ query: "", start: 0 }, 3, false)).toBe(false);
  });
});

describe("insertMention / isPickedMentionToken", () => {
  it("replaces the token with '@Name ' and puts the caret after it", () => {
    const text = "Hallo @ste";
    const token = at(text)!;
    expect(insertMention(text, token, text.length, STEFAN)).toEqual({ text: "Hallo @Stefan Ehlke ", caret: 20 });
  });

  it("keeps the text after the caret and does not double a space", () => {
    const text = "Hallo @ste wie geht's";
    const token = findActiveMentionToken(text, 10)!;
    expect(insertMention(text, token, 10, STEFAN).text).toBe("Hallo @Stefan Ehlke wie geht's");
  });

  it("does not re-open the picker right after a pick", () => {
    const picked = "@Anna ";
    expect(isPickedMentionToken(at(picked)!, [ANNA])).toBe(true);
    expect(isPickedMentionToken({ query: "Ann", start: 0 }, [ANNA])).toBe(false);
  });

  it("addMention dedupes by user id", () => {
    expect(addMention([ANNA], ANNA)).toEqual([ANNA]);
    expect(addMention([ANNA], STEFAN)).toEqual([ANNA, STEFAN]);
  });
});

describe("pruneMentions", () => {
  it("drops a member whose name was deleted from the text (no push for a removed tag)", () => {
    expect(pruneMentions("Danke @Anna!", [ANNA, STEFAN])).toEqual([ANNA]);
  });
  it("drops malformed entries and duplicates", () => {
    const junk = [null, { user_id: "", display_name: "X" }, { user_id: "u", display_name: "" }, ANNA, ANNA] as never;
    expect(pruneMentions("@Anna", junk)).toEqual([ANNA]);
  });
  it("handles no mentions", () => {
    expect(pruneMentions("hi", undefined)).toEqual([]);
  });
});

describe("splitMentionSegments", () => {
  it("links each tagged name, longest name first", () => {
    const segs = splitMentionSegments("Hi @Stefan Ehlke und @Anna!", [ANNA, STEFAN]);
    expect(segs).toEqual([
      { type: "text", text: "Hi " },
      { type: "mention", text: "@Stefan Ehlke", mention: STEFAN },
      { type: "text", text: " und " },
      { type: "mention", text: "@Anna", mention: ANNA },
      { type: "text", text: "!" },
    ]);
  });

  it("never links a name inside a longer word ('@Annabel' is not '@Anna')", () => {
    expect(splitMentionSegments("@Annabel", [ANNA])).toEqual([{ type: "text", text: "@Annabel" }]);
  });

  it("returns plain text when nobody is tagged", () => {
    expect(splitMentionSegments("@Anna", [])).toEqual([{ type: "text", text: "@Anna" }]);
    expect(splitMentionSegments("", [ANNA])).toEqual([]);
  });
});

describe("filterLocalCandidates (group roster)", () => {
  const roster = [
    { user_id: "1", display_name: "Stefan Ehlke", avatar_url: null },
    { user_id: "2", display_name: "Michael Lottmann", avatar_url: null },
    { user_id: "3", display_name: "Jürgen Stefani", avatar_url: null },
    { user_id: "4", display_name: "Zoë", avatar_url: null },
  ];
  it("matches the start of the name first, then the start of any word", () => {
    expect(filterLocalCandidates(roster, "stef").map((c) => c.user_id)).toEqual(["1", "3"]);
    expect(filterLocalCandidates(roster, "lott").map((c) => c.user_id)).toEqual(["2"]);
  });
  it("is case- and accent-insensitive", () => {
    expect(filterLocalCandidates(roster, "jurg").map((c) => c.user_id)).toEqual(["3"]);
    expect(filterLocalCandidates(roster, "zoe").map((c) => c.user_id)).toEqual(["4"]);
  });
  it("supports the two-word query", () => {
    expect(filterLocalCandidates(roster, "Stefan Eh").map((c) => c.user_id)).toEqual(["1"]);
  });
  it("returns nothing for an empty query and respects the limit", () => {
    expect(filterLocalCandidates(roster, " ")).toEqual([]);
    expect(filterLocalCandidates(roster, "s", 1)).toHaveLength(1);
  });
});
