import { useEffect } from "react";

const BASE_EVENTS = import.meta.env.VITE_EVENTS_BASE_URL || "https://oasis-operator-86804897789.us-central1.run.app/api/v1";
const BASE_OPERATOR = import.meta.env.VITE_OPERATOR_BASE_URL || "https://oasis-operator-86804897789.us-central1.run.app/api/v1";

export function BackendDiagnostic() {
  useEffect(() => {
    console.log("🔍 [Backend Diagnostic] Starting connection tests...");
    console.log("📍 VITE_EVENTS_BASE_URL:", BASE_EVENTS);
    console.log("📍 VITE_OPERATOR_BASE_URL:", BASE_OPERATOR);
    
    async function testEndpoint(base: string, endpoint: string, label: string) {
      const url = `${base}/${endpoint}`;
      console.log(`\n🧪 Testing ${label}: ${url}`);
      
      try {
        const response = await fetch(url, {
          mode: "cors",
          credentials: "include",
        });
        
        const text = await response.text().catch(() => "");
        console.log(`✅ ${label} - Status: ${response.status}`);
        console.log(`   Response preview: ${text.substring(0, 200)}`);
        
        return { success: true, status: response.status, preview: text.substring(0, 100) };
      } catch (error) {
        console.error(`❌ ${label} - FAILED:`, error);
        return { success: false, error: String(error) };
      }
    }
    
    async function testSSE() {
      console.log(`\n🌊 Testing SSE: ${BASE_EVENTS}/events/stream`);
      
      try {
        const es = new EventSource(`${BASE_EVENTS}/events/stream`, { 
          withCredentials: true 
        } as any);
        
        es.onopen = () => {
          console.log("✅ SSE OPEN - Connection established!");
          es.close();
        };
        
        es.onmessage = (e) => {
          console.log("📨 SSE EVENT received:", e.data);
          es.close();
        };
        
        es.onerror = (e) => {
          console.error("❌ SSE ERROR:", e);
          es.close();
        };
        
        // Auto-close after 5s to prevent hanging
        setTimeout(() => {
          console.log("⏱️ SSE test timeout - closing connection");
          es.close();
        }, 5000);
      } catch (error) {
        console.error("❌ SSE connection failed:", error);
      }
    }
    
    async function runDiagnostics() {
      // Test REST endpoints
      await testEndpoint(BASE_EVENTS, "events?limit=1&hours=1", "GET /events");
      await testEndpoint(BASE_OPERATOR, "chat/thread?vtid=test-001", "GET /chat/thread");
      
      // Test SSE
      await testSSE();
      
      console.log("\n✨ Diagnostic complete - check results above");
    }
    
    runDiagnostics();
  }, []);
  
  return null; // This component only logs, no UI
}
