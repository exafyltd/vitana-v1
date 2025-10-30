import { useState, useEffect, useCallback } from "react";

const BASE_EVENTS = (import.meta.env.VITE_EVENTS_BASE_URL || "https://oasis-operator-86804897789.us-central1.run.app/api/v1").trim();
const BASE_OPERATOR = (import.meta.env.VITE_OPERATOR_BASE_URL || "https://oasis-operator-86804897789.us-central1.run.app/api/v1").trim();
const STATUS_URL = `${BASE_EVENTS.replace('/api/v1','')}/status/cmdhub.json`;

type ServiceStatus = "UP" | "DOWN";
type BackendStatus = "ONLINE" | "OFFLINE" | "PARTIAL";

interface ServiceCheck {
  name: string;
  status: ServiceStatus;
  lastCode?: number;
  lastTime?: string;
}

interface ConnectionEvent {
  timestamp: string;
  type: "connected" | "retry" | "error";
  message: string;
}

interface BackendStatusData {
  backendStatus: BackendStatus;
  services: ServiceCheck[];
  connectionEvents: ConnectionEvent[];
  liveStatus: boolean;
  allowOrigin: string;
  latency?: number;
  lastResponseTime?: number;
}

export function useBackendStatus() {
  const [data, setData] = useState<BackendStatusData>({
    backendStatus: "OFFLINE",
    services: [
      { name: "Events API", status: "DOWN" },
      { name: "Chat API", status: "DOWN" },
      { name: "SSE Stream", status: "DOWN" }
    ],
    connectionEvents: [],
    liveStatus: false,
    allowOrigin: "",
  });

  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);

  const addConnectionEvent = useCallback((type: ConnectionEvent["type"], message: string) => {
    setData(prev => ({
      ...prev,
      connectionEvents: [
        {
          timestamp: new Date().toISOString(),
          type,
          message
        },
        ...prev.connectionEvents.slice(0, 49) // Keep last 50
      ]
    }));
  }, []);

  const testServices = useCallback(async () => {
    const results: ServiceCheck[] = [];
    let upCount = 0;
    const startTime = Date.now();

    // Check Live Status
    try {
      const res = await fetch(STATUS_URL, { cache: "no-store" });
      const status = await res.json();
      const responseTime = Date.now() - startTime;
      
      setData(prev => ({
        ...prev,
        liveStatus: Boolean(status.live),
        allowOrigin: status.allow_origin || "",
        lastResponseTime: responseTime
      }));

      setLatencyHistory(prev => [...prev.slice(-4), responseTime]);
      
      if (status.live) {
        addConnectionEvent("connected", "Live status check successful");
      }
    } catch (error) {
      addConnectionEvent("error", `Live status check failed: ${error}`);
    }

    // Test Events API
    try {
      const start = Date.now();
      const response = await fetch(`${BASE_EVENTS}/events?limit=1&hours=1`, {
        mode: "cors",
        credentials: "include",
      });
      const latency = Date.now() - start;
      
      results.push({
        name: "Events API",
        status: "UP",
        lastCode: response.status,
        lastTime: new Date().toISOString()
      });
      upCount++;
      
      setLatencyHistory(prev => [...prev.slice(-4), latency]);
      addConnectionEvent("connected", `Events API connected (${latency}ms)`);
    } catch (error) {
      results.push({
        name: "Events API",
        status: "DOWN",
        lastTime: new Date().toISOString()
      });
      addConnectionEvent("error", `Events API failed: ${error}`);
    }

    // Test Chat API
    try {
      const start = Date.now();
      const response = await fetch(`${BASE_OPERATOR}/chat/thread?vtid=test-001`, {
        mode: "cors",
        credentials: "include",
      });
      const latency = Date.now() - start;
      
      results.push({
        name: "Chat API",
        status: "UP",
        lastCode: response.status,
        lastTime: new Date().toISOString()
      });
      upCount++;
      
      setLatencyHistory(prev => [...prev.slice(-4), latency]);
      addConnectionEvent("connected", `Chat API connected (${latency}ms)`);
    } catch (error) {
      results.push({
        name: "Chat API",
        status: "DOWN",
        lastTime: new Date().toISOString()
      });
      addConnectionEvent("error", `Chat API failed: ${error}`);
    }

    // Test SSE (this is checked by the streaming component, so we defer to that)
    results.push({
      name: "SSE Stream",
      status: data.services.find(s => s.name === "SSE Stream")?.status || "DOWN",
      lastTime: data.services.find(s => s.name === "SSE Stream")?.lastTime
    });

    // Calculate overall backend status
    const backendStatus: BackendStatus = 
      upCount === 0 ? "OFFLINE" :
      upCount < results.length ? "PARTIAL" :
      "ONLINE";

    // Calculate average latency from last 5 measurements
    const avgLatency = latencyHistory.length > 0
      ? Math.round(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length)
      : undefined;

    setData(prev => ({
      ...prev,
      backendStatus,
      services: results,
      latency: avgLatency
    }));
  }, [addConnectionEvent, data.services, latencyHistory]);

  const updateSSEStatus = useCallback((connected: boolean) => {
    setData(prev => ({
      ...prev,
      services: prev.services.map(s => 
        s.name === "SSE Stream" 
          ? { ...s, status: connected ? "UP" : "DOWN", lastTime: new Date().toISOString() }
          : s
      )
    }));

    if (connected) {
      addConnectionEvent("connected", "SSE stream established");
    } else {
      addConnectionEvent("error", "SSE stream disconnected");
    }
  }, [addConnectionEvent]);

  const retryAll = useCallback(() => {
    addConnectionEvent("retry", "Retrying all connections...");
    testServices();
  }, [testServices, addConnectionEvent]);

  useEffect(() => {
    testServices();
    const interval = setInterval(testServices, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [testServices]);

  return {
    ...data,
    updateSSEStatus,
    retryAll,
    diagnosticInfo: {
      eventsUrl: `${BASE_EVENTS}/events`,
      operatorUrl: `${BASE_OPERATOR}/chat`,
      sseUrl: `${BASE_EVENTS}/events/stream`,
      origin: window.location.origin,
      allowOrigin: data.allowOrigin,
    }
  };
}
