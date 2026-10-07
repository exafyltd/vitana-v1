/**
 * VTID-04926 — owner report 2026-10-06: typing "@stefan" in the "Alle
 * Beisammen" group chat did nothing. The composer now offers the group's
 * members, Enter picks a suggestion instead of sending, and the tagged member
 * travels with the message as contentData.mentions.
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
// Group chat never searches the community — it filters its own roster.
const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined, isLoading: false, fetchStatus: "idle" }),
}));

import MessageInput from "./MessageInput";

const ROSTER = [
  { user_id: "u-stefan", display_name: "Stefan Ehlke", avatar_url: null },
  { user_id: "u-michael", display_name: "Michael Lottmann", avatar_url: null },
];

function setup(props: Partial<React.ComponentProps<typeof MessageInput>> = {}) {
  const onSendMessage = vi.fn().mockResolvedValue(undefined);
  render(
    <MessageInput
      onSendMessage={onSendMessage}
      threadId="g1"
      activeThread={{ id: "g1", type: "group" }}
      conversationType="group"
      mentionCandidates={ROSTER}
      {...props}
    />,
  );
  const box = screen.getByLabelText("screens.messages.messageComposer") as HTMLTextAreaElement;
  const type = (value: string) => {
    fireEvent.change(box, { target: { value, selectionStart: value.length, selectionEnd: value.length } });
  };
  return { onSendMessage, box, type };
}

describe("group chat @mentions (VTID-04926)", () => {
  beforeEach(() => {
    rpc.mockReset();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  it("suggests the matching group member for '@stefan'", () => {
    const { type } = setup();
    type("@stefan");
    const options = screen.getAllByTestId("mention-suggestion");
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain("Stefan Ehlke");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("Enter picks the suggestion instead of sending, then sends with the tag", async () => {
    const { type, box, onSendMessage } = setup();
    type("Hallo @ste");
    fireEvent.keyDown(box, { key: "Enter" });
    fireEvent.keyPress(box, { key: "Enter", charCode: 13 });
    expect(onSendMessage).not.toHaveBeenCalled();
    expect(box.value).toBe("Hallo @Stefan Ehlke ");
    expect(screen.queryByTestId("mention-suggestions")).toBeNull();

    type("Hallo @Stefan Ehlke schön!");
    await act(async () => {
      fireEvent.submit(box.closest("form")!);
    });
    expect(onSendMessage).toHaveBeenCalledWith(
      "Hallo @Stefan Ehlke schön!",
      "text",
      { mentions: [{ user_id: "u-stefan", display_name: "Stefan Ehlke" }] },
      undefined,
      undefined,
    );
  });

  it("tapping a suggestion inserts the name", () => {
    const { type, box } = setup();
    type("@mich");
    fireEvent.click(screen.getByTestId("mention-suggestion"));
    expect(box.value).toBe("@Michael Lottmann ");
  });

  it("a tag whose name was deleted again is not sent", async () => {
    const { type, box, onSendMessage } = setup();
    type("@ste");
    fireEvent.click(screen.getByTestId("mention-suggestion"));
    type("doch nicht");
    await act(async () => {
      fireEvent.submit(box.closest("form")!);
    });
    expect(onSendMessage).toHaveBeenCalledWith("doch nicht", "text", null, undefined, undefined);
  });

  it("Enter still sends when '@word' matches nobody", async () => {
    const { type, box, onSendMessage } = setup();
    type("Ich bin @home");
    expect(screen.getByTestId("mention-suggestions").textContent).toContain("profilePosts.noPeopleFound");
    await act(async () => {
      fireEvent.keyDown(box, { key: "Enter" });
      fireEvent.keyPress(box, { key: "Enter", charCode: 13 });
    });
    expect(onSendMessage).toHaveBeenCalledWith("Ich bin @home", "text", null, undefined, undefined);
  });

  it("Escape closes the list", () => {
    const { type, box } = setup();
    type("@ste");
    fireEvent.keyDown(box, { key: "Escape" });
    expect(screen.queryByTestId("mention-suggestions")).toBeNull();
  });

  it("is off when no mentionCandidates are passed (direct messages)", () => {
    const { type } = setup({ mentionCandidates: undefined });
    type("@ste");
    expect(screen.queryByTestId("mention-suggestions")).toBeNull();
  });
});
