/**
 * Bedrock bridge client — drop-in replacement for `gemini-client.ts`
 * (Aurora migration B7, VTID-03764 chain).
 *
 * WHY THIS EXISTS
 *
 * `AURORA-B7-EDGE-FUNCTIONS-INVENTORY.md` (vitana-platform repo) found 23 of
 * this repo's 74 edge functions calling the Gemini Developer API or Vertex AI
 * directly — a direct violation of the platform's own standing rule
 * (CLAUDE.md ALWAYS 10a/10b: "Always use Claude via AWS Bedrock. Always...
 * no sanctioned Google dependency left at all"). Six of those functions are
 * frontend-reachable and share one call surface, `_shared/gemini-client.ts`'s
 * `generateContent()` / `extractTextFromResponse()` / `extractFunctionCall()`.
 *
 * This file implements the SAME three function signatures against the
 * gateway's new `/api/v1/ai-bridge/generate` route (Bedrock/Claude on the
 * other end) instead of Gemini. A consuming edge function switches provider
 * with a one-line import change:
 *
 *   - import { generateContent, extractTextFromResponse, extractFunctionCall } from '../_shared/gemini-client.ts';
 *   + import { generateContent, extractTextFromResponse, extractFunctionCall } from '../_shared/bedrock-bridge-client.ts';
 *
 * and dropping the `GOOGLE_GEMINI_API_KEY` argument (the gateway holds the
 * Bedrock credential; this client authenticates to the GATEWAY instead, via
 * GATEWAY_SERVICE_TOKEN — see below), everything else about the call site is
 * unchanged.
 *
 * WHAT'S DELIBERATELY DIFFERENT
 *
 * `generateEmbedding()` from `gemini-client.ts` has NO equivalent here. Only
 * `generate-memory-embedding` and `search-memories` call it, neither of which
 * is in the frontend-reachable six this bridge exists for, and this
 * codebase's Bedrock provider (`services/gateway/src/providers/bedrock.ts`)
 * has no embedding endpoint at all — Bedrock's own embedding models (Titan
 * Embeddings) are a different model family entirely. Porting those two
 * functions is real, separate follow-up work, not something to fake here.
 *
 * AUTH
 *
 * This calls the gateway as a SERVICE, not as the end user — the gateway
 * route is gated by `requireServiceOrAdmin` (GATEWAY_SERVICE_TOKEN bearer),
 * mirroring the existing self-healing `/report` pattern. `GATEWAY_SERVICE_TOKEN`
 * must be set as a Supabase edge function secret with the SAME value
 * configured as the gateway's own `GATEWAY_SERVICE_TOKEN` env var — this
 * client never forwards the calling user's own JWT to the gateway.
 */

export interface GeminiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GeminiToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface GeminiGenerateOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

/**
 * Read via `globalThis` rather than the bare `Deno` identifier: this file is
 * also imported (for testing — see the sibling `src/lib` Vitest suite) by a
 * Node/tsc project that has no Deno ambient types and never will, and a
 * `declare const Deno` here would collide with Deno's own richer global type
 * when this file is actually type-checked by the Deno runtime. Casting
 * through `globalThis as any` needs no ambient type and behaves identically
 * in both environments.
 */
function denoEnv(key: string): string | undefined {
  return (globalThis as any).Deno?.env?.get(key);
}

function gatewayBaseUrl(): string {
  return denoEnv('GATEWAY_URL') || 'https://gateway.vitanaland.com/api/v1';
}

/**
 * Mirrors `gemini-client.ts`'s `generateContent(apiKey, messages, options, tools)`.
 * The first parameter is kept for call-site parity (every existing caller
 * passes an API key positionally) but is UNUSED here — the gateway holds the
 * Bedrock credential, not this client. Passing an empty string is fine.
 */
export async function generateContent(
  _apiKey: string,
  messages: GeminiMessage[],
  options: GeminiGenerateOptions = {},
  tools?: GeminiToolDeclaration[],
): Promise<any> {
  const serviceToken = denoEnv('GATEWAY_SERVICE_TOKEN');
  if (!serviceToken) {
    throw new Error('GATEWAY_SERVICE_TOKEN not configured — cannot reach the AI bridge');
  }

  const resp = await fetch(`${gatewayBaseUrl()}/ai-bridge/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceToken}`,
    },
    body: JSON.stringify({ messages, options, tools }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`AI bridge request failed: ${resp.status} ${body}`);
  }

  return resp.json();
}

/**
 * Byte-for-byte the same extraction logic as `gemini-client.ts` — the
 * gateway's `/ai-bridge/generate` route deliberately returns this exact
 * shape (`candidates[0].content.parts[]`) so this function needs no changes
 * at all when the underlying provider switches.
 */
export function extractTextFromResponse(response: any): string {
  return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export function extractFunctionCall(response: any): { name: string; args: any } | null {
  // Mirrors gemini-client.ts exactly: only parts[0] is checked. The gateway's
  // /ai-bridge/generate route always places a functionCall part first when
  // one exists, so this stays correct without needing to scan every part.
  const candidate = response.candidates?.[0];
  const part = candidate?.content?.parts?.[0];
  const functionCall = part?.functionCall;

  if (!functionCall) return null;

  return { name: functionCall.name, args: functionCall.args };
}

export interface GenerateImageOptions {
  width?: number;
  height?: number;
  negativePrompt?: string;
}

/**
 * Image-generation leg of the same bridge (Aurora migration B7,
 * AURORA-B7-EDGE-FUNCTIONS-INVENTORY.md's 2026-08-29 addendum), for
 * functions calling Vertex Imagen directly (e.g. `generate-event-image`) —
 * there is no Anthropic/Claude equivalent, so this hits the gateway's
 * `/api/v1/ai-bridge/generate-image` route (Titan Image on the other end)
 * rather than reusing `generateContent()` above. Returns raw base64 PNG
 * bytes — the caller decodes/uploads them the same way it already handles
 * Imagen's `predictions[0].bytesBase64Encoded` payload.
 */
export async function generateImage(
  prompt: string,
  options: GenerateImageOptions = {},
): Promise<{ imageBase64: string; model: string }> {
  const serviceToken = denoEnv('GATEWAY_SERVICE_TOKEN');
  if (!serviceToken) {
    throw new Error('GATEWAY_SERVICE_TOKEN not configured — cannot reach the AI bridge');
  }

  const resp = await fetch(`${gatewayBaseUrl()}/ai-bridge/generate-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceToken}`,
    },
    body: JSON.stringify({
      prompt,
      width: options.width,
      height: options.height,
      negativePrompt: options.negativePrompt,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`AI bridge image request failed: ${resp.status} ${body}`);
  }

  const data = await resp.json();
  return { imageBase64: data.imageBase64, model: data.model };
}
