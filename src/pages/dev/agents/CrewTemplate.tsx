import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevMetricsCard, DevMetricsGrid } from "@/components/dev/DevMetricsCard";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Plus, Users, Layers, Bot, Wrench, Shield, Cpu } from "lucide-react";
import { devAgentsNavigation } from "@/config/dev-navigation";
import { useWorkerStatus } from "@/hooks/dev/useWorkerStatus";

const CREW_TEMPLATES = [
  {
    name: "VTID Lifecycle Crew",
    description: "Full lifecycle crew: spec writer, implementer, validator, QA tester",
    agents: ["spec-writer", "implementer", "validator", "qa-tester"],
    icon: Layers,
    color: "border-blue-200 bg-blue-50/50",
  },
  {
    name: "Code Review Crew",
    description: "Review and validation: code reviewer, security scanner, linter",
    agents: ["code-reviewer", "security-scanner", "linter"],
    icon: Shield,
    color: "border-green-200 bg-green-50/50",
  },
  {
    name: "Deployment Crew",
    description: "Build, test, deploy pipeline: builder, tester, deployer, monitor",
    agents: ["builder", "tester", "deployer", "monitor"],
    icon: Wrench,
    color: "border-purple-200 bg-purple-50/50",
  },
  {
    name: "Intelligence Crew",
    description: "AI-powered analysis: pattern detector, anomaly finder, recommender",
    agents: ["pattern-detector", "anomaly-finder", "recommender"],
    icon: Bot,
    color: "border-orange-200 bg-orange-50/50",
  },
  {
    name: "Maintenance Crew",
    description: "System upkeep: health monitor, log analyzer, cleanup worker",
    agents: ["health-monitor", "log-analyzer", "cleanup-worker"],
    icon: Cpu,
    color: "border-yellow-200 bg-yellow-50/50",
  },
];

export default function AgentsCrewTemplate() {
  const [activeTab, setActiveTab] = useState("definitions");
  const [selectedTemplate, setSelectedTemplate] = useState<typeof CREW_TEMPLATES[0] | null>(null);
  const { workers, onlineCount } = useWorkerStatus();

  const capabilitySet = new Set(workers.flatMap(w => w.capabilities));

  return (
    <>
      <SEO
        title="Vitana DEV — Crew Templates"
        description="Agent crew configurations and templates"
        canonical={window.location.href}
      />

      <SubNavigation items={devAgentsNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">

          <DevStandardHeader
            title="Crew Templates"
            description="Agent crew configurations and templates"
            emoji="👥"
          />

          <UtilityActionButton>
            <ExpandableSearchButton
              placeholder="Search templates…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" disabled>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </UtilityActionButton>

          <DevMetricsGrid columns={3}>
            <DevMetricsCard title="Crew Templates" value={CREW_TEMPLATES.length} icon={Users} />
            <DevMetricsCard title="Available Workers" value={onlineCount} icon={Cpu} variant="success" />
            <DevMetricsCard title="Known Capabilities" value={capabilitySet.size} icon={Wrench} />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="definitions">Crew Definitions</SplitBarTrigger>
              <SplitBarTrigger value="library">Template Library</SplitBarTrigger>
              <SplitBarTrigger value="analytics">Crew Analytics</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="definitions" className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {CREW_TEMPLATES.map((tpl) => {
                  const Icon = tpl.icon;
                  return (
                    <Card
                      key={tpl.name}
                      className={`cursor-pointer hover:shadow-md transition-shadow ${tpl.color}`}
                      onClick={() => { setSelectedTemplate(tpl); setActiveTab("library"); }}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <CardTitle className="text-base">{tpl.name}</CardTitle>
                        </div>
                        <CardDescription className="text-xs">{tpl.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-1 flex-wrap">
                          {tpl.agents.map(a => (
                            <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </SplitBarContent>

            <SplitBarContent value="library" className="mt-6">
              {selectedTemplate ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <selectedTemplate.icon className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{selectedTemplate.name}</CardTitle>
                    </div>
                    <CardDescription>{selectedTemplate.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Agent Roles</p>
                      <div className="space-y-2">
                        {selectedTemplate.agents.map(agent => (
                          <div key={agent} className="flex items-center gap-3 p-3 rounded-lg border">
                            <Bot className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{agent}</span>
                            <Badge variant="outline" className="text-xs ml-auto">
                              {capabilitySet.has(agent) ? "Available" : "Not Registered"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button disabled className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Deploy Crew (Read-Only)
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Select a crew template from Crew Definitions to view details
                  </CardContent>
                </Card>
              )}
            </SplitBarContent>

            <SplitBarContent value="analytics" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Worker Capabilities</CardTitle>
                  <CardDescription>Capabilities available across registered workers</CardDescription>
                </CardHeader>
                <CardContent>
                  {capabilitySet.size > 0 ? (
                    <div className="flex gap-2 flex-wrap">
                      {Array.from(capabilitySet).map(cap => (
                        <Badge key={cap} variant="secondary" className="text-sm px-3 py-1">{cap}</Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No worker capabilities registered. Workers will register their capabilities via heartbeat.
                    </div>
                  )}
                </CardContent>
              </Card>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
