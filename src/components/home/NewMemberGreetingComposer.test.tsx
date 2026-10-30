import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NewMemberGreetingComposer } from "./NewMemberGreetingComposer";

// --- mocks ----------------------------------------------------------------
vi.mock("@/lib/gateway-base", () => ({ GATEWAY_BASE: "https://gw.test" }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: "tok" } } }),
    },
  },
}));

const notify = vi.fn();
const notifyError = vi.fn();
vi.mock("@/lib/i18n-toast", () => ({
  // t returns the key so assertions can read it; params are surfaced so the
  // "in {language}" affordance can be checked.
  t: (k: string, p?: Record<string, string | number>) =>
    p ? `${k}:${JSON.stringify(p)}` : k,
  // The composer maps the server's short locale code to a localized language
  // name using the current UI locale; pin it to en-US so the mapping is
  // deterministic in the test.
  getI18nLocale: () => "en-US",
  notify: (...a: unknown[]) => notify(...a),
  notifyError: (...a: unknown[]) => notifyError(...a),
}));

// Each test configures how fetch responds per URL.
let fetchImpl: (url: string, init: RequestInit) => Promise<Response>;
const fetchSpy = vi.fn((url: string, init: RequestInit) => fetchImpl(url, init));

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  notify.mockReset();
  notifyError.mockReset();
  fetchSpy.mockClear();
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const SUGGEST_RX = /greeting-suggestion$/;
const SEND_RX = /\/chat\/send$/;

function suggestionOnly(sequence: string[]): void {
  let i = 0;
  fetchImpl = async (url) => {
    if (SUGGEST_RX.test(url)) {
      const s = sequence[Math.min(i, sequence.length - 1)];
      i += 1;
      // The server returns a short locale code (e.g. 'en'), never a name.
      return jsonResponse(200, { ok: true, suggestion: s, language: "en" });
    }
    throw new Error(`unexpected fetch to ${url}`);
  };
}

describe("NewMemberGreetingComposer (VTID-05207)", () => {
  it("renders the fetched suggestion and the suggested-language affordance", async () => {
    suggestionOnly(["Hi Amy, lovely to have you here! 👋"]);
    render(<NewMemberGreetingComposer userId="newcomer-9" />);

    const field = (await screen.findByTestId("greeting-text")) as HTMLTextAreaElement;
    expect(field.value).toBe("Hi Amy, lovely to have you here! 👋");
    // "in {language}" is a t() key with the language param. The server returns
    // the short code 'en'; the composer must show the mapped language NAME
    // (what the sender actually sees), not the raw code.
    expect(screen.getByTestId("greeting-language").textContent).toContain(
      "newsCard.greeting.inLanguage",
    );
    expect(screen.getByTestId("greeting-language").textContent).toContain("English");
    expect(screen.getByTestId("greeting-language").textContent).not.toContain('"language":"en"');

    // The suggestion endpoint was called; no send happened just by opening.
    const suggestCalls = fetchSpy.mock.calls.filter(([u]) => SUGGEST_RX.test(u as string));
    const sendCalls = fetchSpy.mock.calls.filter(([u]) => SEND_RX.test(u as string));
    expect(suggestCalls).toHaveLength(1);
    expect(sendCalls).toHaveLength(0);
  });

  it("'Try another' varies the suggestion and grows the avoid list (never repeats in session)", async () => {
    suggestionOnly([
      "Welcome to MAXINA, Amy! 😊",
      "Hey Amy, just stopping by to say hello!",
    ]);
    render(<NewMemberGreetingComposer userId="newcomer-9" />);

    await screen.findByDisplayValue("Welcome to MAXINA, Amy! 😊");
    fireEvent.click(screen.getByTestId("greeting-try-another"));
    await screen.findByDisplayValue("Hey Amy, just stopping by to say hello!");

    const suggestCalls = fetchSpy.mock.calls.filter(([u]) => SUGGEST_RX.test(u as string));
    expect(suggestCalls).toHaveLength(2);
    // First call sends an empty avoid list; the second avoids the first suggestion.
    const firstAvoid = JSON.parse((suggestCalls[0][1] as RequestInit).body as string).avoid;
    const secondAvoid = JSON.parse((suggestCalls[1][1] as RequestInit).body as string).avoid;
    expect(firstAvoid).toEqual([]);
    expect(secondAvoid).toEqual(["Welcome to MAXINA, Amy! 😊"]);
  });

  it("Send posts exactly one DM tagged new_member_greeting and collapses on success", async () => {
    let sendCount = 0;
    fetchImpl = async (url) => {
      if (SUGGEST_RX.test(url)) return jsonResponse(200, { ok: true, suggestion: "Hi Amy!", language: "en" });
      if (SEND_RX.test(url)) {
        sendCount += 1;
        return jsonResponse(201, { ok: true });
      }
      throw new Error(`unexpected ${url}`);
    };
    const onSent = vi.fn();
    render(<NewMemberGreetingComposer userId="newcomer-9" onSent={onSent} />);

    await screen.findByDisplayValue("Hi Amy!");
    fireEvent.click(screen.getByTestId("greeting-send"));

    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
    expect(sendCount).toBe(1);

    const sendCall = fetchSpy.mock.calls.find(([u]) => SEND_RX.test(u as string))!;
    const body = JSON.parse((sendCall[1] as RequestInit).body as string);
    expect(body).toMatchObject({
      receiver_id: "newcomer-9",
      content: "Hi Amy!",
      message_type: "text",
      content_data: { source: "new_member_greeting" },
    });
    expect(notify).toHaveBeenCalledWith("newsCard.greeting.sentToast", "newsCard.greeting.sentToastDesc");
  });

  it("blocks double submit: the Send control is disabled while a send is in flight", async () => {
    let resolveSend: (r: Response) => void = () => {};
    fetchImpl = async (url) => {
      if (SUGGEST_RX.test(url)) return jsonResponse(200, { ok: true, suggestion: "Hi Amy!", language: "en" });
      if (SEND_RX.test(url)) return new Promise<Response>((res) => { resolveSend = res; });
      throw new Error(`unexpected ${url}`);
    };
    render(<NewMemberGreetingComposer userId="newcomer-9" />);

    await screen.findByDisplayValue("Hi Amy!");
    const sendBtn = screen.getByTestId("greeting-send");
    fireEvent.click(sendBtn);
    // In flight: disabled, and a second click cannot fire another request.
    await waitFor(() => expect(sendBtn).toBeDisabled());
    fireEvent.click(sendBtn);

    resolveSend(jsonResponse(201, { ok: true }));
    await waitFor(() =>
      expect(fetchSpy.mock.calls.filter(([u]) => SEND_RX.test(u as string))).toHaveLength(1),
    );
  });

  it("a guard refusal (403) shows one calm message and does not auto-resend", async () => {
    fetchImpl = async (url) => {
      if (SUGGEST_RX.test(url)) return jsonResponse(200, { ok: true, suggestion: "Hi Amy!", language: "en" });
      if (SEND_RX.test(url)) return jsonResponse(403, { ok: false, error: "greeting_not_allowed" });
      throw new Error(`unexpected ${url}`);
    };
    const onSent = vi.fn();
    render(<NewMemberGreetingComposer userId="newcomer-9" onSent={onSent} />);

    await screen.findByDisplayValue("Hi Amy!");
    fireEvent.click(screen.getByTestId("greeting-send"));

    await waitFor(() => expect(notify).toHaveBeenCalledWith("newsCard.greeting.notAllowed"));
    expect(onSent).not.toHaveBeenCalled();
    // Exactly one send attempt — no automatic retry.
    expect(fetchSpy.mock.calls.filter(([u]) => SEND_RX.test(u as string))).toHaveLength(1);
  });

  it("does nothing (no send) when the greeting text is empty", async () => {
    suggestionOnly(["Hi Amy!"]);
    render(<NewMemberGreetingComposer userId="newcomer-9" />);

    const field = (await screen.findByTestId("greeting-text")) as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: "   " } });
    fireEvent.click(screen.getByTestId("greeting-send"));

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith("newsCard.greeting.emptyGreeting"));
    expect(fetchSpy.mock.calls.filter(([u]) => SEND_RX.test(u as string))).toHaveLength(0);
  });
});
