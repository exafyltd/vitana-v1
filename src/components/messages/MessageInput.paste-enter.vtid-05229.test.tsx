/**
 * VTID-05229 — owner request 2026-10-16: paste a screenshot straight into the
 * Messenger composer (no save + upload), and send with Enter.
 *
 * - Desktop (fine pointer + hover): Enter sends, Shift+Enter makes a new line,
 *   Enter never adds a blank line, never sends during IME composition.
 * - Touch-first devices: unchanged from VTID-04966 (Enter = new line).
 * - Paste: clipboard files without plain text upload like the paperclip;
 *   text on the clipboard wins.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

vi.mock("@/hooks/useHybridMessages", () => ({ useHybridMessages: () => ({}) }));
vi.mock("@/hooks/useRole", () => ({ useRole: () => ({ currentRole: "community" }) }));
vi.mock("@/hooks/useTenant", () => ({ useTenant: () => ({ activeTenantId: "t1" }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/context/AuthProvider", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
const notifyError = vi.fn();
vi.mock("@/lib/i18n-toast", () => ({ t: (k: string) => k, notifyError: (...a: unknown[]) => notifyError(...a) }));
vi.mock("@/components/ui/emoji-picker", () => ({ EmojiPicker: () => null }));
vi.mock("@/components/ui/voice-recorder", () => ({ VoiceRecorder: () => null }));
vi.mock("@/components/messages/AttachmentMenu", () => ({ AttachmentMenu: () => null }));
vi.mock("@/components/messages/ReplyPreview", () => ({ ReplyPreview: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn() } }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined, isLoading: false, fetchStatus: "idle" }),
}));
const uploadChatAttachment = vi.fn();
vi.mock("@/lib/fileUpload", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/fileUpload")>();
  return { ...real, uploadChatAttachment: (...a: unknown[]) => uploadChatAttachment(...a) };
});

import MessageInput from "./MessageInput";

const DESKTOP = "(hover: hover) and (pointer: fine)";

/** Pretend to be a desktop (fine pointer + hover) or a touch-first device. */
function device(kind: "desktop" | "touch") {
  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
    matches: kind === "desktop" && query === DESKTOP,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }) as unknown as MediaQueryList);
}

function setup(props: Partial<React.ComponentProps<typeof MessageInput>> = {}) {
  const onSendMessage = vi.fn().mockResolvedValue(undefined);
  render(
    <MessageInput
      onSendMessage={onSendMessage}
      threadId="g1"
      activeThread={{ id: "g1", type: "group" }}
      conversationType="group"
      {...props}
    />,
  );
  const box = screen.getByLabelText("screens.messages.messageComposer") as HTMLTextAreaElement;
  const type = (value: string) =>
    fireEvent.change(box, { target: { value, selectionStart: value.length, selectionEnd: value.length } });
  /** Fires Enter like a keyboard; returns whether the browser may insert the newline. */
  const enter = async (init: Partial<KeyboardEventInit> & { isComposing?: boolean; keyCode?: number } = {}) => {
    let down = true;
    let press = true;
    await act(async () => {
      down = fireEvent.keyDown(box, { key: "Enter", ...init });
      press = fireEvent.keyPress(box, { key: "Enter", charCode: 13, ...init });
    });
    return down && press;
  };
  return { onSendMessage, box, type, enter };
}

function clipboard({ files = [] as File[], text = "", itemsOnly = false } = {}) {
  return {
    files: itemsOnly ? [] : files,
    items: files.map((f) => ({ kind: "file", type: f.type, getAsFile: () => f })),
    getData: (format: string) => (format === "text/plain" ? text : ""),
    types: [...(text ? ["text/plain"] : []), ...(files.length ? ["Files"] : [])],
  };
}

const png = (name = "image.png") => new File([new Uint8Array([137, 80, 78, 71])], name, { type: "image/png" });

describe("Messenger composer: Enter on desktop (VTID-05229)", () => {
  beforeEach(() => {
    device("desktop");
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  it("Enter sends the message once and adds no line", async () => {
    const { type, enter, box, onSendMessage } = setup();
    type("Hallo");
    expect(await enter()).toBe(false);
    expect(onSendMessage).toHaveBeenCalledTimes(1);
    expect(onSendMessage).toHaveBeenCalledWith("Hallo", "text", null, undefined, undefined);
    expect(box.value).toBe("");
  });

  it("a fast double Enter still sends only once", async () => {
    const { type, box, onSendMessage } = setup();
    type("Hallo");
    await act(async () => {
      fireEvent.keyDown(box, { key: "Enter" });
      fireEvent.keyDown(box, { key: "Enter" });
    });
    expect(onSendMessage).toHaveBeenCalledTimes(1);
  });

  it("Shift+Enter makes a new line and sends nothing", async () => {
    const { type, enter, onSendMessage } = setup();
    type("Zeile eins");
    expect(await enter({ shiftKey: true })).toBe(true);
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it("Enter in an empty box does nothing and adds no blank line", async () => {
    const { enter, onSendMessage } = setup();
    expect(await enter()).toBe(false);
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it("Enter during IME composition does not send", async () => {
    const { type, enter, onSendMessage } = setup();
    type("にほんご");
    expect(await enter({ isComposing: true })).toBe(true);
    expect(await enter({ keyCode: 229 })).toBe(true);
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it("Enter on an open @mention list picks the name and sends nothing", async () => {
    const { type, box, enter, onSendMessage } = setup({
      mentionCandidates: [{ user_id: "u-stefan", display_name: "Stefan Ehlke", avatar_url: null }],
    });
    type("Hallo @ste");
    expect(await enter()).toBe(false);
    expect(box.value).toBe("Hallo @Stefan Ehlke ");
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it("tells the keyboard that Enter sends", () => {
    const { box } = setup();
    expect(box.getAttribute("enterkeyhint")).toBe("send");
  });
});

describe("Messenger composer: Enter on touch devices is unchanged (VTID-04966)", () => {
  beforeEach(() => device("touch"));

  it("Enter makes a new line and sends nothing", async () => {
    const { type, enter, onSendMessage } = setup();
    type("Zeile eins");
    expect(await enter()).toBe(true);
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it("phone keyboards show a return key", () => {
    const { box } = setup();
    expect(box.getAttribute("enterkeyhint")).toBe("enter");
  });
});

describe("Messenger composer: paste a screenshot (VTID-05229)", () => {
  beforeEach(() => {
    device("desktop");
    notifyError.mockReset();
    uploadChatAttachment.mockReset();
    uploadChatAttachment.mockImplementation(async (file: File) => ({
      url: `https://signed.example/${file.name}`,
      path: `g1/${file.name}`,
      name: file.name,
      size: file.size,
      type: file.type,
    }));
  });

  it("an image on the clipboard is uploaded, renamed and shown in the preview — not sent", async () => {
    const { box, onSendMessage } = setup();
    let allowed = true;
    await act(async () => {
      allowed = fireEvent.paste(box, { clipboardData: clipboard({ files: [png()] }) });
    });
    expect(allowed).toBe(false);
    expect(uploadChatAttachment).toHaveBeenCalledTimes(1);
    const [file, , threadId] = uploadChatAttachment.mock.calls[0];
    expect(threadId).toBe("g1");
    expect((file as File).name).toMatch(/^screenshot-\d{8}-\d{6}\.png$/);
    expect((file as File).type).toBe("image/png");
    await waitFor(() => expect(screen.getByAltText(/^screenshot-\d{8}-\d{6}\.png$/)).toBeInTheDocument());
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it("the pasted image is sent with a caption on Enter", async () => {
    const { box, type, enter, onSendMessage } = setup();
    await act(async () => {
      fireEvent.paste(box, { clipboardData: clipboard({ files: [png()] }) });
    });
    await waitFor(() => expect(screen.getByAltText(/^screenshot-/)).toBeInTheDocument());
    type("Siehe Bild");
    await enter();
    expect(onSendMessage).toHaveBeenCalledTimes(1);
    const [content, kind, data] = onSendMessage.mock.calls[0];
    expect(content).toBe("Siehe Bild");
    expect(kind).toBe("attachment");
    expect(data.attachments).toHaveLength(1);
    expect(data.attachments[0]).toMatchObject({ type: "image", mime: "image/png" });
  });

  it("works when the browser only fills clipboardData.items (Safari)", async () => {
    const { box } = setup();
    await act(async () => {
      fireEvent.paste(box, { clipboardData: clipboard({ files: [png()], itemsOnly: true }) });
    });
    expect(uploadChatAttachment).toHaveBeenCalledTimes(1);
  });

  it("a file with a real name keeps it", async () => {
    const { box } = setup();
    await act(async () => {
      fireEvent.paste(box, { clipboardData: clipboard({ files: [png("Rechnung Oktober.png")] }) });
    });
    expect((uploadChatAttachment.mock.calls[0][0] as File).name).toBe("Rechnung Oktober.png");
  });

  it("text on the clipboard wins: normal paste, nothing uploaded", async () => {
    const { box } = setup();
    let allowed = false;
    await act(async () => {
      allowed = fireEvent.paste(box, { clipboardData: clipboard({ files: [png()], text: "Tabelle aus Excel" }) });
    });
    expect(allowed).toBe(true);
    expect(uploadChatAttachment).not.toHaveBeenCalled();
  });

  it("a disallowed file shows the same error as the paperclip and uploads nothing", async () => {
    const { box } = setup();
    const exe = new File([new Uint8Array([77, 90])], "tool.exe", { type: "application/x-msdownload" });
    await act(async () => {
      fireEvent.paste(box, { clipboardData: clipboard({ files: [exe] }) });
    });
    expect(notifyError).toHaveBeenCalledWith("toasts.messages.fileNotAllowed");
    expect(uploadChatAttachment).not.toHaveBeenCalled();
  });

  it("without an open conversation it asks to open one and uploads nothing", async () => {
    const { box } = setup({ threadId: undefined });
    await act(async () => {
      fireEvent.paste(box, { clipboardData: clipboard({ files: [png()] }) });
    });
    expect(notifyError).toHaveBeenCalledWith(
      "toasts.messages.openConversation",
      "toasts.messages.selectOpenConversationBeforeAttachingFiles",
    );
    expect(uploadChatAttachment).not.toHaveBeenCalled();
  });

  it("a disabled composer ignores the paste", async () => {
    const { box } = setup({ disabled: true });
    await act(async () => {
      fireEvent.paste(box, { clipboardData: clipboard({ files: [png()] }) });
    });
    expect(uploadChatAttachment).not.toHaveBeenCalled();
  });
});
