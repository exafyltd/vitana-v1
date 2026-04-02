import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Eye, Monitor, Route, Clock, ArrowRight, CheckCircle2, XCircle, AlertCircle, Navigation, Layers, Brain } from "lucide-react";
import { devCommandNavigation } from "@/config/dev-navigation";
import { useVitanalandNavigation } from "@/context/VitanalandNavigationContext";
import { resolveScreen, resolveModule, SCREEN_REGISTRY, MODULE_DESCRIPTIONS, type ScreenModule } from "@/lib/screen-registry";
import { getScreenContextPayload } from "@/lib/getScreenContextPayload";

/** Test routes to cycle through for manual QA */
const TEST_ROUTES = [
  { path: "/home", expected: "HOME-001" },
  { path: "/comm/events-meetups", expected: "COMM-002" },
  { path: "/comm/live-rooms", expected: "COMM-003" },
  { path: "/comm/media-hub", expected: "COMM-004" },
  { path: "/comm/groups", expected: "COMM-009" },
  { path: "/discover", expected: "DISC-001" },
  { path: "/discover/supplements", expected: "DISC-002" },
  { path: "/health", expected: "HLTH-001" },
  { path: "/health/my-biology", expected: "HLTH-003" },
  { path: "/health/pillars", expected: "HLTH-006" },
  { path: "/inbox", expected: "INBX-001" },
  { path: "/wallet", expected: "WLLT-001" },
  { path: "/wallet/rewards", expected: "WLLT-004" },
  { path: "/memory", expected: "MEMO-001" },
  { path: "/memory/diary", expected: "MEMO-003" },
  { path: "/settings", expected: "SETT-001" },
  { path: "/settings/privacy", expected: "SETT-003" },
  { path: "/ai/insights", expected: "AI-002" },
  { path: "/sharing/campaigns", expected: "SHAR-002" },
];

function StatusIcon({ pass }: { pass: boolean | null }) {
  if (pass === null) return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
  return pass
    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
    : <XCircle className="w-4 h-4 text-red-500" />;
}

export default function ScreenAwarenessQA() {
  const [activeTab, setActiveTab] = useState("live");
  const { screenContext } = useVitanalandNavigation();
  const location = useLocation();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({});

  // Force refresh payload display
  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(k => k + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  const currentPayload = getScreenContextPayload();

  // Run automated route resolution tests
  const runResolutionTests = () => {
    const results: Record<string, boolean | null> = {};
    TEST_ROUTES.forEach(({ path, expected }) => {
      const screen = resolveScreen(path);
      results[path] = screen?.id === expected;
    });
    setTestResults(results);
  };

  // Count registry stats
  const registryEntries = Object.keys(SCREEN_REGISTRY).length;
  const moduleCount = new Set(Object.values(SCREEN_REGISTRY).map(s => s.module)).size;
  const totalCapabilities = Object.values(SCREEN_REGISTRY).reduce((sum, s) => sum + s.capabilities.length, 0);

  return (
    <>
      <SEO
        title="Vitana DEV — Screen Awareness QA"
        description="Manual testing for AI assistant screen context awareness"
        canonical={window.location.href}
      />

      <SubNavigation items={devCommandNavigation} />

      <div className="p-6 pb-24 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">

          <DevStandardHeader
            title="Screen Awareness QA"
            description="Test and verify that the AI assistant correctly detects which screen the user is viewing"
            emoji="👁️"
          />

          <UtilityActionButton>
            <Button size="sm" variant="outline" onClick={() => setRefreshKey(k => k + 1)}>
              <Eye className="w-4 h-4 mr-2" />
              Refresh Payload
            </Button>
            <Button size="sm" onClick={runResolutionTests}>
              <Route className="w-4 h-4 mr-2" />
              Run Route Tests
            </Button>
          </UtilityActionButton>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{registryEntries}</div>
                <div className="text-xs text-muted-foreground">Registered Screens</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{moduleCount}</div>
                <div className="text-xs text-muted-foreground">Modules</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{totalCapabilities}</div>
                <div className="text-xs text-muted-foreground">Total Capabilities</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">
                  {screenContext.current ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-amber-500">No Match</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Current Detection</div>
              </CardContent>
            </Card>
          </div>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="live">
                <Monitor className="w-4 h-4 mr-1 inline" /> Live Context
              </SplitBarTrigger>
              <SplitBarTrigger value="tests">
                <Route className="w-4 h-4 mr-1 inline" /> Route Tests
              </SplitBarTrigger>
              <SplitBarTrigger value="registry">
                <Layers className="w-4 h-4 mr-1 inline" /> Full Registry
              </SplitBarTrigger>
              <SplitBarTrigger value="payload">
                <Brain className="w-4 h-4 mr-1 inline" /> AI Payload
              </SplitBarTrigger>
            </SplitBarList>

            {/* ── TAB 1: Live Context ─────────────────────────── */}
            <SplitBarContent value="live" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Current Screen Detection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Eye className="w-5 h-5" /> Current Screen Detection
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pathname</span>
                        <code className="bg-muted px-2 py-0.5 rounded text-xs">{location.pathname}</code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Screen ID</span>
                        <Badge variant={screenContext.current ? "default" : "secondary"}>
                          {screenContext.current?.id || "—"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Screen Name</span>
                        <span className="font-medium">{screenContext.current?.name || "Unregistered"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Module</span>
                        <Badge variant="outline">{screenContext.module}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Module Desc</span>
                        <span className="text-xs text-right max-w-[200px]">{screenContext.moduleDescription}</span>
                      </div>
                    </div>
                    {screenContext.current?.description && (
                      <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-xs">
                        {screenContext.current.description}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Navigation History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Navigation className="w-5 h-5" /> Navigation History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {screenContext.previous && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Previous:</span>
                          <Badge variant="secondary">{screenContext.previous.name}</Badge>
                        </div>
                      )}
                      <div className="space-y-1">
                        {screenContext.history.length > 0 ? (
                          screenContext.history.map((s, i) => (
                            <div key={`${s.id}-${i}`} className="flex items-center gap-2 text-xs">
                              {i > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                              <Badge variant={i === 0 ? "default" : "outline"} className="text-xs">
                                {s.name}
                              </Badge>
                              <span className="text-muted-foreground">{s.id}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">No navigation history yet. Navigate to different screens to build history.</p>
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>Entered at: {new Date(screenContext.enteredAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Capabilities */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Screen Capabilities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {screenContext.current?.capabilities.length ? (
                      <div className="flex flex-wrap gap-1">
                        {screenContext.current.capabilities.map(cap => (
                          <Badge key={cap} variant="secondary" className="text-xs">{cap}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No capabilities registered for current screen.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Prompt Hint */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">AI Prompt Hint</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {screenContext.current?.promptHint ? (
                      <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded text-sm italic">
                        "{screenContext.current.promptHint}"
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No prompt hint for current screen.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Navigate */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Quick Navigate (Test Screen Detection)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {TEST_ROUTES.slice(0, 12).map(({ path, expected }) => (
                        <Button
                          key={path}
                          size="sm"
                          variant={location.pathname === path ? "default" : "outline"}
                          onClick={() => navigate(path)}
                          className="text-xs"
                        >
                          {path.split("/").pop() || "home"}
                          <span className="ml-1 text-[10px] opacity-60">{expected}</span>
                        </Button>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Click any button to navigate there and verify that screen detection updates correctly above.
                      Navigate back to this page at <code>/dev/command/screen-awareness</code> to see history.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </SplitBarContent>

            {/* ── TAB 2: Route Resolution Tests ───────────────── */}
            <SplitBarContent value="tests" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Route Resolution Tests</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(testResults).length === 0 ? (
                    <div className="text-center py-8">
                      <Route className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">
                        Click "Run Route Tests" to verify all {TEST_ROUTES.length} routes resolve to the correct screen ID.
                      </p>
                      <Button onClick={runResolutionTests}>Run Route Tests</Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between mb-3 text-sm">
                        <span>Results:</span>
                        <span>
                          <span className="text-green-600 font-medium">
                            {Object.values(testResults).filter(Boolean).length} passed
                          </span>
                          {" / "}
                          <span className={Object.values(testResults).some(v => !v) ? "text-red-600 font-medium" : ""}>
                            {Object.values(testResults).filter(v => !v).length} failed
                          </span>
                          {" / "}
                          {TEST_ROUTES.length} total
                        </span>
                      </div>
                      {TEST_ROUTES.map(({ path, expected }) => {
                        const screen = resolveScreen(path);
                        const pass = testResults[path];
                        return (
                          <div key={path} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/50 text-sm">
                            <StatusIcon pass={pass ?? null} />
                            <code className="bg-muted px-2 py-0.5 rounded text-xs min-w-[180px]">{path}</code>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <Badge variant={pass ? "default" : "destructive"} className="text-xs">
                              {screen?.id || "null"}
                            </Badge>
                            <span className="text-muted-foreground text-xs">expected: {expected}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </SplitBarContent>

            {/* ── TAB 3: Full Registry ────────────────────────── */}
            <SplitBarContent value="registry" className="mt-6">
              <div className="space-y-4">
                {(Object.keys(MODULE_DESCRIPTIONS) as ScreenModule[]).map(mod => {
                  const screens = Object.entries(SCREEN_REGISTRY).filter(([, s]) => s.module === mod);
                  if (screens.length === 0) return null;
                  return (
                    <Card key={mod}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Badge>{mod}</Badge>
                          <span className="text-sm font-normal text-muted-foreground">
                            {MODULE_DESCRIPTIONS[mod]} ({screens.length} screens)
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {screens.map(([route, screen]) => (
                            <div key={route} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 text-sm">
                              <Badge variant="outline" className="text-xs min-w-[70px] justify-center">{screen.id}</Badge>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{screen.name}</span>
                                  <code className="text-xs text-muted-foreground">{route}</code>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{screen.description}</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {screen.capabilities.map(cap => (
                                    <span key={cap} className="text-[10px] px-1.5 py-0.5 bg-muted rounded">{cap}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </SplitBarContent>

            {/* ── TAB 4: AI Payload ───────────────────────────── */}
            <SplitBarContent value="payload" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Context String (injected into AI system prompt)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-[500px] whitespace-pre-wrap font-mono">
                      {screenContext.toContextString()}
                    </pre>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Global Payload (sent with ai-chat requests)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-[500px] whitespace-pre-wrap font-mono" key={refreshKey}>
                      {currentPayload
                        ? JSON.stringify(currentPayload, null, 2)
                        : "No payload available (ScreenContextBridge not active)"}
                    </pre>
                    <p className="mt-2 text-xs text-muted-foreground">
                      This JSON object is attached to every ai-chat request as the <code>screenContext</code> field.
                      The edge function reads it and injects a <code>=== SCREEN CONTEXT ===</code> block into the system prompt.
                    </p>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Manual QA Checklist</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <input type="checkbox" className="mt-1" />
                        <div>
                          <strong>Screen Detection:</strong> Navigate to 5+ different screens. Verify the "Current Screen Detection" card updates correctly on each navigation.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <input type="checkbox" className="mt-1" />
                        <div>
                          <strong>History Tracking:</strong> Navigate through 3+ screens, return to this page. Verify the Navigation History shows the correct trail.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <input type="checkbox" className="mt-1" />
                        <div>
                          <strong>Previous Screen:</strong> Navigate away and back. Verify the "Previous Screen" field shows the last screen visited.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <input type="checkbox" className="mt-1" />
                        <div>
                          <strong>AI Payload Sync:</strong> Navigate to any screen, check the "AI Payload" tab. Verify the JSON payload matches the screen you're on.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <input type="checkbox" className="mt-1" />
                        <div>
                          <strong>Prompt Hint Relevance:</strong> Check the "AI Prompt Hint" for several screens. Verify each hint makes sense for the screen context.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <input type="checkbox" className="mt-1" />
                        <div>
                          <strong>AI Conversation Test:</strong> Navigate to the Events screen, open the orb, and ask "what can I do here?" — verify the AI references event capabilities.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <input type="checkbox" className="mt-1" />
                        <div>
                          <strong>AI Conversation Test:</strong> Navigate to the Wallet screen, open the orb, and ask "help me" — verify the AI references wallet features.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <input type="checkbox" className="mt-1" />
                        <div>
                          <strong>Route Resolution Tests:</strong> Click "Run Route Tests" above. All {TEST_ROUTES.length} routes should pass.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <input type="checkbox" className="mt-1" />
                        <div>
                          <strong>Unregistered Route:</strong> Navigate to a deep/unknown route (e.g., <code>/some/random/path</code>). Verify the system gracefully falls back to module detection.
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
