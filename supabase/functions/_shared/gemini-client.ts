/**
 * Gemini API Client Utility
 * Direct calls to Google's Generative Language API
 */

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

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
 * Convert OpenAI-style messages to Gemini format
 */
function convertMessagesToGemini(messages: GeminiMessage[]): {
  systemInstruction?: { parts: [{ text: string }] };
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
} {
  const systemMessages = messages.filter(m => m.role === 'system');
  const otherMessages = messages.filter(m => m.role !== 'system');

  // Combine all system messages
  const systemInstruction = systemMessages.length > 0
    ? { parts: [{ text: systemMessages.map(m => m.content).join('\n\n') }] }
    : undefined;

  // Convert user/assistant messages to Gemini format
  const contents = otherMessages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  return { systemInstruction, contents };
}

/**
 * Convert OpenAI-style tools to Gemini function declarations
 */
function convertToolsToGemini(tools: any[]): any[] {
  if (!tools || tools.length === 0) return [];

  return tools.map(tool => ({
    functionDeclarations: [{
      name: tool.function?.name || tool.name,
      description: tool.function?.description || tool.description,
      parameters: tool.function?.parameters || tool.parameters
    }]
  }));
}

/**
 * Generate content using Gemini API
 */
export async function generateContent(
  apiKey: string,
  messages: GeminiMessage[],
  options: GeminiGenerateOptions = {},
  tools?: GeminiToolDeclaration[]
): Promise<any> {
  const model = options.model || 'gemini-2.0-flash-exp';
  const { systemInstruction, contents } = convertMessagesToGemini(messages);

  const requestBody: any = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
      ...(options.topP !== undefined && { topP: options.topP }),
      ...(options.topK !== undefined && { topK: options.topK })
    }
  };

  if (systemInstruction) {
    requestBody.systemInstruction = systemInstruction;
  }

  if (tools && tools.length > 0) {
    requestBody.tools = tools.map(tool => ({
      functionDeclarations: [tool]
    }));
  }

  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Gemini API] Error:', response.status, errorText);
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Extract text from Gemini response
 */
export function extractTextFromResponse(response: any): string {
  const candidate = response.candidates?.[0];
  const part = candidate?.content?.parts?.[0];
  return part?.text || '';
}

/**
 * Extract function call from Gemini response
 */
export function extractFunctionCall(response: any): { name: string; args: any } | null {
  const candidate = response.candidates?.[0];
  const part = candidate?.content?.parts?.[0];
  const functionCall = part?.functionCall;
  
  if (!functionCall) return null;

  return {
    name: functionCall.name,
    args: functionCall.args
  };
}

/**
 * Generate embeddings using Gemini
 */
export async function generateEmbedding(
  apiKey: string,
  text: string,
  model: string = 'text-embedding-004'
): Promise<number[]> {
  const url = `${GEMINI_BASE_URL}/${model}:embedContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text }] }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Gemini Embeddings] Error:', response.status, errorText);
    throw new Error(`Gemini embedding error: ${response.status}`);
  }

  const data = await response.json();
  return data.embedding?.values || [];
}
