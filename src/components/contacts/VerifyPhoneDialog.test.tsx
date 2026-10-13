/* eslint-disable @typescript-eslint/no-explicit-any -- scripted fetch + Supabase chain in a test */
/**
 * VTID-05096 — verify your phone number (gateway VTID-05095).
 *
 * Pins: the dialog's steps (number → code → done) and what it sends; the
 * code field is numeric, 6 digits, one-time-code autofill; the resend timer;
 * every gateway error code has a message (and unknown codes fall back); the
 * Privacy card and the Find friends hint stay hidden while the gateway
 * switch is off, show Verify when unverified and the masked number with
 * Change / Remove when verified; numbers render LTR inside RTL layouts;
 * every new string exists in all eleven locales.
 */
import fs from "fs";
import path from "path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/i18n-toast", () => ({
  t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
  notify: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock("@/context/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/lib/cached-access-token", () => ({ getAccessToken: async () => "tok" }));
vi.mock("@/lib/gateway-base", () => ({ GATEWAY_BASE: "https://gw.test" }));
vi.mock("@/integrations/supabase/client", () => {
  const q: any = {
    select: () => q,
    eq: () => q,
    maybeSingle: async () => ({ data: { phone: "0170 1234567" }, error: null }),
  };
  return { supabase: { from: () => q } };
});

import { VerifyPhoneDialog } from "./VerifyPhoneDialog";
import { VerifyPhoneHint } from "./VerifyPhoneHint";
import { PhoneNumberCard } from "@/components/settings/PhoneNumberCard";
import { PHONE_VERIFY_ERRORS, errorCode } from "@/lib/phone-verification-client";

type Reply = { status: number; body: Record<string, unknown> };
let replies: Record<string, Reply>;
let calls: Array<{ url: string; method: string; body: any }>;

function reply(status: number, body: Record<string, unknown>): Reply {
  return { status, body };
}

beforeEach(() => {
  calls = [];
  replies = {
    "GET /api/v1/me/phone": reply(200, { ok: true, enabled: true, verified: false, phone_masked: null, discoverable: true, resend_after_seconds: 60 }),
    "POST /api/v1/me/phone/verification": reply(200, { ok: true, expires_in: 600, resend_after_seconds: 60, phone_masked: "+49 ••• 567" }),
    "POST /api/v1/me/phone/verification/confirm": reply(200, { ok: true, verified: true }),
    "DELETE /api/v1/me/phone": reply(200, { ok: true }),
  };
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = (init.method ?? "GET").toUpperCase();
    const p = new URL(url).pathname;
    calls.push({ url: p, method, body: init.body ? JSON.parse(String(init.body)) : null });
    const r = replies[`${method} ${p}`] ?? reply(404, { ok: false, error: "NOT_FOUND" });
    return { ok: r.status < 300, status: r.status, json: async () => r.body } as Response;
  }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function wrap(ui: React.ReactNode, dir: "ltr" | "rtl" = "ltr") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <div dir={dir}>{ui}</div>
    </QueryClientProvider>,
  );
}

describe("VerifyPhoneDialog", () => {
  it("number → code → done, sending the number with a region hint and the 6-digit code", async () => {
    wrap(<VerifyPhoneDialog open onOpenChange={() => undefined} />);
    const number = (await screen.findByTestId("verify-phone-number")) as HTMLInputElement;
    await waitFor(() => expect(number.value).toBe("0170 1234567"));
    expect(number.type).toBe("tel");
    expect(number.getAttribute("dir")).toBe("ltr");

    fireEvent.click(screen.getByTestId("verify-phone-send"));
    const code = (await screen.findByTestId("verify-phone-code")) as HTMLInputElement;
    expect(calls.find((c) => c.url.endsWith("/verification"))?.body).toMatchObject({ phone: "0170 1234567" });
    expect(code.getAttribute("autocomplete")).toBe("one-time-code");
    expect(code.getAttribute("inputmode")).toBe("numeric");
    expect(screen.getByText("+49 ••• 567").closest("bdi")?.getAttribute("dir")).toBe("ltr");

    expect((screen.getByTestId("verify-phone-confirm") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(code, { target: { value: "12a34 5678" } });
    expect(code.value).toBe("123456");
    fireEvent.click(screen.getByTestId("verify-phone-confirm"));
    await screen.findByTestId("verify-phone-close");
    expect(calls.find((c) => c.url.endsWith("/confirm"))?.body).toEqual({ code: "123456" });
  });

  it("the resend button waits for the timer", async () => {
    wrap(<VerifyPhoneDialog open onOpenChange={() => undefined} />);
    replies["POST /api/v1/me/phone/verification"] = reply(200, { ok: true, resend_after_seconds: 2, phone_masked: "+49 ••• 567" });
    fireEvent.change(await screen.findByTestId("verify-phone-number"), { target: { value: "+49 170 1234567" } });
    fireEvent.click(screen.getByTestId("verify-phone-send"));
    const resend = (await screen.findByTestId("verify-phone-resend")) as HTMLButtonElement;
    expect(resend.disabled).toBe(true);
    expect(resend.textContent).toContain("mailhub.findFriends.verifyPhone.resendIn");
    await waitFor(() => expect((screen.getByTestId("verify-phone-resend") as HTMLButtonElement).disabled).toBe(false), { timeout: 4000 });
    expect(screen.getByTestId("verify-phone-resend").textContent).toBe("mailhub.findFriends.verifyPhone.resend");
    fireEvent.click(screen.getByTestId("verify-phone-resend"));
    await waitFor(() => expect(calls.filter((c) => c.url.endsWith("/verification")).length).toBe(2));
  });

  it.each(PHONE_VERIFY_ERRORS.filter((c) => !["INVALID_CODE", "CODE_EXPIRED", "NO_PENDING_CODE", "TOO_MANY_ATTEMPTS"].includes(c)))(
    "send error %s shows its own message",
    async (code) => {
      replies["POST /api/v1/me/phone/verification"] = reply(code === "TOO_MANY_REQUESTS" ? 429 : 400, { ok: false, error: code });
      wrap(<VerifyPhoneDialog open onOpenChange={() => undefined} />);
      fireEvent.change(await screen.findByTestId("verify-phone-number"), { target: { value: "+49 170 1234567" } });
      fireEvent.click(screen.getByTestId("verify-phone-send"));
      expect((await screen.findByTestId("verify-phone-error")).textContent).toBe(`mailhub.findFriends.verifyPhone.errors.${code}`);
      expect(screen.queryByTestId("verify-phone-code")).toBeNull();
    },
  );

  it.each(["INVALID_CODE", "CODE_EXPIRED", "NO_PENDING_CODE", "TOO_MANY_ATTEMPTS", "PHONE_IN_USE"])(
    "confirm error %s shows its own message and stays on the code step",
    async (code) => {
      replies["POST /api/v1/me/phone/verification/confirm"] = reply(400, { ok: false, error: code });
      wrap(<VerifyPhoneDialog open onOpenChange={() => undefined} />);
      fireEvent.change(await screen.findByTestId("verify-phone-number"), { target: { value: "+49 170 1234567" } });
      fireEvent.click(screen.getByTestId("verify-phone-send"));
      fireEvent.change(await screen.findByTestId("verify-phone-code"), { target: { value: "000000" } });
      fireEvent.click(screen.getByTestId("verify-phone-confirm"));
      expect((await screen.findByTestId("verify-phone-error")).textContent).toBe(`mailhub.findFriends.verifyPhone.errors.${code}`);
      expect(screen.getByTestId("verify-phone-code")).toBeTruthy();
    },
  );

  it("an unknown or missing error code falls back to the generic message", () => {
    expect(errorCode("SOMETHING_NEW")).toBe("unknown");
    expect(errorCode(undefined)).toBe("unknown");
    expect(errorCode("PHONE_IN_USE")).toBe("PHONE_IN_USE");
  });
});

describe("PhoneNumberCard and VerifyPhoneHint", () => {
  it("are hidden while the gateway switch is off, and when the status call fails", async () => {
    replies["GET /api/v1/me/phone"] = reply(200, { ok: true, enabled: false, verified: false });
    const off = wrap(<><PhoneNumberCard /><VerifyPhoneHint /></>);
    await waitFor(() => expect(calls.some((c) => c.method === "GET")).toBe(true));
    expect(screen.queryByTestId("phone-number-card")).toBeNull();
    expect(screen.queryByTestId("verify-phone-hint")).toBeNull();
    off.unmount();

    replies["GET /api/v1/me/phone"] = reply(503, { ok: false, error: "PHONE_VERIFY_DISABLED" });
    wrap(<><PhoneNumberCard /><VerifyPhoneHint /></>);
    await waitFor(() => expect(calls.filter((c) => c.method === "GET").length).toBe(2));
    expect(screen.queryByTestId("phone-number-card")).toBeNull();
    expect(screen.queryByTestId("verify-phone-hint")).toBeNull();
  });

  it("unverified: Verify opens the dialog; the hint shows too", async () => {
    wrap(<><PhoneNumberCard /><VerifyPhoneHint /></>);
    fireEvent.click(await screen.findByTestId("phone-number-verify"));
    expect(await screen.findByTestId("verify-phone-dialog")).toBeTruthy();
    expect(screen.getByTestId("verify-phone-hint")).toBeTruthy();
  });

  it("verified: masked number LTR inside RTL, Change and Remove; no hint", async () => {
    replies["GET /api/v1/me/phone"] = reply(200, { ok: true, enabled: true, verified: true, phone_masked: "+49 ••• 567", discoverable: true });
    wrap(<><PhoneNumberCard /><VerifyPhoneHint /></>, "rtl");
    const line = await screen.findByTestId("phone-number-verified");
    expect(line.querySelector("bdi")?.getAttribute("dir")).toBe("ltr");
    expect(line.querySelector("bdi")?.textContent).toBe("+49 ••• 567");
    expect(screen.getByText("mailhub.findFriends.verifyPhone.change")).toBeTruthy();
    expect(screen.getByTestId("phone-number-remove")).toBeTruthy();
    expect(screen.queryByTestId("verify-phone-hint")).toBeNull();
  });

  it("Remove asks first, then deletes", async () => {
    replies["GET /api/v1/me/phone"] = reply(200, { ok: true, enabled: true, verified: true, phone_masked: "+49 ••• 567" });
    wrap(<PhoneNumberCard />);
    fireEvent.click(await screen.findByTestId("phone-number-remove"));
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    const confirmButtons = await screen.findAllByText("mailhub.findFriends.verifyPhone.remove");
    await act(async () => {
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);
    });
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE")).toBe(true));
  });
});

describe("i18n", () => {
  const LOCALES = ["de", "en", "es", "sr", "fr", "pl", "pt", "ru", "tr", "zh", "ar"];
  const KEYS = [
    "title", "body", "verifiedLabel", "verify", "change", "remove", "removeTitle", "removeBody", "removed",
    "dialogTitle", "numberLabel", "numberHelp", "sendCode", "codeLabel", "codeHelp", "confirm", "resendIn",
    "resend", "changeNumber", "done", "hint", "hintAction",
    ...[...PHONE_VERIFY_ERRORS, "unknown"].map((c) => `errors.${c}`),
  ];
  it.each(LOCALES)("%s has every verifyPhone string", (locale) => {
    const json = JSON.parse(fs.readFileSync(path.join(process.cwd(), `src/i18n/${locale}/mailhub.json`), "utf8"));
    const vp = json.mailhub.findFriends.verifyPhone;
    for (const k of KEYS) {
      const v = k.split(".").reduce((o: any, part) => o?.[part], vp);
      expect(typeof v === "string" && v.trim().length > 0, `${locale}: ${k}`).toBe(true);
    }
    expect(vp.resendIn).toContain("{seconds}");
  });
  it("German is du-form", () => {
    const vp = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src/i18n/de/mailhub.json"), "utf8")).mailhub.findFriends.verifyPhone;
    expect(JSON.stringify(vp)).not.toMatch(/\b(Sie|Ihr|Ihre|Ihnen|Ihren)\b/);
  });
});
