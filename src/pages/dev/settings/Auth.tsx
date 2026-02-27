import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevStatusGrid } from "@/components/dev/DevStatusGrid";
import { DevMetricsCard, DevMetricsGrid } from "@/components/dev/DevMetricsCard";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Shield, Key, Users, Lock } from "lucide-react";
import { devSettingsNavigation } from "@/config/dev-navigation";

const AUTH_CONFIG = [
  { label: "Auth Provider", value: "Supabase Auth", status: "active" },
  { label: "JWT Strategy", value: "RS256 with JWKS", status: "active" },
  { label: "Session Duration", value: "7 days", status: "active" },
  { label: "Refresh Token", value: "Enabled — 30 day expiry", status: "active" },
  { label: "Dual Auth", value: "Vitana V1 + Platform", status: "active" },
  { label: "MFA", value: "Optional — TOTP", status: "configured" },
];

const AUTH_PROVIDERS = [
  { name: "Email/Password", enabled: true },
  { name: "Google OAuth", enabled: true },
  { name: "Apple Sign In", enabled: false },
  { name: "Magic Link", enabled: true },
];

export default function SettingsAuth() {
  const [activeTab, setActiveTab] = useState("config");

  return (
    <>
      <SEO title="Vitana DEV — Auth Settings" description="Authentication configuration and providers" canonical={window.location.href} />
      <SubNavigation items={devSettingsNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <DevStandardHeader title="Auth Settings" description="Authentication configuration and providers (read-only)" emoji="🔐" />
          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search settings…" onSearch={(q) => console.log('Search:', q)} />
            <Button size="sm" variant="outline" disabled><Lock className="w-4 h-4 mr-2" />Read-Only</Button>
          </UtilityActionButton>

          <DevMetricsGrid columns={3}>
            <DevMetricsCard title="Auth Provider" value="Supabase" icon={Shield} variant="success" />
            <DevMetricsCard title="Providers Enabled" value={AUTH_PROVIDERS.filter(p => p.enabled).length} icon={Key} />
            <DevMetricsCard title="Dual Auth" value="Active" icon={Users} variant="success" />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="config">Configuration</SplitBarTrigger>
              <SplitBarTrigger value="providers">Auth Providers</SplitBarTrigger>
              <SplitBarTrigger value="jwt">JWT Settings</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="config" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Auth Configuration</CardTitle><CardDescription>Current authentication settings</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {AUTH_CONFIG.map(cfg => (
                      <div key={cfg.label} className="flex items-center justify-between p-3 rounded-lg border">
                        <span className="text-sm font-medium">{cfg.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{cfg.value}</span>
                          <Badge className="bg-green-100 text-green-800 text-xs">{cfg.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="providers" className="mt-6">
              <DevStatusGrid
                title="Auth Providers"
                description="Configured authentication providers"
                items={AUTH_PROVIDERS.map(p => ({
                  name: p.name,
                  status: p.enabled ? "healthy" as const : "unknown" as const,
                  detail: p.enabled ? "Enabled for user sign-in" : "Not configured",
                }))}
              />
            </SplitBarContent>

            <SplitBarContent value="jwt" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">JWT Configuration</CardTitle><CardDescription>Token signing and validation settings (masked)</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { key: "Algorithm", value: "RS256" },
                    { key: "JWKS Endpoint", value: "https://*****.supabase.co/.well-known/jwks.json" },
                    { key: "Issuer", value: "https://*****.supabase.co/auth/v1" },
                    { key: "Audience", value: "authenticated" },
                    { key: "Token Lifetime", value: "3600s (1 hour)" },
                    { key: "Refresh Lifetime", value: "2592000s (30 days)" },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border">
                      <span className="text-sm font-medium">{item.key}</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{item.value}</code>
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
