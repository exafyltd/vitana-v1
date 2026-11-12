/**
 * The web message composer auto-resizes with its content. A group composer
 * stays on one row (one 24px line plus the textarea's 16px vertical padding);
 * a direct chat keeps its 6-row limit. JSDOM does not lay out text, so the
 * textarea's scrollHeight is stubbed to the height of a long wrapped message
 * (seven lines plus padding) and the resulting inline height is checked.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

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

/** Seven wrapped lines of 24px plus the 16px padding: what a long typed message reports. */
const LONG_MESSAGE_SCROLL_HEIGHT = 7 * 24 + 16;

const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");

beforeEach(() => {
  Object.defineProperty(HTMLTextAreaElement.prototype, "scrollHeight", {
    configurable: true,
    get: () => LONG_MESSAGE_SCROLL_HEIGHT,
  });
});

afterEach(() => {
  if (originalDescriptor) Object.defineProperty(HTMLElement.prototype, "scrollHeight", originalDescriptor);
  else delete (HTMLTextAreaElement.prototype as unknown as Record<string, unknown>).scrollHeight;
  document.documentElement.style.removeProperty("--composer-h");
});

function renderComposer(conversationType: "group" | "direct") {
  const { container } = render(
    <MessageInput
      onSendMessage={vi.fn().mockResolvedValue(undefined)}
      threadId="t1"
      activeThread={{ id: "t1", type: conversationType }}
      conversationType={conversationType}
    />,
  );
  const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
  expect(textarea).not.toBeNull();
  return textarea;
}

describe("composer row limit", () => {
  it("a group composer stays one row (40px box, scrolls inside) however long the message", () => {
    const textarea = renderComposer("group");
    expect(textarea.style.height).toBe("40px");
    expect(textarea.style.overflowY).toBe("auto");
    expect(document.documentElement.style.getPropertyValue("--composer-h")).toBe("72px");
  });

  it("a direct composer still grows to six rows (144px box)", () => {
    const textarea = renderComposer("direct");
    expect(textarea.style.height).toBe("144px");
    expect(textarea.style.overflowY).toBe("auto");
    expect(document.documentElement.style.getPropertyValue("--composer-h")).toBe("176px");
  });
});
