/**
 * VTID-05316 (messenger-ux-v2/ui-media-album, R10) — the composer's upload
 * strip: real progress, nothing sent while an upload runs, a failed upload
 * stays (with the caption in the box) and Retry uploads it again, removing an
 * uploaded file deletes it from storage, videos travel as type "video".
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

vi.mock("@/hooks/useHybridMessages", () => ({ useHybridMessages: () => ({}) }));
vi.mock("@/hooks/useRole", () => ({ useRole: () => ({ currentRole: "community" }) }));
vi.mock("@/hooks/useTenant", () => ({ useTenant: () => ({ activeTenantId: "t1" }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/context/AuthProvider", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
const notifyError = vi.fn();
vi.mock("@/lib/i18n-toast", () => ({
  t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
  notifyError: (...a: unknown[]) => notifyError(...a),
}));
vi.mock("@/components/ui/emoji-picker", () => ({ EmojiPicker: () => null }));
vi.mock("@/components/ui/voice-recorder", () => ({ VoiceRecorder: () => null }));
vi.mock("@/components/messages/AttachmentMenu", () => ({ AttachmentMenu: () => null }));
vi.mock("@/components/messages/ReplyPreview", () => ({ ReplyPreview: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn() } }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined, isLoading: false, fetchStatus: "idle" }),
}));
const uploadChatAttachment = vi.fn();
const deleteChatAttachment = vi.fn(async (..._a: unknown[]) => undefined);
vi.mock("@/lib/fileUpload", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/fileUpload")>();
  return {
    ...real,
    uploadChatAttachment: (...a: unknown[]) => uploadChatAttachment(...a),
    deleteChatAttachment: (...a: unknown[]) => deleteChatAttachment(...a),
  };
});

import MessageInput from "./MessageInput";

beforeEach(() => {
  uploadChatAttachment.mockReset();
  deleteChatAttachment.mockClear();
  notifyError.mockClear();
  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
    matches: query === "(hover: hover) and (pointer: fine)",
    media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }) as unknown as MediaQueryList);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => { cb(0); return 0; });
});

function setup() {
  const onSendMessage = vi.fn().mockResolvedValue(undefined);
  render(
    <MessageInput onSendMessage={onSendMessage} threadId="peer-1" activeThread={{ id: "peer-1", type: "direct" }} conversationType="direct" />,
  );
  const box = screen.getByLabelText("screens.messages.messageComposer") as HTMLTextAreaElement;
  const pick = async (files: File[]) => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => { fireEvent.change(input, { target: { files } }); });
  };
  const type = (value: string) => fireEvent.change(box, { target: { value } });
  const enter = async () => { await act(async () => { fireEvent.keyDown(box, { key: "Enter" }); }); };
  return { onSendMessage, box, pick, type, enter };
}

const jpg = (name = "a.jpg") => new File([new Uint8Array(10)], name, { type: "image/jpeg" });
const mp4 = (name = "clip.mp4") => new File([new Uint8Array(10)], name, { type: "video/mp4" });
const stored = (f: File, path = `me/peer-1/${f.name}`) => ({ url: `https://signed/${f.name}`, path, name: f.name, size: f.size, type: f.type });

describe("composer uploads (VTID-05316)", () => {
  it("progress events update the strip; nothing is sent while the upload runs", async () => {
    let report!: (p: { loaded: number; total: number; percentage: number }) => void;
    let finish!: () => void;
    uploadChatAttachment.mockImplementation((f: File, onProgress: typeof report) => new Promise((resolve) => {
      report = onProgress;
      finish = () => resolve(stored(f));
    }));
    const { pick, type, enter, onSendMessage } = setup();
    await pick([jpg()]);
    await act(async () => { report({ loaded: 3, total: 10, percentage: 30 }); });
    const bar = screen.getByTestId("upload-progress");
    expect(bar.getAttribute("aria-valuenow")).toBe("30");
    await act(async () => { report({ loaded: 7, total: 10, percentage: 70 }); });
    expect(screen.getByTestId("upload-progress").getAttribute("aria-valuenow")).toBe("70");
    type("caption");
    await enter();
    expect(onSendMessage).not.toHaveBeenCalled();
    await act(async () => { finish(); });
    expect(screen.queryByTestId("upload-progress")).toBeNull();
    await enter();
    expect(onSendMessage).toHaveBeenCalledWith("caption", "attachment",
      { attachments: [expect.objectContaining({ type: "image", path: "me/peer-1/a.jpg" })] }, undefined, undefined);
  });

  it("a failed upload stays with Retry (caption kept, sending blocked); Retry uploads it again", async () => {
    uploadChatAttachment.mockRejectedValueOnce(new Error("Upload failed (network)"));
    const { pick, type, enter, box, onSendMessage } = setup();
    type("look");
    await pick([jpg("b.jpg")]);
    const failed = await screen.findByTestId("upload-failed");
    expect(failed.textContent).toContain("b.jpg");
    expect(failed.textContent).toContain("inbox.media.uploadFailed");
    await enter();
    expect(onSendMessage).not.toHaveBeenCalled();
    expect(box.value).toBe("look");

    uploadChatAttachment.mockImplementation(async (f: File) => stored(f));
    await act(async () => { fireEvent.click(screen.getByTestId("upload-retry")); });
    await waitFor(() => expect(screen.queryByTestId("upload-failed")).toBeNull());
    expect(uploadChatAttachment).toHaveBeenCalledTimes(2);
    expect((uploadChatAttachment.mock.calls[1][0] as File).name).toBe("b.jpg");
    await enter();
    expect(onSendMessage).toHaveBeenCalledWith("look", "attachment",
      { attachments: [expect.objectContaining({ filename: "b.jpg" })] }, undefined, undefined);
  });

  it("a failed upload can be removed instead (then sending works again)", async () => {
    uploadChatAttachment.mockRejectedValueOnce(new Error("x"));
    const { pick, type, enter, onSendMessage } = setup();
    type("hi");
    await pick([jpg("c.jpg")]);
    await screen.findByTestId("upload-failed");
    await act(async () => { fireEvent.click(screen.getByLabelText("Remove c.jpg")); });
    expect(screen.queryByTestId("upload-failed")).toBeNull();
    await enter();
    expect(onSendMessage).toHaveBeenCalledWith("hi", "text", null, undefined, undefined);
  });

  it("removing an uploaded file deletes it from storage", async () => {
    uploadChatAttachment.mockImplementation(async (f: File) => stored(f));
    const { pick } = setup();
    await pick([jpg("d.jpg")]);
    await act(async () => { fireEvent.click(await screen.findByLabelText("Remove d.jpg")); });
    expect(deleteChatAttachment).toHaveBeenCalledWith("me/peer-1/d.jpg");
  });

  it("a video travels as type 'video' (album member, plays in the viewer)", async () => {
    uploadChatAttachment.mockImplementation(async (f: File) => stored(f));
    const { pick, enter, onSendMessage } = setup();
    await pick([jpg("e.jpg"), mp4()]);
    await waitFor(() => expect(uploadChatAttachment).toHaveBeenCalledTimes(2));
    await enter();
    expect(onSendMessage.mock.calls[0][2].attachments.map((a: { type: string }) => a.type)).toEqual(["image", "video"]);
  });
});
