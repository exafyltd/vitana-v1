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
import { Plus, Smartphone, Link, QrCode } from "lucide-react";
import { devGatewayNavigation } from "@/config/dev-navigation";

const DEEP_LINKS = [
  { pattern: "vitana://dashboard", target: "/dev/dashboard", platform: "iOS + Android", status: "active" },
  { pattern: "vitana://orb/:roomId", target: "/orb/room/:roomId", platform: "iOS + Android", status: "active" },
  { pattern: "vitana://profile/:userId", target: "/profile/:userId", platform: "iOS + Android", status: "active" },
  { pattern: "vitana://vtid/:vtid", target: "/dev/vtid/search?vtid=:vtid", platform: "iOS + Android", status: "active" },
  { pattern: "vitana://command", target: "/dev/command", platform: "iOS", status: "active" },
  { pattern: "vitana://settings", target: "/settings", platform: "iOS + Android", status: "draft" },
];

export default function GatewayMobileLinks() {
  const [activeTab, setActiveTab] = useState("registry");
  const [testUrl, setTestUrl] = useState("vitana://dashboard");

  return (
    <>
      <SEO title="Vitana DEV — Mobile Deep Links" description="Mobile deep link configurations and management" canonical={window.location.href} />
      <SubNavigation items={devGatewayNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <DevStandardHeader title="Mobile Deep Links" description="Mobile deep link configurations and management" emoji="📱" />
          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search deep links…" onSearch={(q) => console.log('Search:', q)} />
            <UniversalCalendarButton />
            <Button size="sm" disabled><Plus className="w-4 h-4 mr-2" />New Link</Button>
          </UtilityActionButton>

          <DevMetricsGrid columns={3}>
            <DevMetricsCard title="Deep Links" value={DEEP_LINKS.length} icon={Link} />
            <DevMetricsCard title="Active" value={DEEP_LINKS.filter(l => l.status === "active").length} icon={Smartphone} variant="success" />
            <DevMetricsCard title="Platforms" value={2} icon={QrCode} subtitle="iOS + Android" />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="registry">Link Registry</SplitBarTrigger>
              <SplitBarTrigger value="analytics">Link Analytics</SplitBarTrigger>
              <SplitBarTrigger value="testing">Testing Tools</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="registry" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Deep Link Registry</CardTitle><CardDescription>All registered deep link patterns</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {DEEP_LINKS.map(link => (
                      <div key={link.pattern} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="space-y-1">
                          <code className="text-sm font-medium">{link.pattern}</code>
                          <p className="text-xs text-muted-foreground">Target: {link.target}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{link.platform}</Badge>
                          <Badge className={link.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>{link.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="analytics" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Link Analytics</CardTitle><CardDescription>Deep link usage tracking (requires analytics integration)</CardDescription></CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">Analytics data will be available once mobile app integration is deployed.</div>
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="testing" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Deep Link Tester</CardTitle><CardDescription>Test deep link resolution and validation</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Enter deep link URL</label>
                    <input className="w-full mt-1 px-3 py-2 border rounded-md font-mono text-sm" value={testUrl} onChange={(e) => setTestUrl(e.target.value)} placeholder="vitana://..." />
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-sm text-muted-foreground">Resolution</p>
                    <p className="font-mono text-sm mt-1">{DEEP_LINKS.find(l => testUrl.startsWith(l.pattern.split("/:")[0]))?.target || "No matching pattern"}</p>
                  </div>
                  <Button variant="outline" size="sm" disabled><QrCode className="w-4 h-4 mr-2" />Generate QR Code</Button>
                </CardContent>
              </Card>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
