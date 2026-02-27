import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevLogViewer } from "@/components/dev/DevLogViewer";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { CheckCircle, Code, Zap } from "lucide-react";
import { devCommandNavigation } from "@/config/dev-navigation";
import { RestoreSessionButton } from "@/components/dev/RestoreSessionButton";
import { RestoreSessionModal } from "@/components/dev/modals/RestoreSessionModal";
import { useOasisEvents } from "@/hooks/dev/useOasisEvents";
import { SoftWarningBanner } from "@/components/dev/SoftWarningBanner";

const COMMAND_TEMPLATES = [
  { name: "Health Check", description: "Check all service health endpoints", command: '{"action": "health_check", "targets": ["gateway", "oasis-operator", "worker-runner"]}' },
  { name: "VTID Allocate", description: "Allocate a new VTID with title and roles", command: '{"action": "vtid.allocate", "title": "New task", "target_roles": ["worker"]}' },
  { name: "Governance Toggle", description: "Toggle execution armed/disarmed state", command: '{"action": "governance.toggle", "flag": "execution_disarmed", "value": false}' },
  { name: "Worker Ping", description: "Ping all registered workers for heartbeat", command: '{"action": "worker.ping", "broadcast": true}' },
  { name: "OASIS Query", description: "Query recent OASIS events by filter", command: '{"action": "oasis.query", "type": "vtid.lifecycle.*", "limit": 50}' },
  { name: "Deploy Lock", description: "Set or release deploy lock", command: '{"action": "cicd.lock", "locked": true, "reason": "Manual maintenance"}' },
];

export default function CommandCompose() {
  const [activeTab, setActiveTab] = useState("editor");
  const [restoreSessionOpen, setRestoreSessionOpen] = useState(false);
  const [commandText, setCommandText] = useState('{\n  "action": "",\n  "params": {}\n}');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const { events: recentCommands, error, available, isLoading } = useOasisEvents({ type: "operator.command", limit: 20 });

  const handleValidate = () => {
    try {
      JSON.parse(commandText);
      setValidationResult({ valid: true, message: "Valid JSON command structure" });
    } catch (e) {
      setValidationResult({ valid: false, message: `Invalid JSON: ${(e as Error).message}` });
    }
  };

  return (
    <>
      <SEO
        title="Vitana DEV — Command Composer"
        description="Compose and execute custom commands with syntax highlighting"
        canonical={window.location.href}
      />

      <SubNavigation items={devCommandNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">

          <DevStandardHeader
            title="Command Composer"
            description="Compose and execute custom commands (read-only in Phase 1)"
            emoji="✏️"
          />

          <UtilityActionButton
            trailingElement={<RestoreSessionButton onClick={() => setRestoreSessionOpen(true)} />}
          >
            <ExpandableSearchButton
              placeholder="Search templates…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" onClick={handleValidate}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Validate
            </Button>
          </UtilityActionButton>

          {!available && error && (
            <SoftWarningBanner message={`Gateway not reachable — ${error.message || "read-only stub active"}`} />
          )}

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="editor">Editor</SplitBarTrigger>
              <SplitBarTrigger value="templates">Templates</SplitBarTrigger>
              <SplitBarTrigger value="validation">Validation</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="editor" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Command Editor</CardTitle>
                  <CardDescription>Compose JSON commands for the operator gateway (execution disabled in read-only mode)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <textarea
                    value={commandText}
                    onChange={(e) => setCommandText(e.target.value)}
                    className="w-full h-64 font-mono text-sm p-4 border rounded-md bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter JSON command…"
                  />
                  <div className="flex items-center gap-2">
                    <Button onClick={handleValidate} variant="outline" size="sm">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Validate JSON
                    </Button>
                    <Button disabled size="sm">
                      <Zap className="w-4 h-4 mr-2" />
                      Execute (Read-Only)
                    </Button>
                    {validationResult && (
                      <Badge className={validationResult.valid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {validationResult.message}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="templates" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Command Templates</CardTitle>
                  <CardDescription>Click a template to load it into the editor</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {COMMAND_TEMPLATES.map((tpl) => (
                      <div
                        key={tpl.name}
                        className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => { setCommandText(tpl.command); setActiveTab("editor"); }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Code className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{tpl.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{tpl.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="validation" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Command Validation Rules</CardTitle>
                  <CardDescription>Structure requirements for operator commands</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { rule: "action", desc: 'Required — must be a string like "vtid.allocate" or "governance.toggle"' },
                    { rule: "JSON format", desc: "Command must be valid JSON" },
                    { rule: "params", desc: "Optional — additional parameters as key-value pairs" },
                    { rule: "targets", desc: "Optional — array of service targets for broadcast commands" },
                    { rule: "governance gate", desc: "Commands are subject to governance rules (execution_disarmed blocks execution)" },
                  ].map((item) => (
                    <div key={item.rule} className="flex items-start gap-3 p-3 rounded-lg border">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-sm">{item.rule}</span>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <RestoreSessionModal
        open={restoreSessionOpen}
        onOpenChange={setRestoreSessionOpen}
      />
    </>
  );
}
