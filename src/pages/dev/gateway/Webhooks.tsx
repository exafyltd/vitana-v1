import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevMetricsCard, DevMetricsGrid } from "@/components/dev/DevMetricsCard";
import { DevEventStream } from "@/components/dev/DevEventStream";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Plus, Webhook, Send, RefreshCw } from "lucide-react";
import { devGatewayNavigation } from "@/config/dev-navigation";
import { useOasisEvents } from "@/hooks/dev/useOasisEvents";

const WEBHOOK_ENDPOINTS = [
  { url: "/webhooks/oasis-events", events: ["vtid.lifecycle.*", "governance.*"], status: "active", lastTriggered: "2 min ago" },
  { url: "/webhooks/deploy-notify", events: ["cicd.deploy.*", "cicd.rollback.*"], status: "active", lastTriggered: "15 min ago" },
  { url: "/webhooks/alert-escalation", events: ["alert.critical", "alert.warning"], status: "active", lastTriggered: "1 hour ago" },
  { url: "/webhooks/audit-log", events: ["governance.rule.*", "approval.*"], status: "paused", lastTriggered: "3 hours ago" },
];

export default function GatewayWebhooks() {
  const [activeTab, setActiveTab] = useState("list");
  const { events: deliveryEvents, error, available, isLoading, refetch } = useOasisEvents({ type: "webhook", limit: 50 });

  return (
    <>
      <SEO
        title="Vitana DEV — Webhooks"
        description="Webhook management and delivery monitoring"
        canonical={window.location.href}
      />

      <SubNavigation items={devGatewayNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">

          <DevStandardHeader
            title="Webhooks"
            description="Webhook management and delivery monitoring (read-only in Phase 1)"
            emoji="🔗"
          />

          <UtilityActionButton>
            <ExpandableSearchButton
              placeholder="Search webhooks…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" disabled>
              <Plus className="w-4 h-4 mr-2" />
              New Webhook
            </Button>
          </UtilityActionButton>

          <DevMetricsGrid columns={3}>
            <DevMetricsCard title="Endpoints" value={WEBHOOK_ENDPOINTS.length} icon={Webhook} />
            <DevMetricsCard title="Active" value={WEBHOOK_ENDPOINTS.filter(w => w.status === "active").length} icon={Send} variant="success" />
            <DevMetricsCard title="Deliveries" value={deliveryEvents.length} icon={RefreshCw} />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="list">Webhook List</SplitBarTrigger>
              <SplitBarTrigger value="deliveries">Delivery Logs</SplitBarTrigger>
              <SplitBarTrigger value="retries">Retry Policies</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="list" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configured Webhooks</CardTitle>
                  <CardDescription>Registered webhook endpoints and subscribed events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {WEBHOOK_ENDPOINTS.map((wh) => (
                      <div key={wh.url} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="space-y-1">
                          <code className="text-sm font-medium">{wh.url}</code>
                          <div className="flex gap-1 flex-wrap">
                            {wh.events.map(e => <Badge key={e} variant="outline" className="text-xs">{e}</Badge>)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{wh.lastTriggered}</span>
                          <Badge className={wh.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {wh.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="deliveries" className="mt-6">
              <DevEventStream
                title="Webhook Delivery Logs"
                description="Recent webhook delivery attempts"
                events={deliveryEvents.map(e => ({ ...e, id: e.id }))}
                isLoading={isLoading}
                error={error}
                available={available}
                onRefresh={refetch}
                emptyMessage="No webhook deliveries recorded"
              />
            </SplitBarContent>

            <SplitBarContent value="retries" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Retry Configuration</CardTitle>
                  <CardDescription>Webhook retry policies for failed deliveries</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { policy: "Max Retries", value: "3 attempts", desc: "Maximum number of retry attempts per delivery" },
                    { policy: "Backoff Strategy", value: "Exponential", desc: "1s, 2s, 4s delay between retries" },
                    { policy: "Timeout", value: "10 seconds", desc: "Maximum time to wait for webhook response" },
                    { policy: "Dead Letter Queue", value: "Enabled", desc: "Failed deliveries saved for manual retry" },
                  ].map(item => (
                    <div key={item.policy} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <span className="font-medium text-sm">{item.policy}</span>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Badge variant="secondary">{item.value}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
