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

        // Get Gemini API key from environment
        const apiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
        if (!apiKey) {
          console.error('❌ Missing GOOGLE_GEMINI_API_KEY');
          clientSocket.send(JSON.stringify({ type: 'error', message: 'API key not configured' }));
          clientSocket.close(4500, 'config-missing');
          return;
        }

        // Connect to Google AI Studio Gemini Live API (v1beta endpoint)
        const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
        console.log('🔗 Connecting to Gemini Live API (v1beta)...');
        vertexSocket = new WebSocket(geminiUrl);

        vertexSocket.onopen = async () => {
          console.log('✅ Connected to Gemini Live API');
          isConnected = true;

          // Send setup configuration
          // Let Gemini use its default audio format - client will detect and decode accordingly
          const setupMessage = {
            setup: {
              model: 'models/gemini-2.0-flash-exp',
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: { 
                    prebuiltVoiceConfig: { voiceName: 'Aoede' } 
                  }
                  // audioEncoding and sampleRateHertz are NOT supported by Gemini Live API v1beta
                  // Gemini will use its default format, which the client will detect via sniffing
                }
              },
              systemInstruction: {
                parts: [{
                  text: 'You are a helpful AI assistant. Keep your responses natural and conversational. When the user shares their screen, describe what you see and provide helpful insights.'
                }]
              }
            }
          };
          
          console.log('📤 Sending setup to Gemini...', JSON.stringify(setupMessage, null, 2));
          vertexSocket!.send(JSON.stringify(setupMessage));

          // Wait briefly to ensure client WebSocket is fully ready to receive
          await new Promise(resolve => setTimeout(resolve, 100));

          // Notify client that connection is ready and mark setup complete for the UI
          clientSocket.send(
            JSON.stringify({ type: 'connection_ready', conversationId }),
          );
          clientSocket.send(JSON.stringify({ setupComplete: true }));
          
          // Send confirmation ping to verify client is receiving messages
          setTimeout(() => {
            if (clientSocket.readyState === WebSocket.OPEN) {
              clientSocket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
              console.log('📤 Sent confirmation ping to client');
            }
          }, 200);

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
              
              // Forward JSON to client (with error handling)
              try {
                if (clientSocket.readyState === WebSocket.OPEN) {
                  clientSocket.send(event.data);
                } else {
                  console.warn('⚠️ Client socket not open, skipping message forward');
                }
              } catch (sendError) {
                console.error('❌ Error forwarding JSON to client:', sendError);
              }
              
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
              console.log('📥 Vertex AI audio Blob received');
              console.log('   Size:', event.data.size, 'bytes');
              console.log('   Type:', event.data.type);
              
              // Forward audio Blob to client as ArrayBuffer
              const arrayBuffer = await event.data.arrayBuffer();
              console.log('   ArrayBuffer size:', arrayBuffer.byteLength, 'bytes');
              
              // If payload looks like JSON ('{' or '['), treat as TEXT frame
              const b0 = new DataView(arrayBuffer).getUint8(0);
              if (b0 === 0x7b /* '{' */ || b0 === 0x5b /* '[' */) {
                const text = new TextDecoder().decode(arrayBuffer);
                console.log('🔁 Converting Blob-as-binary (JSON) back to text frame');
                clientSocket.send(text);
                return;
              }
              
              // CHECKPOINT A: PCM sample window analysis (first 2000 samples)
              const dv = new DataView(arrayBuffer);
              const n = arrayBuffer.byteLength >> 1; // number of 16-bit samples
              let min = 32767, max = -32768, sumAbs = 0;
              const sampleCount = Math.min(n, 2000);
              for (let i = 0; i < sampleCount; i++) {
                const s = dv.getInt16(i * 2, true); // little-endian
                if (s < min) min = s;
                if (s > max) max = s;
                sumAbs += Math.abs(s);
              }
              const avgAbs = sampleCount > 0 ? Math.round(sumAbs / sampleCount) : 0;
              console.log('🔊 PCM sample window:', { min, max, avgAbs, samples: sampleCount, bytes: arrayBuffer.byteLength });
              console.log('   Expected speech: min ~-30000..-1000, max ~+1000..+30000, avgAbs ~500..6000');
              
              // Drop odd-length frames (must be 16-bit aligned)
              if ((arrayBuffer.byteLength & 1) !== 0) {
                console.error('❌ Dropping odd-length binary frame', arrayBuffer.byteLength);
                return;
              }
              
              // Forward binary as binary (no JSON, no base64, no TextEncoder)
              try {
                if (clientSocket.readyState === WebSocket.OPEN) {
                  clientSocket.send(arrayBuffer);
                } else {
                  console.warn('⚠️ Client socket not open, skipping binary forward');
                }
              } catch (sendError) {
                console.error('❌ Error forwarding binary to client:', sendError);
              }
            } else {
              console.warn('⚠️ Unknown message type from Vertex AI:', typeof event.data);
            }
          } catch (error) {
            console.error('❌ Error processing Vertex message:', error);
            // Don't close connection on message processing errors
            try {
              if (clientSocket.readyState === WebSocket.OPEN) {
                clientSocket.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'Error processing AI response' 
                }));
              }
            } catch (_) {}
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
