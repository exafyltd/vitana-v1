/**
 * Bedrock bridge client (Aurora migration B7) — the Gemini-shaped facade
 * `supabase/functions/_shared/bedrock-bridge-client.ts` uses to reach the
 * gateway's new `/api/v1/ai-bridge/generate` route instead of Gemini.
 *
 * This module lives under `supabase/functions/_shared` (a Deno edge-function
 * tree with no test harness of its own — no `deno` binary in this repo's
 * tooling, no existing `_shared` test precedent) rather than `src/`. It only
 * uses `Deno.env.get` and global `fetch`, both trivially stubbable, so this
 * test imports it directly (relative path, explicit `.ts` extension — Vitest
 * resolves that the same as any other module) and exercises it under Vitest
 * rather than leaving it unverified.
 *
 * What matters here: the extraction functions must behave IDENTICALLY to
 * `gemini-client.ts`'s (so a one-line import swap at any call site is safe),
 * and the request must reach the gateway with the shared-secret auth header,
 * never the Gemini API key parameter (which this client ignores).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateContent,
  extractTextFromResponse,
  extractFunctionCall,
  generateImage,
} from '../../supabase/functions/_shared/bedrock-bridge-client.ts';

const ORIGINAL_ENV: Record<string, string | undefined> = {};

function stubDenoEnv(vars: Record<string, string | undefined>) {
  (globalThis as any).Deno = {
    env: {
      get: (key: string) => vars[key],
    },
  };
}

describe('bedrock-bridge-client', () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    ORIGINAL_ENV.GATEWAY_URL = undefined;
    ORIGINAL_ENV.GATEWAY_SERVICE_TOKEN = undefined;
  });

  afterEach(() => {
    global.fetch = realFetch;
    delete (globalThis as any).Deno;
  });

  describe('generateContent', () => {
    it('throws when GATEWAY_SERVICE_TOKEN is not configured, without calling fetch', async () => {
      stubDenoEnv({});
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy as any;

      await expect(
        generateContent('', [{ role: 'user', content: 'hi' }]),
      ).rejects.toThrow(/GATEWAY_SERVICE_TOKEN/);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('posts to the default gateway URL with a Bearer service token, ignoring the apiKey arg', async () => {
      stubDenoEnv({ GATEWAY_SERVICE_TOKEN: 'shhh' });
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: 'hi back' }] } }] }),
      });
      global.fetch = fetchSpy as any;

      await generateContent('IGNORED_API_KEY', [{ role: 'user', content: 'hi' }], { temperature: 0.3 });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://gateway.vitanaland.com/api/v1/ai-bridge/generate');
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe('Bearer shhh');
      const body = JSON.parse(init.body);
      expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
      expect(body.options).toEqual({ temperature: 0.3 });
    });

    it('honors a GATEWAY_URL override', async () => {
      stubDenoEnv({ GATEWAY_SERVICE_TOKEN: 'shhh', GATEWAY_URL: 'https://preview-aws-gateway.vitanaland.com/api/v1' });
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [] }) });
      global.fetch = fetchSpy as any;

      await generateContent('', [{ role: 'user', content: 'hi' }]);

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://preview-aws-gateway.vitanaland.com/api/v1/ai-bridge/generate');
    });

    it('throws with the status and body when the gateway responds non-OK', async () => {
      stubDenoEnv({ GATEWAY_SERVICE_TOKEN: 'shhh' });
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: async () => '{"ok":false,"error":"not_configured"}',
      }) as any;

      await expect(
        generateContent('', [{ role: 'user', content: 'hi' }]),
      ).rejects.toThrow(/502/);
    });
  });

  describe('extractTextFromResponse — parity with gemini-client.ts', () => {
    it('reads candidates[0].content.parts[0].text', () => {
      const response = { candidates: [{ content: { parts: [{ text: 'the answer' }] } }] };
      expect(extractTextFromResponse(response)).toBe('the answer');
    });

    it('returns empty string when there is no text part', () => {
      expect(extractTextFromResponse({ candidates: [] })).toBe('');
      expect(extractTextFromResponse({})).toBe('');
    });
  });

  describe('extractFunctionCall — parity with gemini-client.ts', () => {
    it('reads a functionCall from parts[0]', () => {
      const response = {
        candidates: [{ content: { parts: [{ functionCall: { name: 'search', args: { q: 'cats' } } }] } }],
      };
      expect(extractFunctionCall(response)).toEqual({ name: 'search', args: { q: 'cats' } });
    });

    it('returns null when parts[0] has no functionCall', () => {
      const response = { candidates: [{ content: { parts: [{ text: 'no tool call here' }] } }] };
      expect(extractFunctionCall(response)).toBeNull();
    });

    it('returns null for a malformed/empty response', () => {
      expect(extractFunctionCall({})).toBeNull();
      expect(extractFunctionCall({ candidates: [] })).toBeNull();
    });
  });

  describe('generateImage', () => {
    it('throws when GATEWAY_SERVICE_TOKEN is not configured, without calling fetch', async () => {
      stubDenoEnv({});
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy as any;

      await expect(generateImage('a sunset')).rejects.toThrow(/GATEWAY_SERVICE_TOKEN/);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('posts to the default gateway URL with a Bearer service token', async () => {
      stubDenoEnv({ GATEWAY_SERVICE_TOKEN: 'shhh' });
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ imageBase64: 'ZmFrZQ==', model: 'amazon.titan-image-generator-v2:0' }),
      });
      global.fetch = fetchSpy as any;

      const result = await generateImage('a wellness event photo', { width: 1280, height: 720 });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://gateway.vitanaland.com/api/v1/ai-bridge/generate-image');
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe('Bearer shhh');
      const body = JSON.parse(init.body);
      expect(body).toEqual({
        prompt: 'a wellness event photo',
        width: 1280,
        height: 720,
        negativePrompt: undefined,
      });
      expect(result).toEqual({ imageBase64: 'ZmFrZQ==', model: 'amazon.titan-image-generator-v2:0' });
    });

    it('honors a GATEWAY_URL override', async () => {
      stubDenoEnv({ GATEWAY_SERVICE_TOKEN: 'shhh', GATEWAY_URL: 'https://preview-aws-gateway.vitanaland.com/api/v1' });
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ imageBase64: 'x', model: 'm' }) });
      global.fetch = fetchSpy as any;

      await generateImage('a beach');

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://preview-aws-gateway.vitanaland.com/api/v1/ai-bridge/generate-image');
    });

    it('throws with the status and body when the gateway responds non-OK', async () => {
      stubDenoEnv({ GATEWAY_SERVICE_TOKEN: 'shhh' });
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => '{"ok":false,"error":"blocked"}',
      }) as any;

      await expect(generateImage('a sunset')).rejects.toThrow(/422/);
    });
  });
});
