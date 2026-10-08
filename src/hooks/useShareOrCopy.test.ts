import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const notifySuccess = vi.fn();
const notifyError = vi.fn();
vi.mock("@/lib/i18n-toast", () => ({ notifySuccess: (...a: unknown[]) => notifySuccess(...a), notifyError: (...a: unknown[]) => notifyError(...a) }));
vi.mock("@/lib/analytics", () => ({ analytics: { trackShare: vi.fn() } }));

import { useShareOrCopy } from "./useShareOrCopy";

const opts = { contentId: "p1", contentType: "post" };
const payload = { title: "T", url: "https://x.test/post/post/p1" };

describe("useShareOrCopy (VTID-04993)", () => {
  beforeEach(() => { notifySuccess.mockClear(); notifyError.mockClear(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("opens the native share sheet when there is one", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, clipboard: { writeText: vi.fn() } });
    const { result } = renderHook(() => useShareOrCopy(opts));
    expect(await result.current.shareOrCopy(payload)).toBe("shared");
    expect(share).toHaveBeenCalledWith({ title: "T", text: undefined, url: payload.url });
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it("copies the link and says so when there is no share sheet", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { result } = renderHook(() => useShareOrCopy(opts));
    expect(await result.current.shareOrCopy(payload)).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(payload.url);
    expect(notifySuccess).toHaveBeenCalledWith("toasts.sharing.linkCopied");
  });

  it("does nothing when the member cancels the share sheet", async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error("x"), { name: "AbortError" }));
    const writeText = vi.fn();
    vi.stubGlobal("navigator", { share, clipboard: { writeText } });
    const { result } = renderHook(() => useShareOrCopy(opts));
    expect(await result.current.shareOrCopy(payload)).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it("tells the member when neither works", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("no")) } });
    const { result } = renderHook(() => useShareOrCopy(opts));
    expect(await result.current.shareOrCopy(payload)).toBe("failed");
    expect(notifyError).toHaveBeenCalledWith("toasts.common.couldnTCopyPleaseCopyLink");
  });
});
