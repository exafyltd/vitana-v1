import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminLiveStreamNavigation } from "@/config/navigation";
import { useVertexLive } from "@/hooks/useVertexLive";
import { VertexVisualFeedback } from "@/components/vertex/VertexVisualFeedback";
import { VertexDebugConsole } from "@/components/vertex/VertexDebugConsole";

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export default function VertexTesting() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  const addLog = useCallback((level: LogEntry['level'], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, level, message }]);
  }, []);

  const {
    isConnected,
    isConnecting,
    isError,
    connectionState,
    isRecording,
    transcript,
    error,
    connect,
    disconnect,
    startAudio,
    stopAudio,
  } = useVertexLive();

  const handleConnect = async () => {
    addLog('info', 'Attempting to connect to Vertex AI...');
    try {
      await connect();
      addLog('info', 'Successfully connected to Vertex AI');
      toast({
        title: "Connected",
        description: "Vertex AI stream is ready",
      });
    } catch (err) {
      addLog('error', `Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast({
        title: "Connection Failed",
        description: error || "Failed to connect to Vertex AI",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = () => {
    addLog('info', 'Disconnecting from Vertex AI...');
    disconnect();
    addLog('info', 'Disconnected successfully');
    toast({
      title: "Disconnected",
      description: "Vertex AI stream stopped",
    });
  };

  const handleStartAudio = async () => {
    addLog('info', 'Starting audio recording...');
    try {
      await startAudio();
      addLog('info', 'Audio recording started');
      toast({
        title: "Recording Started",
        description: "Microphone is active",
      });
    } catch (err) {
      addLog('error', `Failed to start audio: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast({
        title: "Audio Error",
        description: "Failed to access microphone",
        variant: "destructive",
      });
    }
  };

  const handleStopAudio = () => {
    addLog('info', 'Stopping audio recording...');
    stopAudio();
    addLog('info', 'Audio recording stopped');
    toast({
      title: "Recording Stopped",
      description: "Microphone is inactive",
    });
  };

  const handleExportLogs = () => {
    const logsText = logs.map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`).join('\n');
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vertex-debug-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Logs Exported",
      description: "Debug logs downloaded successfully",
    });
  };

  const testScenarios = [
    { label: "Say Hello", prompt: "Say hello and introduce yourself" },
    { label: "Tell a Joke", prompt: "Tell me a short funny joke" },
    { label: "Count to 5", prompt: "Count from 1 to 5" },
    { label: "Wallet Balance", prompt: "What's in my wallet?" },
  ];

  return (
    <AppLayout>
      <SEO 
        title="Vertex AI Testing | Admin | VITANA" 
        description="Test and debug Vertex AI streaming with visual feedback" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminLiveStreamNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title="Vertex AI Testing"
            description="Test voice streaming with comprehensive visual feedback and debugging"
            emoji="🧪"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Controls & Feedback */}
            <div className="space-y-6">
              {/* Control Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Control Panel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    {!isConnected && !isConnecting && (
                      <Button onClick={handleConnect} className="flex-1">
                        Connect
                      </Button>
                    )}
                    {(isConnected || isConnecting) && (
                      <Button onClick={handleDisconnect} variant="destructive" className="flex-1">
                        Disconnect
                      </Button>
                    )}
                  </div>

                  {isConnected && (
                    <div className="flex gap-2">
                      {!isRecording ? (
                        <Button onClick={handleStartAudio} variant="secondary" className="flex-1">
                          Start Audio
                        </Button>
                      ) : (
                        <Button onClick={handleStopAudio} variant="outline" className="flex-1">
                          Stop Audio
                        </Button>
                      )}
                    </div>
                  )}

                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                      {error}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Visual Feedback */}
              <VertexVisualFeedback
                connectionState={connectionState}
                isRecording={isRecording}
                audioLevel={audioLevel}
                userTranscript={transcript}
                aiTranscript=""
                isAISpeaking={isAISpeaking}
              />
            </div>

            {/* Right Column: Test Scenarios & Debug */}
            <div className="space-y-6">
              {/* Test Scenarios */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Test Scenarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {testScenarios.map((scenario, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        disabled={!isConnected || isRecording}
                        onClick={() => {
                          addLog('info', `Testing: ${scenario.prompt}`);
                          toast({
                            title: "Test Scenario",
                            description: scenario.prompt,
                          });
                        }}
                      >
                        {scenario.label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Click a scenario to test the AI's response. Make sure audio is started first.
                  </p>
                </CardContent>
              </Card>

              {/* Debug Console */}
              <VertexDebugConsole 
                logs={logs} 
                onExportLogs={handleExportLogs}
              />

              {/* Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Testing Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>✅ Check connection status badge turns green</p>
                  <p>✅ Verify audio level meter shows activity</p>
                  <p>✅ Confirm transcript appears for your speech</p>
                  <p>✅ Watch for AI speaking indicator</p>
                  <p>✅ Export logs if you encounter issues</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
