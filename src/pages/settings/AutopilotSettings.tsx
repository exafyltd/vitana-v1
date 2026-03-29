import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { settingsNavigation } from "@/config/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { communityFetch } from "@/lib/community-gateway";
import { Loader2 } from "lucide-react";

export default function AutopilotSettings() {
  const { preferences, isLoading, updatePreferences, isUpdating } = useUserPreferences();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!preferences) return null;

  return (
    <AppLayout>
      <SEO 
        title="Autopilot & Automation Settings" 
        description="Configure your personal autopilot and automation preferences" 
        canonical={window.location.href} 
      />
      <SubNavigation items={settingsNavigation} />
      
      <div className="p-6 bg-gradient-subtle min-h-screen">
        <div className="max-w-4xl mx-auto space-y-6">
          <StandardHeader
            title="Autopilot & Automation"
            description="Manage your personal autopilot settings and automation rules"
            emoji="🤖"
          />

          {/* Master Switch */}
          <Card>
            <CardHeader>
              <CardTitle>Enable Autopilot</CardTitle>
              <CardDescription>
                Turn on autopilot to receive automated suggestions and actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="autopilot-enabled">Autopilot Active</Label>
                <Switch
                  id="autopilot-enabled"
                  checked={preferences.autopilot_enabled}
                  onCheckedChange={(checked) => 
                    updatePreferences({ autopilot_enabled: checked })
                  }
                  disabled={isUpdating}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Action Categories</CardTitle>
              <CardDescription>
                Choose which types of autopilot actions you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="health-actions">Health Actions</Label>
                <Switch
                  id="health-actions"
                  checked={preferences.autopilot_categories.health}
                  onCheckedChange={(checked) => 
                    updatePreferences({ 
                      autopilot_categories: { 
                        ...preferences.autopilot_categories, 
                        health: checked 
                      } 
                    })
                  }
                  disabled={isUpdating}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="community-actions">Community Actions</Label>
                <Switch
                  id="community-actions"
                  checked={preferences.autopilot_categories.community}
                  onCheckedChange={(checked) => 
                    updatePreferences({ 
                      autopilot_categories: { 
                        ...preferences.autopilot_categories, 
                        community: checked 
                      } 
                    })
                  }
                  disabled={isUpdating}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="discovery-actions">Discovery Actions</Label>
                <Switch
                  id="discovery-actions"
                  checked={preferences.autopilot_categories.discovery}
                  onCheckedChange={(checked) => 
                    updatePreferences({ 
                      autopilot_categories: { 
                        ...preferences.autopilot_categories, 
                        discovery: checked 
                      } 
                    })
                  }
                  disabled={isUpdating}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="memory-actions">Memory Actions</Label>
                <Switch
                  id="memory-actions"
                  checked={preferences.autopilot_categories.memory}
                  onCheckedChange={(checked) => 
                    updatePreferences({ 
                      autopilot_categories: { 
                        ...preferences.autopilot_categories, 
                        memory: checked 
                      } 
                    })
                  }
                  disabled={isUpdating}
                />
              </div>
            </CardContent>
          </Card>

          {/* Frequency & Timing */}
          <Card>
            <CardHeader>
              <CardTitle>Frequency & Timing</CardTitle>
              <CardDescription>
                Control when and how often you receive autopilot suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="max-actions">Maximum Actions Per Day</Label>
                <Input
                  id="max-actions"
                  type="number"
                  min="1"
                  max="20"
                  value={preferences.autopilot_max_actions_per_day}
                  onChange={(e) => 
                    updatePreferences({ 
                      autopilot_max_actions_per_day: parseInt(e.target.value) 
                    })
                  }
                  disabled={isUpdating}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start">Quiet Hours Start</Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    value={preferences.autopilot_quiet_hours_start}
                    onChange={(e) => 
                      updatePreferences({ 
                        autopilot_quiet_hours_start: e.target.value 
                      })
                    }
                    disabled={isUpdating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet-end">Quiet Hours End</Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    value={preferences.autopilot_quiet_hours_end}
                    onChange={(e) => 
                      updatePreferences({ 
                        autopilot_quiet_hours_end: e.target.value 
                      })
                    }
                    disabled={isUpdating}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority-filter">Priority Filter</Label>
                <Select
                  value={preferences.autopilot_priority_filter}
                  onValueChange={(value: any) => 
                    updatePreferences({ autopilot_priority_filter: value })
                  }
                  disabled={isUpdating}
                >
                  <SelectTrigger id="priority-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high_medium">High & Medium Only</SelectItem>
                    <SelectItem value="high">High Priority Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Share */}
          <AutoShareCard />
        </div>
      </div>
    </AppLayout>
  );
}

function AutoShareCard() {
  const queryClient = useQueryClient();

  const { data: shareData, isLoading, isError } = useQuery({
    queryKey: ["share-prefs"],
    queryFn: async () => {
      const res = await communityFetch("/api/v1/social-accounts/share-prefs");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{
        prefs: {
          auto_share_enabled: boolean;
          share_milestones: boolean;
          share_to_providers: string[];
          share_visibility: "public" | "connections" | "private";
        };
      }>;
    },
    staleTime: 2 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (updatedPrefs: any) => {
      const res = await communityFetch("/api/v1/social-accounts/share-prefs", {
        method: "PUT",
        body: JSON.stringify(updatedPrefs),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["share-prefs"] }),
  });

  if (isError) return null;

  const prefs = shareData?.prefs;
  const providerOptions = ["facebook", "linkedin", "instagram"];

  const update = (partial: Partial<typeof prefs>) => {
    if (!prefs) return;
    mutation.mutate({ ...prefs, ...partial });
  };

  const toggleProvider = (p: string) => {
    if (!prefs) return;
    const current = prefs.share_to_providers || [];
    const next = current.includes(p) ? current.filter((x) => x !== p) : [...current, p];
    update({ share_to_providers: next });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auto-Share</CardTitle>
        <CardDescription>
          Automatically share your milestones and achievements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-share-enabled">Auto-share enabled</Label>
          <Switch
            id="auto-share-enabled"
            checked={prefs?.auto_share_enabled ?? false}
            onCheckedChange={(checked) => update({ auto_share_enabled: checked })}
            disabled={isLoading}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="share-milestones">Share milestones</Label>
          <Switch
            id="share-milestones"
            checked={prefs?.share_milestones ?? false}
            onCheckedChange={(checked) => update({ share_milestones: checked })}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label>Share to providers</Label>
          {providerOptions.map((p) => (
            <div key={p} className="flex items-center space-x-2">
              <Checkbox
                id={`share-${p}`}
                checked={prefs?.share_to_providers?.includes(p) ?? false}
                onCheckedChange={() => toggleProvider(p)}
                disabled={isLoading}
              />
              <Label htmlFor={`share-${p}`} className="capitalize">{p}</Label>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="share-visibility">Visibility</Label>
          <Select
            value={prefs?.share_visibility ?? "public"}
            onValueChange={(v: any) => update({ share_visibility: v })}
            disabled={isLoading}
          >
            <SelectTrigger id="share-visibility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="connections">Connections Only</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
