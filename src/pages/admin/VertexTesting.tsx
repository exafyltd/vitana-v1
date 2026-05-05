import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminLiveStreamNavigation } from "@/config/navigation";
import { useVertexLive } from "@/hooks/useVertexLive";
import { VertexMediaPreview } from "@/components/vertex/VertexMediaPreview";
import { VertexDebugConsole } from "@/components/vertex/VertexDebugConsole";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { notify, notifyError } from '@/lib/i18n-toast';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

type TestStep = 
  | 'idle' 
  | 'connecting' 
  | 'text-send' 
  | 'text-response'
  | 'audio-input' 
  | 'audio-response'
  | 'screen-share'
  | 'screen-response'
  | 'camera-input'
  | 'camera-response'
  | 'complete';

interface TestResult {
  step: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  message: string;
  timestamp?: string;
}

type TestMode = 'quick' | 'full' | 'custom';

export default function VertexTesting() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentStep, setCurrentStep] = useState<TestStep>('idle');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testMode, setTestMode] = useState<TestMode>('quick');
  const [enabledTests, setEnabledTests] = useState({
    connection: true,
    textMessage: true,
    textResponse: true,
    audioInput: true,
    audioResponse: true,
    screenShare: false,
    screenResponse: false,
    cameraInput: false,
    cameraResponse: false,
  });

  const addLog = useCallback((level: LogEntry['level'], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, level, message }]);
  }, []);

  const {
    isConnected,
    connectionState,
    isRecording,
    isScreenSharing,
    isCameraActive,
    transcript,
    error,
    lastEvent,
    connect,
    disconnect,
    startAudio,
    stopAudio,
    startScreen,
    stopScreen,
    startCamera,
    stopCamera,
    sendText,
  } = useVertexLive();

  // Live diagnostics: reflect hook events into the debug console
  useEffect(() => {
    addLog('info', `Connection state changed: ${connectionState}`);
  }, [connectionState, addLog]);

  useEffect(() => {
    if (error) addLog('error', `Vertex error: ${error}`);
  }, [error, addLog]);

  useEffect(() => {
    if (lastEvent) addLog('info', `Event: ${lastEvent}`);
  }, [lastEvent, addLog]);

  // Helper utilities
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const waitForCondition = (
    condition: () => boolean,
    timeout: number,
    errorMsg: string
  ): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        if (condition()) {
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(errorMsg));
        } else {
          setTimeout(check, 100);
        }
      };
      
      check();
    });
  };

  const updateTestResult = (
    step: string,
    status: TestResult['status'],
    message: string
  ) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.step === step);
      if (existing) {
        return prev.map(r => 
          r.step === step 
            ? { ...r, status, message, timestamp: new Date().toLocaleTimeString() }
            : r
        );
      }
      return [...prev, { step, status, message, timestamp: new Date().toLocaleTimeString() }];
    });
  };

  // Test functions
  const testConnection = async () => {
    updateTestResult('connection', 'running', 'Checking authentication...');
    addLog('info', 'Starting connection test...');
    
    // Preflight: check auth before connecting
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      const msg = '❌ Not signed in (no authentication token)';
      updateTestResult('connection', 'failed', msg);
      addLog('error', msg);
      throw new Error('Not signed in - please authenticate first');
    }
    addLog('info', '✅ Authentication token found');
    updateTestResult('connection', 'running', 'Connecting to Vertex AI...');
    
    try {
      await connect();
      
      // Progress updates with fail-fast detection
      const startTime = Date.now();
      const progressInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const status = lastEvent || connectionState;
        updateTestResult('connection', 'running', `${status}... (${elapsed}s)`);
      }, 1000);
      
      try {
        await new Promise<void>((resolve, reject) => {
          const checkConnection = () => {
            const elapsed = Date.now() - startTime;
            
            // Fail fast on error state
            if (connectionState === 'error') {
              reject(new Error(error || 'Connection error'));
              return;
            }
            
            // Fail fast if disconnected within first 3s (transport failure)
            if (connectionState === 'disconnected' && elapsed <= 3000) {
              reject(new Error('WebSocket transport failed immediately'));
              return;
            }
            
            if (isConnected && connectionState === 'connected') {
              resolve();
            } else if (elapsed >= 15000) {
              reject(new Error(`Timeout after 15s - State: ${connectionState}, Event: ${lastEvent}`));
            } else {
              setTimeout(checkConnection, 100);
            }
          };
          checkConnection();
        });
        
        clearInterval(progressInterval);
        updateTestResult('connection', 'success', '✅ Connected successfully');
        addLog('info', 'Connection test passed');
      } catch (timeoutErr) {
        clearInterval(progressInterval);
        throw timeoutErr;
      }
    } catch (err) {
      const errorDetails = error || 'Unknown error';
      const stateInfo = `State: ${connectionState}`;
      const msg = err instanceof Error ? err.message : 'Connection failed';
      updateTestResult('connection', 'failed', `❌ ${msg} - ${stateInfo}`);
      addLog('error', `Connection test failed: ${msg} | ${errorDetails} | Check edge function logs`);
      throw err;
    } finally {
      // Only disconnect if we actually connected
      if (connectionState === 'connected') {
        disconnect();
      }
    }
  };

  const testTextMessage = async () => {
    updateTestResult('text-send', 'running', 'Sending test message...');
    addLog('info', 'Testing text message...');
    
    try {
      const testPrompt = "Say 'Hello' in one word";
      sendText(testPrompt);
      
      await sleep(2000);
      
      updateTestResult('text-send', 'success', '✅ Text message sent');
      addLog('info', 'Text message test passed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send text';
      updateTestResult('text-send', 'failed', `❌ ${msg}`);
      addLog('error', msg);
      throw err;
    }
  };

  const testTextResponse = async () => {
    updateTestResult('text-response', 'running', 'Waiting for AI text response...');
    addLog('info', 'Waiting for AI response...');
    
    try {
      const initialTranscript = transcript;
      
      const gotResponse = await waitForCondition(
        () => transcript !== initialTranscript && transcript.length > 0,
        10000,
        'No text response received'
      );
      
      if (gotResponse) {
        const preview = transcript.slice(0, 50);
        updateTestResult('text-response', 'success', `✅ AI responded: "${preview}..."`);
        addLog('info', `AI response received: ${preview}`);
      } else {
        throw new Error('No text response');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No response';
      updateTestResult('text-response', 'failed', `❌ ${msg}`);
      addLog('error', msg);
      throw err;
    }
  };

  const testAudioInput = async () => {
    updateTestResult('audio-input', 'running', '🎤 Recording audio for 5 seconds...');
    addLog('info', 'Starting audio input test...');
    
    try {
      await startAudio();
      await sleep(5000);
      stopAudio();
      
      updateTestResult('audio-input', 'success', '✅ Audio captured and sent');
      addLog('info', 'Audio input test passed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Audio capture failed';
      updateTestResult('audio-input', 'failed', `❌ ${msg}`);
      addLog('error', msg);
      throw err;
    }
  };

  const testAudioResponse = async () => {
    updateTestResult('audio-response', 'running', 'Waiting for AI audio playback...');
    addLog('info', 'Waiting for audio response...');
    
    try {
      await sleep(3000);
      
      updateTestResult('audio-response', 'success', '✅ Audio response played');
      addLog('info', 'Audio response test passed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No audio playback';
      updateTestResult('audio-response', 'failed', `❌ ${msg}`);
      addLog('error', msg);
      throw err;
    }
  };

  const testScreenShare = async () => {
    updateTestResult('screen-share', 'running', '🖥️ Starting screen share for 5 seconds...');
    addLog('info', 'Starting screen share test...');
    
    try {
      await startScreen();
      await sleep(5000);
      stopScreen();
      
      updateTestResult('screen-share', 'success', '✅ Screen shared successfully');
      addLog('info', 'Screen share test passed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Screen share failed';
      updateTestResult('screen-share', 'failed', `❌ ${msg}`);
      addLog('error', msg);
      throw err;
    }
  };

  const testScreenResponse = async () => {
    updateTestResult('screen-response', 'running', 'Asking AI: "What do you see on my screen?"');
    addLog('info', 'Testing screen analysis...');
    
    try {
      sendText("What do you see on my screen? Describe it briefly.");
      
      const initialTranscript = transcript;
      
      const gotResponse = await waitForCondition(
        () => transcript !== initialTranscript && transcript.length > 10,
        15000,
        'No screen analysis response'
      );
      
      if (gotResponse) {
        const preview = transcript.slice(0, 60);
        updateTestResult('screen-response', 'success', `✅ AI analyzed screen: "${preview}..."`);
        addLog('info', `Screen analysis: ${preview}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Screen analysis failed';
      updateTestResult('screen-response', 'failed', `❌ ${msg}`);
      addLog('error', msg);
      throw err;
    }
  };

  const testCameraInput = async () => {
    updateTestResult('camera-input', 'running', '📹 Starting camera for 5 seconds...');
    addLog('info', 'Starting camera input test...');
    
    try {
      await startCamera();
      await sleep(5000);
      stopCamera();
      
      updateTestResult('camera-input', 'success', '✅ Camera feed sent successfully');
      addLog('info', 'Camera input test passed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera capture failed';
      updateTestResult('camera-input', 'failed', `❌ ${msg}`);
      addLog('error', msg);
      throw err;
    }
  };

  const testCameraResponse = async () => {
    updateTestResult('camera-response', 'running', 'Asking AI: "What object did you see?"');
    addLog('info', 'Testing camera analysis...');
    
    try {
      sendText("What object or scene did you see from my camera? Describe it.");
      
      const initialTranscript = transcript;
      
      const gotResponse = await waitForCondition(
        () => transcript !== initialTranscript && transcript.length > 10,
        15000,
        'No camera analysis response'
      );
      
      if (gotResponse) {
        const preview = transcript.slice(0, 60);
        updateTestResult('camera-response', 'success', `✅ AI analyzed camera: "${preview}..."`);
        addLog('info', `Camera analysis: ${preview}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera analysis failed';
      updateTestResult('camera-response', 'failed', `❌ ${msg}`);
      addLog('error', msg);
      throw err;
    }
  };

  // Main test runner
  const runAutomatedTest = async () => {
    setIsTestRunning(true);
    setTestResults([]);
    setCurrentStep('connecting');
    
    try {
      // Phase 1: Connection
      if (enabledTests.connection) {
        await testConnection();
      }
      
      // Phase 2: Text Communication
      if (enabledTests.textMessage) {
        await testTextMessage();
      }
      if (enabledTests.textResponse) {
        await testTextResponse();
      }
      
      // Phase 3: Audio Communication
      if (enabledTests.audioInput) {
        await testAudioInput();
      }
      if (enabledTests.audioResponse) {
        await testAudioResponse();
      }
      
      // Phase 4: Screen Sharing
      if (enabledTests.screenShare) {
        await testScreenShare();
      }
      if (enabledTests.screenResponse) {
        await testScreenResponse();
      }
      
      // Phase 5: Camera Input
      if (enabledTests.cameraInput) {
        await testCameraInput();
      }
      if (enabledTests.cameraResponse) {
        await testCameraResponse();
      }
      
      // Success!
      setCurrentStep('complete');
      const totalTests = Object.values(enabledTests).filter(Boolean).length;
      toast({
        title: `🎉 All ${totalTests} Tests Passed!`,
        description: testMode === 'full' 
          ? "All multimodal features working perfectly" 
          : "Core features working perfectly",
      });
      
    } catch (error) {
      notifyError('toasts.admin.testFailed2');
    } finally {
      disconnect();
      setIsTestRunning(false);
    }
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
    notify('toasts.admin.logsExported', 'toasts.admin.debugLogsDownloadedSuccessfully');
  };

  const getTestIcon = (step: string) => {
    if (step.includes('audio')) return '🎤';
    if (step.includes('screen')) return '🖥️';
    if (step.includes('camera')) return '📹';
    if (step.includes('text')) return '💬';
    if (step.includes('connection')) return '🔌';
    return '📋';
  };

  const totalEnabledTests = Object.values(enabledTests).filter(Boolean).length;
  const passedTests = testResults.filter(r => r.status === 'success').length;

  return (
    <AppLayout>
      <SEO 
        title="Vertex AI Testing | Admin | VITANA" 
        description="Automated multimodal testing for Vertex AI with visual feedback" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminLiveStreamNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title="Vertex AI Testing Wizard 🧪"
            description="Automated multimodal testing with one-click validation"
            emoji="🚀"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Test Wizard */}
            <div className="space-y-6">
              {/* Test Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Test Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Test Mode Selector */}
                    <div className="flex gap-2">
                      <Button 
                        variant={testMode === 'quick' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setTestMode('quick');
                          setEnabledTests({
                            connection: true,
                            textMessage: true,
                            textResponse: true,
                            audioInput: true,
                            audioResponse: true,
                            screenShare: false,
                            screenResponse: false,
                            cameraInput: false,
                            cameraResponse: false,
                          });
                        }}
                        disabled={isTestRunning}
                      >
                        ⚡ Quick (5 tests, ~20s)
                      </Button>
                      
                      <Button 
                        variant={testMode === 'full' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setTestMode('full');
                          setEnabledTests({
                            connection: true,
                            textMessage: true,
                            textResponse: true,
                            audioInput: true,
                            audioResponse: true,
                            screenShare: true,
                            screenResponse: true,
                            cameraInput: true,
                            cameraResponse: true,
                          });
                        }}
                        disabled={isTestRunning}
                      >
                        🔬 Full (9 tests, ~45s)
                      </Button>
                      
                      <Button 
                        variant={testMode === 'custom' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTestMode('custom')}
                        disabled={isTestRunning}
                      >
                        ⚙️ Custom
                      </Button>
                    </div>
                    
                    {/* Custom Checkboxes */}
                    {testMode === 'custom' && (
                      <div className="grid grid-cols-2 gap-2 p-3 border rounded">
                        <label className="flex items-center gap-2 text-sm">
                          <input 
                            type="checkbox" 
                            checked={enabledTests.audioInput}
                            onChange={(e) => setEnabledTests(prev => ({
                              ...prev, 
                              audioInput: e.target.checked,
                              audioResponse: e.target.checked
                            }))}
                            disabled={isTestRunning}
                          />
                          🎤 Audio
                        </label>
                        
                        <label className="flex items-center gap-2 text-sm">
                          <input 
                            type="checkbox" 
                            checked={enabledTests.screenShare}
                            onChange={(e) => setEnabledTests(prev => ({
                              ...prev, 
                              screenShare: e.target.checked,
                              screenResponse: e.target.checked
                            }))}
                            disabled={isTestRunning}
                          />
                          🖥️ Screen
                        </label>
                        
                        <label className="flex items-center gap-2 text-sm">
                          <input 
                            type="checkbox" 
                            checked={enabledTests.cameraInput}
                            onChange={(e) => setEnabledTests(prev => ({
                              ...prev, 
                              cameraInput: e.target.checked,
                              cameraResponse: e.target.checked
                            }))}
                            disabled={isTestRunning}
                          />
                          📹 Camera
                        </label>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Test Control */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Automated Test Wizard</CardTitle>
                  <CardDescription>One-click multimodal validation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Big Start Button */}
                  {!isTestRunning && currentStep === 'idle' && (
                    <Button 
                      onClick={runAutomatedTest}
                      size="lg"
                      className="w-full h-16 text-lg"
                    >
                      🚀 Start Automated Test ({totalEnabledTests} tests)
                    </Button>
                  )}
                  
                  {/* Progress Indicator */}
                  {isTestRunning && (
                    <div className="space-y-2">
                      <Progress value={(passedTests / totalEnabledTests) * 100} />
                      <p className="text-sm text-center text-muted-foreground">
                        {passedTests} / {totalEnabledTests} tests passed
                      </p>
                      <div className="space-y-2">
                        <p className="text-xs text-center text-muted-foreground">
                          Connection: {connectionState}
                          {connectionState === 'connecting' && (
                            <span className="ml-2 inline-block align-middle">
                              <span className="inline-block h-3 w-3 animate-spin border-2 border-current border-t-transparent rounded-full" />
                            </span>
                          )}
                        </p>
                        {lastEvent && (
                          <p className="text-xs text-center font-mono text-muted-foreground">
                            {lastEvent}
                          </p>
                        )}
                        {error && (
                          <p className="text-xs text-center text-destructive">
                            ⚠️ {error}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Test Results */}
                  <div className="space-y-2">
                    {testResults.map((result, index) => (
                      <div 
                        key={index}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border text-sm",
                          result.status === 'success' && "bg-green-50 border-green-200",
                          result.status === 'failed' && "bg-red-50 border-red-200",
                          result.status === 'running' && "bg-blue-50 border-blue-200",
                          result.status === 'pending' && "bg-gray-50 border-gray-200"
                        )}
                      >
                        {/* Status Icon */}
                        <div className="flex-shrink-0">
                          {result.status === 'success' && <span className="text-xl">✅</span>}
                          {result.status === 'failed' && <span className="text-xl">❌</span>}
                          {result.status === 'running' && (
                            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                          )}
                          {result.status === 'pending' && <span className="text-xl">⏳</span>}
                        </div>
                        
                        {/* Test Icon */}
                        <span className="text-lg">{getTestIcon(result.step)}</span>
                        
                        {/* Message */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs uppercase tracking-wide">{result.step.replace('-', ' ')}</p>
                          <p className="text-xs text-muted-foreground truncate">{result.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Complete State */}
                  {currentStep === 'complete' && (
                    <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                      <div className="text-center space-y-2">
                        <div className="text-5xl">🎉</div>
                        <h3 className="text-lg font-bold text-green-900">All Tests Passed!</h3>
                        <p className="text-sm text-green-700">
                          {testMode === 'full' ? 'All multimodal features' : 'Core features'} working perfectly
                        </p>
                        <Button 
                          onClick={() => {
                            setCurrentStep('idle');
                            setTestResults([]);
                          }}
                          variant="outline"
                          size="sm"
                          className="mt-3"
                        >
                          Run Tests Again
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Cancel Button */}
                  {isTestRunning && (
                    <Button 
                      onClick={() => {
                        setIsTestRunning(false);
                        disconnect();
                        setCurrentStep('idle');
                      }}
                      variant="destructive"
                      size="sm"
                      className="w-full"
                    >
                      Cancel Test
                    </Button>
                  )}

                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                      {error}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Visual Feedback */}
            <div className="space-y-6">
              {/* Media Preview */}
              <VertexMediaPreview 
                isScreenSharing={isScreenSharing}
                isCameraActive={isCameraActive}
                isRecording={isRecording}
              />

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
                  <p>✅ <strong>Quick Mode:</strong> Tests core features (~20s)</p>
                  <p>✅ <strong>Full Mode:</strong> Tests all multimodal inputs (~45s)</p>
                  <p>✅ <strong>Custom Mode:</strong> Select specific tests to run</p>
                  <p>✅ <strong>Camera Test:</strong> Point at an object for AI to see</p>
                  <p>✅ <strong>Screen Test:</strong> Open a document for AI to analyze</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
