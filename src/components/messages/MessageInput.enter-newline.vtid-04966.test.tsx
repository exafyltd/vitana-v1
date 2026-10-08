/**
 * VTID-04966 — owner request 2026-10-07: pressing Enter in the Messenger sent
 * the message. Enter (and Shift+Enter) now make a new line; only the send
 * button sends. An Enter that picks an @mention suggestion still picks it and
 * adds no line (VTID-04926).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

vi.mock("@/hooks/useHybridMessages", () => ({ useHybridMessages: () => ({}) }));
vi.mock("@/hooks/useRole", () => ({ useRole: () => ({ currentRole: "community" }) }));
vi.mock("@/hooks/useTenant", () => ({ useTenant: () => ({ activeTenantId: "t1" }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/context/AuthProvider", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
vi.mock("@/lib/i18n-toast", () => ({ t: (k: string) => k, notifyError: vi.fn() }));
vi.mock("@/components/ui/emoji-picker", () => ({ EmojiPicker: () => null }));
vi.mock("@/components/ui/voice-recorder", () => ({ VoiceRecorder: () => null }));
vi.mock("@/components/messages/AttachmentMenu", () => ({ AttachmentMenu: () => null }));
vi.mock("@/components/messages/ReplyPreview", () => ({ ReplyPreview: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn() } }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined, isLoading: false, fetchStatus: "idle" }),
}));

import MessageInput from "./MessageInput";

function setup(withMentions = false) {
  const onSendMessage = vi.fn().mockResolvedValue(undefined);
  render(
    <MessageInput
      onSendMessage={onSendMessage}
      threadId="g1"
      activeThread={{ id: "g1", type: "group" }}
      conversationType="group"
      mentionCandidates={withMentions ? [{ user_id: "u-stefan", display_name: "Stefan Ehlke", avatar_url: null }] : undefined}
    />,
  );
  const box = screen.getByLabelText("screens.messages.messageComposer") as HTMLTextAreaElement;
  const type = (value: string) =>
    fireEvent.change(box, { target: { value, selectionStart: value.length, selectionEnd: value.length } });
  /** Fires Enter like a keyboard; returns whether the browser may insert the newline. */
  const enter = async (shiftKey = false) => {
    let down = true;
    let press = true;
    await act(async () => {
      down = fireEvent.keyDown(box, { key: "Enter", shiftKey });
      press = fireEvent.keyPress(box, { key: "Enter", charCode: 13, shiftKey });
    });
    return down && press;
  };
  return { onSendMessage, box, type, enter };
}

describe("Messenger composer: Enter makes a new line (VTID-04966)", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  it("Enter does not send and lets the newline through", async () => {
    const { type, enter, onSendMessage } = setup();
    type("Zeile eins");
    expect(await enter()).toBe(true);
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it("Shift+Enter does not send either", async () => {
    const { type, enter, onSendMessage } = setup();
    type("Zeile eins");
    expect(await enter(true)).toBe(true);
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it("the send button sends the whole multi-line text", async () => {
    const { type, box, onSendMessage } = setup();
    type("Zeile eins\nZeile zwei");
    await act(async () => {
      fireEvent.click(screen.getByLabelText("screens.messages.sendMessage"));
    });
    expect(box.closest("form")).not.toBeNull();
    expect(onSendMessage).toHaveBeenCalledWith("Zeile eins\nZeile zwei", "text", null, undefined, undefined);
  });

  it("Enter on an open @mention list picks the name, adds no line, sends nothing", async () => {
    const { type, box, enter, onSendMessage } = setup(true);
    type("Hallo @ste");
    expect(await enter()).toBe(false);
    expect(box.value).toBe("Hallo @Stefan Ehlke ");
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it("tells phone keyboards the return key makes a new line", () => {
    const { box } = setup();
    expect(box.getAttribute("enterkeyhint")).toBe("enter");
  });
});
