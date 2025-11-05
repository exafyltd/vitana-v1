import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Plus, Smartphone, Heart, Activity, Watch, CheckCircle, AlertCircle, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { settingsNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { StandardCard } from "@/components/templates/StandardCard";
import { ConnectAppPopup } from "@/components/ConnectAppPopup";

function ConnectedApps() {
  const [activeTab, setActiveTab] = useState("connected");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);

  return (
    <AppLayout>
      <SEO title="Connected Apps | Settings" description="Manage your connected apps and integrations" canonical={window.location.href} />
      <SubNavigation items={settingsNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader 
            title="Connected Apps 🔗"
            description="Seamless integration, maximum benefit - manage your connected apps and integrations"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search apps, integrations, fitness trackers..." />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setActionPopupOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Connect App
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList>
              <SplitBarTrigger value="connected">🔌 Connected Apps</SplitBarTrigger>
              <SplitBarTrigger value="available">✨ Available Integrations</SplitBarTrigger>
              <SplitBarTrigger value="sync">🔄 Data Sync</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="connected">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Big + Small + Small (6+3+3) */}
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title="Connected Applications"
                    subtitle="Your Active Integrations"
                    icon={CheckCircle}
                    content={
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                              <Heart className="w-4 h-4 text-red-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">Apple Health</h4>
                              <p className="text-xs text-muted-foreground">Syncing steps, heart rate, sleep</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                            Connected
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Activity className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">Fitbit</h4>
                              <p className="text-xs text-muted-foreground">Activity tracking and exercise data</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                            Connected
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <Watch className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">MyFitnessPal</h4>
                              <p className="text-xs text-muted-foreground">Nutrition and calorie tracking</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs">
                            Sync Issues
                          </Badge>
                        </div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Connected Apps"
                    subtitle="Total Active"
                    icon={Smartphone}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">3</div>
                        <div className="text-xs text-muted-foreground">Apps connected</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Sync Status"
                    subtitle="Health Data"
                    icon={CheckCircle}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">Active</div>
                        <div className="text-xs text-muted-foreground">Real-time sync</div>
                      </div>
                    }
                  />
                </div>

                {/* Row 2: Motivational Banner */}
                <div className="col-span-12">
                  <MotivationalBanner variant="encouragement" />
                </div>

                {/* Row 3: Single Full Row (12) */}
                <div className="col-span-12">
                  <StandardCard
                    title="App Management & Controls"
                    subtitle="Detailed Connection Settings"
                    icon={SettingsIcon}
                    content={
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="font-medium text-sm">Data Permissions</div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center p-2 bg-muted rounded">
                              <span className="text-sm">Step Count</span>
                              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">Allowed</Badge>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-muted rounded">
                              <span className="text-sm">Heart Rate</span>
                              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">Allowed</Badge>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-muted rounded">
                              <span className="text-sm">Sleep Data</span>
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs">Limited</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="font-medium text-sm">Connection Health</div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span>Apple Health: Syncing normally</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span>Fitbit: Connected and active</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              <span>MyFitnessPal: Needs reconnection</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="available">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Small + Small + Big (3+3+6) */}
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Available Apps"
                    subtitle="Ready to Connect"
                    icon={Plus}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">12</div>
                        <div className="text-xs text-muted-foreground">Integrations ready</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Popular Choice"
                    subtitle="Most Connected"
                    icon={Activity}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">Strava</div>
                        <div className="text-xs text-muted-foreground">89% users</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title="Available Integrations"
                    subtitle="Connect New Apps"
                    icon={Smartphone}
                    content={
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <Activity className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">Strava</h4>
                              <p className="text-xs text-muted-foreground">Exercise and running data</p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">Connect</Button>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                              <Watch className="w-4 h-4 text-orange-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">Garmin</h4>
                              <p className="text-xs text-muted-foreground">GPS and fitness tracking</p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">Connect</Button>
                        </div>
                      </div>
                    }
                  />
                </div>

                {/* Row 2: Motivational Banner */}
                <div className="col-span-12">
                  <MotivationalBanner variant="guidance" />
                </div>

                {/* Row 3: Big + Small + Small (6+3+3) */}
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title="Integration Categories"
                    subtitle="Browse by Type"
                    icon={SettingsIcon}
                    content={
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="font-medium text-sm">Fitness Trackers</div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>• Apple Health</div>
                            <div>• Fitbit</div>
                            <div>• Garmin</div>
                            <div>• Samsung Health</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="font-medium text-sm">Nutrition Apps</div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>• MyFitnessPal</div>
                            <div>• Cronometer</div>
                            <div>• Lose It!</div>
                            <div>• Yazio</div>
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Categories"
                    subtitle="App Types"
                    icon={Plus}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-purple-600">4</div>
                        <div className="text-xs text-muted-foreground">Different types</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Coming Soon"
                    subtitle="New Integrations"
                    icon={Plus}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">6</div>
                        <div className="text-xs text-muted-foreground">Apps in pipeline</div>
                      </div>
                    }
                  />
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="sync">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Single Full Row (12) */}
                <div className="col-span-12">
                  <StandardCard
                    title="Data Sync Settings & Status"
                    subtitle="Monitor Your Health Data Flow"
                    icon={Activity}
                    content={
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <Activity className="w-8 h-8 mx-auto mb-2 text-primary" />
                          <h4 className="font-medium">Auto Sync</h4>
                          <p className="text-sm text-muted-foreground">Every 15 minutes</p>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                          <h4 className="font-medium">Last Sync</h4>
                          <p className="text-sm text-muted-foreground">2 minutes ago</p>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <Heart className="w-8 h-8 mx-auto mb-2 text-red-600" />
                          <h4 className="font-medium">Data Points</h4>
                          <p className="text-sm text-muted-foreground">1,247 synced today</p>
                        </div>
                      </div>
                    }
                  />
                </div>

                {/* Row 2: Motivational Banner */}
                <div className="col-span-12">
                  <MotivationalBanner variant="partnership" />
                </div>

                {/* Row 3: Small + Small + Big (3+3+6) */}
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Sync Frequency"
                    subtitle="Update Interval"
                    icon={Activity}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">15min</div>
                        <div className="text-xs text-muted-foreground">Auto sync interval</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Today's Data"
                    subtitle="Points Synced"
                    icon={CheckCircle}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">1.2K</div>
                        <div className="text-xs text-muted-foreground">Health metrics</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title="Sync Management"
                    subtitle="Control Data Flow"
                    icon={SettingsIcon}
                    content={
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-sm">Automatic Sync</div>
                            <div className="text-xs text-muted-foreground">Keep data updated automatically</div>
                          </div>
                          <Button size="sm">Enabled</Button>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-sm">Background Sync</div>
                            <div className="text-xs text-muted-foreground">Sync when app is closed</div>
                          </div>
                          <Button size="sm" variant="outline">Configure</Button>
                        </div>
                        <div className="pt-2">
                          <Button variant="outline" className="w-full">Force Sync All Apps</Button>
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
      <ConnectAppPopup isOpen={actionPopupOpen} onClose={() => setActionPopupOpen(false)} />
    </AppLayout>
  );
}

export default withScreenId(ConnectedApps, SCREEN_IDS.SETTINGS_OVERVIEW);