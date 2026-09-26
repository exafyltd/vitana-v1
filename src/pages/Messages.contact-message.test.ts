/**
 * VTID-04440 — "Message" on a contact must reach that contact: open the
 * existing direct chat, otherwise open the new-chat dialog with the member
 * already selected (mobile and desktop share one handler).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const page = readFileSync(resolve(__dirname, "Messages.tsx"), "utf8");
const popup = readFileSync(resolve(__dirname, "../components/NewConversationPopup.tsx"), "utf8");

describe("Messages — Message on a contact", () => {
  it("routes both the mobile and the desktop contacts tab through one handler", () => {
    expect(page.match(/onStartConversation=\{handleMessageContact\}/g)).toHaveLength(2);
  });

  it("opens an existing direct chat with the member before offering a new one", () => {
    const body = page.slice(page.indexOf("const handleMessageContact"), page.indexOf("const handleNewConversationOpenChange"));
    expect(body).toMatch(/t\.type === 'direct'/);
    expect(body).toMatch(/setSelectedThreadId\(existing\.id\)/);
    expect(body).toMatch(/setContactRecipientId\(userId\)/);
  });

  it("pre-fills the member in both new-chat dialogs and clears it on close", () => {
    expect(page.match(/initialRecipientId=\{contactRecipientId\}/g)).toHaveLength(2);
    expect(page).toMatch(/if \(!open\) setContactRecipientId\(null\)/);
  });

  it("the dialog selects the pre-filled member when it opens", () => {
    expect(popup).toMatch(/initialRecipientId\?: string \| null/);
    expect(popup).toMatch(/setSelectedRecipients\(\(prev\) =>/);
  });
});
