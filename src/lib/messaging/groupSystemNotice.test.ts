// VTID-04955 — group notices never show an email and render from i18n.
import { describe, it, expect } from "vitest";
import { describeGroupNotice, noticeName } from "./groupSystemNotice";

// Minimal t(): returns "key|param=value,…" so tests see key and params.
const t = (key: string, p?: Record<string, string | number>) =>
  key === "screens.messages.groupNoticeSomeone" ? "Someone" : `${key}|${Object.entries(p ?? {}).map(([k, v]) => `${k}=${v}`).join(",")}`;

describe("describeGroupNotice", () => {
  it("renders the owner's existing notice (email in body, no actor_name) with the sender's name", () => {
    const out = describeGroupNotice(
      {
        body: "dstevanovic@hotmail.com created the group",
        content_data: { system_type: "group_created", group_name: "Husam Katiela, Stefan Ehlke", created_by: "u1" },
        sender: { display_name: "Dragan" },
      },
      t,
    );
    expect(out).toBe("screens.messages.groupNoticeCreated|name=Dragan,member=Someone,group=Husam Katiela, Stefan Ehlke");
    expect(out).not.toContain("@");
  });

  it("never shows an email even when every name source is one", () => {
    const out = describeGroupNotice(
      { body: "a@b.c removed x", content_data: { system_type: "member_removed", actor_name: "a@b.c", removed_user_name: "x@y.z" }, sender: { display_name: "a@b.c" } },
      t,
    )!;
    expect(out).not.toContain("@");
    expect(out).toContain("name=Someone");
    expect(out).toContain("member=Someone");
  });

  it("maps every known type to its key with names", () => {
    const cases: Array<[string, Record<string, string>, string]> = [
      ["member_added", { actor_name: "A", added_user_name: "B" }, "groupNoticeMemberAdded|name=A,member=B"],
      ["member_removed", { actor_name: "A", removed_user_name: "B" }, "groupNoticeMemberRemoved|name=A,member=B"],
      ["member_left", { left_user_name: "C" }, "groupNoticeMemberLeft|name=C"],
      ["group_renamed", { actor_name: "A", group_name: "Lauftreff" }, "groupNoticeRenamed|name=A,member=Someone,group=Lauftreff"],
    ];
    for (const [type, cd, expected] of cases) {
      expect(describeGroupNotice({ content_data: { system_type: type, ...cd } }, t)).toContain(`screens.messages.${expected}`);
    }
  });

  it("returns null for unknown or missing types so the caller shows the body", () => {
    expect(describeGroupNotice({ body: "x", content_data: { system_type: "something_else" } }, t)).toBeNull();
    expect(describeGroupNotice({ body: "x" }, t)).toBeNull();
  });
});

describe("noticeName", () => {
  it("prefers display_name, falls back to full_name, drops email-shaped values", () => {
    expect(noticeName({ display_name: "D", full_name: "F" })).toBe("D");
    expect(noticeName({ full_name: "F" })).toBe("F");
    expect(noticeName({ display_name: "me@x.io" })).toBe("");
    expect(noticeName(null)).toBe("");
  });
});
