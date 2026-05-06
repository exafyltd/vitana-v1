// Shared Vertex AI Imagen helpers used by the MAXINA fallback image pipeline.
//
// All callers go through `generateImagenPng` so the JWT exchange, region/model
// configuration and safety settings live in exactly one place.

const TOKEN_AUDIENCE = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/cloud-platform";

let cachedToken: { token: string; expiresAt: number } | null = null;

function b64url(input: string | ArrayBuffer): string {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const cleaned = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/[\r\n\s]/g, "");
  const der = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

export async function getVertexAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const json = Deno.env.get("GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON");
  if (!json) throw new Error("GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON not configured");
  const sa = JSON.parse(json);

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: SCOPE,
    aud: TOKEN_AUDIENCE,
    exp: now + 3600,
    iat: now,
  }));
  const signingInput = `${header}.${claim}`;
  const key = await importPrivateKey(sa.private_key);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const jwt = `${signingInput}.${b64url(signature)}`;

  const res = await fetch(TOKEN_AUDIENCE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Vertex token exchange failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    // Google tokens last 3600s; refresh a minute early to be safe.
    expiresAt: Date.now() + ((data.expires_in ?? 3500) - 60) * 1000,
  };
  return cachedToken.token;
}

export type ImagenAspect = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export interface ImagenRequest {
  prompt: string;
  aspectRatio?: ImagenAspect;
  /** Stable seed lets us reproduce the same image for the same user. */
  seed?: number;
  /** `imagen-3.0-fast-generate-001` (default) or a pinned upgrade. */
  model?: string;
}

export interface ImagenResult {
  pngBytes: Uint8Array;
  model: string;
}

export async function generateImagenPng(req: ImagenRequest): Promise<ImagenResult> {
  const projectId = (Deno.env.get("GOOGLE_CLOUD_PROJECT_ID") ?? "").trim();
  const region = (Deno.env.get("GOOGLE_CLOUD_REGION") ?? "us-central1").trim();
  if (!projectId) throw new Error("GOOGLE_CLOUD_PROJECT_ID not configured");

  const model = req.model ?? "imagen-3.0-fast-generate-001";
  const accessToken = await getVertexAccessToken();
  const endpoint =
    `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}` +
    `/locations/${region}/publishers/google/models/${model}:predict`;

  const parameters: Record<string, unknown> = {
    sampleCount: 1,
    aspectRatio: req.aspectRatio ?? "16:9",
    addWatermark: false,
    enhancePrompt: true,
    language: "en",
    personGeneration: "allow_adult",
    safetySetting: "block_medium_and_above",
  };
  if (typeof req.seed === "number") parameters.seed = req.seed;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      instances: [{ prompt: req.prompt }],
      parameters,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (res.status === 403) throw new Error("Vertex quota exceeded or API not enabled");
    throw new Error(`Imagen API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error("Imagen returned no image bytes");
  const pngBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return { pngBytes, model };
}

// ---------------------------------------------------------------------------
// Prompt builders for MAXINA match cards
// ---------------------------------------------------------------------------

export type MaxinaCategory = "dance" | "fitness" | "wellness";

export type ImageType = "avatar" | "cover";

const CATEGORY_COVER_PROMPTS: Record<MaxinaCategory, string> = {
  dance:
    "Realistic cinematic photograph of a diverse social-dance moment in a warm " +
    "boutique studio: bachata or salsa partners mid-turn, soft tungsten and " +
    "rim lighting, polished wooden floor, shallow depth of field, motion-blur " +
    "on the trailing dress, joyful authentic expressions. Editorial dance " +
    "magazine quality, premium and aspirational, no text, no watermark.",
  fitness:
    "Realistic cinematic photograph of a premium boutique gym at golden hour: " +
    "diverse adults mid-set on functional training equipment, focused " +
    "expressions, breathable activewear, shallow depth of field, soft window " +
    "light bouncing off polished concrete, subtle haze. Editorial wellness " +
    "magazine quality, modern, premium and aspirational, no text, no watermark.",
  wellness:
    "Realistic cinematic photograph of a serene Mediterranean wellness scene: " +
    "diverse adults in mindful movement, terracotta and sage palette, soft " +
    "diffused natural light, organic textures, calm authentic expressions. " +
    "Editorial wellness magazine quality, premium and aspirational, no text, " +
    "no watermark.",
};

const AVATAR_PROMPT_TEMPLATE =
  "Stylized abstract avatar tile (NOT a depiction of a real person): soft " +
  "gradient background tuned to {{palette}}, subtle organic light shapes, " +
  "centered minimalist silhouette suggesting movement, premium magazine " +
  "aesthetic. Important: do not render facial features, do not include text, " +
  "do not include watermarks. Square 1:1 composition, mobile-card optimized.";

const PALETTE_BY_CATEGORY: Record<MaxinaCategory, string> = {
  dance: "deep burgundy, dusty rose, warm amber",
  fitness: "graphite, electric teal, warm white",
  wellness: "terracotta, sage green, soft cream",
};

export function buildPrompt(
  category: MaxinaCategory,
  imageType: ImageType,
): string {
  if (imageType === "cover") return CATEGORY_COVER_PROMPTS[category];
  return AVATAR_PROMPT_TEMPLATE.replace(
    "{{palette}}",
    PALETTE_BY_CATEGORY[category],
  );
}

/** Hash a stable string seed (e.g. user_id or fallback_seed) into 0..2^31. */
export function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h) + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
