import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AutopilotSettingsPanelProps {
  preferences: any;
  isUpdating: boolean;
  updatePreferences: (updates: any) => void;
}

export default function AutopilotSettingsPanel({ preferences, isUpdating, updatePreferences }: AutopilotSettingsPanelProps) {
  return (
    <div className="space-y-4">
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
    </div>
  );
}
