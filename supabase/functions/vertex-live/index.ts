// Version 1.1 - Fixed Blob audio handling for Vertex AI responses
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('📥 Received request:', req.method, req.url);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const upgradeHeader = req.headers.get("upgrade") || "";
  console.log('🔍 Upgrade header:', upgradeHeader);
  const proto = req.headers.get('sec-websocket-protocol') || '';
  const version = req.headers.get('sec-websocket-version') || '';
  const origin = req.headers.get('origin') || '';
  console.log('🔎 WS headers:', { origin, version, proto });
  
  if (upgradeHeader.toLowerCase() !== "websocket") {
    console.error('❌ Not a WebSocket request');
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    // Extract token from URL query params or Sec-WebSocket-Protocol header
    const url = new URL(req.url);
    let token = url.searchParams.get('token');

    if (!token) {
      const protoHeader = req.headers.get('sec-websocket-protocol') || '';
      // Example values we support: "jwt.<token>", "bearer.<token>"
      const parts = protoHeader.split(',').map(p => p.trim());
      for (const p of parts) {
        if (p.startsWith('jwt.')) token = p.slice(4);
        else if (p.startsWith('bearer.')) token = p.slice(7);
      }
    }
    console.log('🔑 Token present:', !!token);
    
    if (!token) {
      console.error('❌ No token provided');
      return new Response(JSON.stringify({ error: 'No authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Immediately upgrade to WebSocket BEFORE any async work
    const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);
    console.log('🔄 Upgraded to WebSocket (server handshake complete)');

    // Shared state across handlers
    let vertexSocket: WebSocket | null = null;
    let conversationId: string | null = null;
    let isConnected = false;
    let pingInterval: number | undefined;

    // Non-async env lookups
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Handle client WebSocket open: do all async setup here
    clientSocket.onopen = async () => {
      console.log('✅ Client WebSocket connected');

      try {
        // Initialize Supabase client scoped to this user
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });

        // Verify user
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
          console.error('❌ Unauthorized:', authError);
          clientSocket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
          clientSocket.close(4001, 'unauthorized');
          return;
        }
        console.log(`👤 Authenticated user: ${user.id}`);

        // Conversation logging disabled due to database constraint issues
        // conversationId remains null

        // Mint Google access token directly using service account (no external vertex-auth)
        const serviceAccountJson = Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON');
        if (!serviceAccountJson) {
          console.error('❌ Missing GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON');
          clientSocket.send(JSON.stringify({ type: 'error', message: 'Server misconfiguration' }));
          clientSocket.close(4500, 'config-missing');
          return;
        }

        const serviceAccount = JSON.parse(serviceAccountJson);
        const projectId = serviceAccount.project_id;

        // Helper: base64url encode
        const base64UrlEncode = (input: Uint8Array) => {
          let str = '';
          for (let i = 0; i < input.length; i++) str += String.fromCharCode(input[i]);
          return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        };

        // Helper: PEM to ArrayBuffer (PKCS8)
        const pemToArrayBuffer = (pem: string): ArrayBuffer => {
          const b64 = pem
            .replace(/-----BEGIN PRIVATE KEY-----/g, '')
            .replace(/-----END PRIVATE KEY-----/g, '')
            .replace(/\s+/g, '');
          const raw = atob(b64);
          const buf = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
          return buf.buffer;
        };

        try {
          const enc = new TextEncoder();
          const header = { alg: 'RS256', typ: 'JWT' };
          const iat = Math.floor(Date.now() / 1000);
          const exp = iat + 3600; // 1 hour
          const payload = {
            iss: serviceAccount.client_email,
            scope: 'https://www.googleapis.com/auth/cloud-platform',
            aud: 'https://oauth2.googleapis.com/token',
            iat,
            exp,
          };

          const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
          const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)));
          const toSign = enc.encode(`${headerB64}.${payloadB64}`);

          const keyData = pemToArrayBuffer(serviceAccount.private_key);
          const privateKey = await crypto.subtle.importKey(
            'pkcs8',
            keyData,
            { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
            false,
            ['sign']
          );

          const signature = new Uint8Array(
            await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, privateKey, toSign)
          );
          const signatureB64 = base64UrlEncode(signature);
          const assertion = `${headerB64}.${payloadB64}.${signatureB64}`;

          const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(assertion)}`,
          });

          if (!tokenResp.ok) {
            const errText = await tokenResp.text();
            console.error('[VertexLive][OAuth] Token exchange failed', { status: tokenResp.status, body: errText.slice(0, 500) });
            try {
              clientSocket.send(JSON.stringify({ type: 'error', message: 'Vertex OAuth failed', status: tokenResp.status, detail: errText.slice(0, 500) }));
            } catch (_) {}
            clientSocket.close(4502, 'vertex-oauth-failed');
            return;
          }

          const { access_token } = await tokenResp.json();
          if (!access_token) {
            console.error('❌ No access_token in token response');
            clientSocket.send(JSON.stringify({ type: 'error', message: 'Vertex auth failed' }));
            clientSocket.close(4002, 'vertex-auth-failed');
            return;
          }

          // Connect to Vertex Live WS using access_token (US central1)
          const vertexUrl = `wss://us-central1-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent?access_token=${access_token}`;
          console.log('🔗 Connecting to Vertex WS...');
          vertexSocket = new WebSocket(vertexUrl);
        } catch (e) {
          console.error('[VertexLive][OAuth] Mint error:', e);
          try { clientSocket.send(JSON.stringify({ type: 'error', message: 'Vertex OAuth mint error' })); } catch (_){ }
          clientSocket.close(4503, 'vertex-oauth-mint-error');
          return;
        }

        vertexSocket.onopen = () => {
          console.log('✅ Connected to Vertex AI Live API');
          isConnected = true;

          // Send setup configuration
          const setupMessage = {
            setup: {
              model: `projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.0-flash-live-preview-04-09`,
              generation_config: {
                response_modalities: ['AUDIO'],
                speech_config: {
                  voice_config: { prebuilt_voice_config: { voice_name: 'Aoede' } },
                },
              },
              system_instruction: {
                parts: [{
                  text:
                    'You are a helpful AI assistant. Keep your responses natural and conversational. When the user shares their screen, describe what you see and provide helpful insights.',
                }],
              },
            },
          };
          vertexSocket!.send(JSON.stringify(setupMessage));
          console.log('📤 Sent setup configuration to Vertex AI');

          // Notify client that connection is ready and mark setup complete for the UI
          clientSocket.send(
            JSON.stringify({ type: 'connection_ready', conversationId }),
          );
          clientSocket.send(JSON.stringify({ setupComplete: true }));

          // Start keep-alive ping to client
          pingInterval = setInterval(() => {
            try {
              if (clientSocket.readyState === WebSocket.OPEN) {
                clientSocket.send(JSON.stringify({ type: 'ping' }));
              }
            } catch (_) {}
          }, 25000) as unknown as number;
        };

        vertexSocket.onerror = (error) => {
          console.error('❌ Vertex AI WebSocket error:', error);
          try {
            clientSocket.send(
              JSON.stringify({ type: 'error', message: 'Vertex AI connection error' }),
            );
          } catch (_) {}
        };

        vertexSocket.onclose = (ev) => {
          const e = ev as CloseEvent;
          console.log('🔌 Vertex AI WebSocket closed', e?.code, e?.reason);
          isConnected = false;
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.close(4000, 'vertex-closed');
          }
        };

        vertexSocket.onmessage = async (event) => {
          try {
            // Check if message is JSON or Blob
            if (typeof event.data === 'string') {
              // Handle JSON messages
              const data = JSON.parse(event.data);
              console.log('📥 Vertex AI JSON message type:', data.type || Object.keys(data)[0]);
              
              // Forward JSON to client
              clientSocket.send(event.data);
              
              // Log assistant messages if conversation tracking is enabled
              if (conversationId && data.serverContent) {
                const content = data.serverContent;
                const parts = content.modelTurn?.parts || [];
                const textParts = parts.filter((p: any) => p.text);
                const audioParts = parts.filter((p: any) => p.inlineData?.mimeType?.includes('audio'));
                if (textParts.length > 0 || audioParts.length > 0) {
                  try {
                    await supabase.from('ai_messages').insert({
                      conversation_id: conversationId,
                      role: 'assistant',
                      content: textParts.map((p: any) => p.text).join(' ') || '[Audio Response]',
                      metadata: { has_audio: audioParts.length > 0, turn_complete: content.turnComplete || false },
                    });
                  } catch (dbError) {
                    console.warn('Failed to log message (non-fatal):', dbError);
                  }
                }
              }
            } else if (event.data instanceof Blob) {
              // Handle binary audio data
              console.log('📥 Vertex AI audio Blob received, size:', event.data.size);
              
              // Forward audio Blob to client as ArrayBuffer
              const arrayBuffer = await event.data.arrayBuffer();
              clientSocket.send(arrayBuffer);
            } else {
              console.warn('⚠️ Unknown message type from Vertex AI:', typeof event.data);
            }
          } catch (error) {
            console.error('Error processing Vertex message:', error);
          }
        };
      } catch (error) {
        console.error('Error during setup:', error);
        try {
          clientSocket.send(JSON.stringify({ type: 'error', message: 'Failed to connect to Vertex AI' }));
        } catch (_) {}
        clientSocket.close(4501, 'setup-failed');
      }
    };

    // Forward client messages to Vertex AI
    clientSocket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📥 Client message type:', message.type || (message.clientContent ? 'clientContent' : message.client_content ? 'client_content' : 'unknown'));

        if (!isConnected || !vertexSocket) {
          console.warn('⚠️ Vertex AI not connected, dropping message');
          return;
        }

        // Forward to Vertex AI
        vertexSocket.send(JSON.stringify(message));

        // Log user messages to database (support camelCase and snake_case)
        const clientContent = message.clientContent || message.client_content;
        if (conversationId && clientContent) {
          const turns = clientContent.turns || [];
          for (const turn of turns) {
            const parts = turn.parts || [];
            const textParts = parts.filter((p: any) => p.text);
            if (textParts.length > 0) {
              // Best-effort logging (no await required, but we keep await to preserve order)
              const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
              await supabase.from('ai_messages').insert({
                conversation_id: conversationId,
                role: 'user',
                content: textParts.map((p: any) => p.text).join(' '),
                metadata: { source: 'text' },
              });
            }
          }
        }
      } catch (error) {
        console.error('Error forwarding client message:', error);
      }
    };

    clientSocket.onclose = (ev) => {
      const e = ev as CloseEvent;
      console.log('🔌 Client WebSocket closed', e?.code, e?.reason);
      if (typeof pingInterval !== 'undefined') clearInterval(pingInterval);
      if (vertexSocket && vertexSocket.readyState === WebSocket.OPEN) {
        vertexSocket.close(4000, 'client-closed');
      }
    };

    clientSocket.onerror = (error) => {
      console.error('❌ Client WebSocket error:', error);
    };

    return response;

  } catch (error) {
    console.error('❌ Error in vertex-live:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
