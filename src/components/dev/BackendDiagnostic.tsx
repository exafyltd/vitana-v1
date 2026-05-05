import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { t } from '@/lib/i18n-toast';

const BASE_EVENTS = (import.meta.env.VITE_EVENTS_BASE_URL || "https://oasis-operator-86804897789.us-central1.run.app/api/v1").trim();
const BASE_OPERATOR = (import.meta.env.VITE_OPERATOR_BASE_URL || "https://oasis-operator-86804897789.us-central1.run.app/api/v1").trim();
const STATUS_URL = `${BASE_EVENTS.replace('/api/v1','')}/status/cmdhub.json`;

type TestResult = { status: "testing" | "success" | "failed"; message?: string };

export function BackendDiagnostic() {
  const [results, setResults] = useState<Record<string, TestResult>>({
    events: { status: "testing" },
    chat: { status: "testing" },
    sse: { status: "testing" }
  });
  const [liveStatus, setLiveStatus] = useState<boolean>(false);
  const [allowOrigin, setAllowOrigin] = useState<string>("");

  useEffect(() => {
    console.log("🔍 [Backend Diagnostic] Starting connection tests...");
    console.log("📍 VITE_EVENTS_BASE_URL:", BASE_EVENTS);
    console.log("📍 VITE_OPERATOR_BASE_URL:", BASE_OPERATOR);
    console.log("📍 STATUS_URL:", STATUS_URL);
    
    async function checkLiveStatus() {
      try {
        const res = await fetch(STATUS_URL, { cache: "no-store" });
        const status = await res.json();
        console.log("✅ Live status check:", status);
        setLiveStatus(Boolean(status.live));
        setAllowOrigin(status.allow_origin || "");
      } catch (error) {
        console.error("❌ Live status check failed:", error);
        setLiveStatus(false);
      }
    }
    
    async function testEndpoint(base: string, endpoint: string, label: string, key: string) {
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
        
        setResults(prev => ({ 
          ...prev, 
          [key]: { status: "success", message: `${response.status}` } 
        }));
        return { success: true, status: response.status };
      } catch (error) {
        console.error(`❌ ${label} - FAILED:`, error);
        setResults(prev => ({ 
          ...prev, 
          [key]: { status: "failed", message: String(error).substring(0, 50) } 
        }));
        return { success: false, error: String(error) };
      }
    }
    
    async function testSSE() {
      console.log(`\n🌊 Testing SSE: ${BASE_EVENTS}/events/stream`);
      
      try {
        // Use credentials to match production SSE auth behavior
        const es = new EventSource(`${BASE_EVENTS}/events/stream`, { withCredentials: true });
        
        let opened = false;
        
        es.onopen = () => {
          console.log("✅ SSE OPEN - Connection established!");
          opened = true;
          setResults(prev => ({ 
            ...prev, 
            sse: { status: "success", message: "Connected" } 
          }));
          setTimeout(() => es.close(), 1000);
        };
        
        es.onmessage = (e) => {
          console.log("📨 SSE EVENT received:", e.data);
        };
        
        es.onerror = (e) => {
          console.error("❌ SSE ERROR:", e);
          if (!opened) {
            setResults(prev => ({ 
              ...prev, 
              sse: { status: "failed", message: "Connection failed" } 
            }));
          }
          es.close();
        };
        
        setTimeout(() => {
          if (!opened) {
            console.log("⏱️ SSE test timeout");
            setResults(prev => ({ 
              ...prev, 
              sse: { status: "failed", message: "Timeout" } 
            }));
          }
          es.close();
        }, 5000);
      } catch (error) {
        console.error("❌ SSE connection failed:", error);
        setResults(prev => ({ 
          ...prev, 
          sse: { status: "failed", message: String(error).substring(0, 50) } 
        }));
      }
    }
    
    async function runDiagnostics() {
      // Check live status first
      await checkLiveStatus();
      
      // Test REST endpoints
      await testEndpoint(BASE_EVENTS, "events?limit=1&hours=1", "GET /events", "events");
      await testEndpoint(BASE_OPERATOR, "chat/thread?vtid=test-001", "GET /chat/thread", "chat");
      
      // Test SSE
      await testSSE();
      
      console.log("\n✨ Diagnostic complete - check results above");
    }
    
    runDiagnostics();
  }, []);
  
  const allSuccess = Object.values(results).every(r => r.status === "success");
  const anyTesting = Object.values(results).some(r => r.status === "testing");
  
  return (
    <div className="fixed top-4 right-4 z-50 bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg min-w-[200px]">
      <div className="font-semibold text-sm mb-2 flex items-center gap-2">
        Backend Status
        {anyTesting && <Loader2 className="w-3 h-3 animate-spin" />}
        {!anyTesting && liveStatus && allSuccess && <Badge variant="success">LIVE</Badge>}
        {!anyTesting && (!liveStatus || !allSuccess) && <Badge variant="destructive">OFFLINE</Badge>}
      </div>
      {allowOrigin && (
        <div className="text-[10px] text-muted-foreground mb-1">
          Origin: {allowOrigin}
        </div>
      )}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span>{t('screens.dev.eventsApi')}</span>
          {results.events.status === "testing" && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
          {results.events.status === "success" && <CheckCircle className="w-3 h-3 text-green-600" />}
          {results.events.status === "failed" && <XCircle className="w-3 h-3 text-destructive" />}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>{t('screens.dev.chatApi')}</span>
          {results.chat.status === "testing" && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
          {results.chat.status === "success" && <CheckCircle className="w-3 h-3 text-green-600" />}
          {results.chat.status === "failed" && <XCircle className="w-3 h-3 text-destructive" />}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>{t('screens.dev.sseStream')}</span>
          {results.sse.status === "testing" && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
          {results.sse.status === "success" && <CheckCircle className="w-3 h-3 text-green-600" />}
          {results.sse.status === "failed" && <XCircle className="w-3 h-3 text-destructive" />}
        </div>
      </div>
    </div>
  );
}
