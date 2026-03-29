import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { settingsNavigation } from "@/config/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { communityFetch, COMMUNITY_GATEWAY } from "@/lib/community-gateway";
import { Loader2, Trash2, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface Provider {
  provider: string;
  name: string;
  configured: boolean;
}

interface Connection {
  provider: string;
  username: string;
  display_name: string;
  avatar_url: string;
  enrichment_status: string;
  connected_at: string;
}

export default function SocialConnect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // Handle OAuth callback
  useEffect(() => {
    const connected = searchParams.get("connected");
    const username = searchParams.get("username");
    if (connected) {
      toast.success(`${connected} connected!`, {
        description: username ? `Signed in as @${username}` : undefined,
      });
      navigate("/settings/social", { replace: true });
      queryClient.invalidateQueries({ queryKey: ["social-connections"] });
    }
  }, [searchParams, navigate, queryClient]);

  const { data: providersData, isLoading: loadingProviders } = useQuery({
    queryKey: ["social-providers"],
    queryFn: async () => {
      const res = await fetch(`${COMMUNITY_GATEWAY}/api/v1/social-accounts/providers`);
      if (!res.ok) throw new Error("Failed to fetch providers");
      return res.json() as Promise<{ providers: Provider[] }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: connectionsData, isLoading: loadingConnections } = useQuery({
    queryKey: ["social-connections"],
    queryFn: async () => {
      const res = await communityFetch("/api/v1/social-accounts/connections");
      if (!res.ok) throw new Error("Failed to fetch connections");
      return res.json() as Promise<{ connections: Connection[] }>;
    },
    staleTime: 60 * 1000,
    enabled: !!user,
  });

  const providers = (providersData?.providers ?? []).filter((p) => p.configured);
  const connections = connectionsData?.connections ?? [];
  const connectedProviderIds = new Set(connections.map((c) => c.provider));
  const availableProviders = providers.filter((p) => !connectedProviderIds.has(p.provider));

  const handleConnect = async (provider: string) => {
    try {
      const res = await communityFetch(`/api/v1/social-accounts/connect/${provider}`);
      if (!res.ok) throw new Error("Failed");
      const { auth_url } = await res.json();
      window.location.href = auth_url;
    } catch {
      toast.error("Could not connect account");
    }
  };

  const handleDisconnect = async (provider: string) => {
    try {
      const res = await communityFetch(`/api/v1/social-accounts/disconnect/${provider}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      queryClient.invalidateQueries({ queryKey: ["social-connections"] });
      toast.success("Account disconnected");
    } catch {
      toast.error("Could not disconnect account");
    }
  };

  const enrichmentBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Enriched</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Processing</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return null;
    }
  };

  const isLoading = loadingProviders || loadingConnections;

  return (
    <AppLayout>
      <SEO title="Social Accounts" />
      <SubNavigation items={settingsNavigation} />
      <div className="p-6 bg-gradient-subtle min-h-screen">
        <div className="max-w-4xl mx-auto space-y-6">
          <StandardHeader
            title="Social Accounts"
            description="Connect your accounts to auto-fill your profile"
            emoji="🔗"
          />

          <p className="text-sm text-muted-foreground">
            Connect your accounts to auto-fill your profile — no manual entry needed!
          </p>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Connected Accounts */}
              {connections.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-foreground">Connected Accounts</h2>
                  {connections.map((conn) => (
                    <Card key={conn.provider}>
                      <CardContent className={isMobile ? "p-4" : "p-5"}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            {conn.avatar_url && (
                              <img
                                src={conn.avatar_url}
                                alt={conn.display_name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-foreground capitalize">{conn.provider}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                @{conn.username} · {conn.display_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Connected {format(new Date(conn.connected_at), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {enrichmentBadge(conn.enrichment_status)}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDisconnect(conn.provider)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Available Providers */}
              {availableProviders.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-foreground">Available Providers</h2>
                  {availableProviders.map((provider) => (
                    <Card key={provider.provider}>
                      <CardContent className={isMobile ? "p-4" : "p-5"}>
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-foreground capitalize">{provider.name}</p>
                          <Button size="sm" onClick={() => handleConnect(provider.provider)}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Connect
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {connections.length === 0 && availableProviders.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No social providers available at this time.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
