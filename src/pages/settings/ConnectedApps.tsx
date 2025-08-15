import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Heart, Activity, Watch, Plus, CheckCircle, AlertCircle } from "lucide-react";

const settingsSubItems = [
  { id: "overview", name: "Overview", path: "/settings" },
  { id: "privacy", name: "Privacy", path: "/settings/privacy" },
  { id: "notifications", name: "Notifications", path: "/settings/notifications" },
  { id: "preferences", name: "Preferences", path: "/settings/preferences" },
  { id: "connected-apps", name: "Connected Apps", path: "/settings/connected-apps" },
  { id: "billing", name: "Billing", path: "/settings/billing" },
  { id: "support", name: "Support", path: "/settings/support" },
];

export default function ConnectedApps() {
  return (
    <AppLayout>
      <SEO title="Connected Apps | Settings" description="Manage your connected apps and integrations" canonical={window.location.href} />
      <SubNavigation items={settingsSubItems} />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Connected Apps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Connected Apps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Heart className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h4 className="font-medium">Apple Health</h4>
                  <p className="text-sm text-muted-foreground">Syncing steps, heart rate, and sleep data</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
                <Button variant="outline" size="sm">Manage</Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium">Fitbit</h4>
                  <p className="text-sm text-muted-foreground">Activity tracking and exercise data</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
                <Button variant="outline" size="sm">Manage</Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Watch className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium">MyFitnessPal</h4>
                  <p className="text-sm text-muted-foreground">Nutrition and calorie tracking</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Sync Issues
                </Badge>
                <Button variant="outline" size="sm">Fix</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Available Integrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Activity className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Strava</h4>
                    <p className="text-sm text-muted-foreground">Exercise and running data</p>
                  </div>
                </div>
                <Button size="sm">Connect</Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Watch className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Garmin</h4>
                    <p className="text-sm text-muted-foreground">GPS and fitness tracking</p>
                  </div>
                </div>
                <Button size="sm">Connect</Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Heart className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Withings</h4>
                    <p className="text-sm text-muted-foreground">Smart scales and health devices</p>
                  </div>
                </div>
                <Button size="sm">Connect</Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Google Fit</h4>
                    <p className="text-sm text-muted-foreground">Activity and health data</p>
                  </div>
                </div>
                <Button size="sm">Connect</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Sync Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Data Sync Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="flex justify-center pt-4">
              <Button variant="outline">Force Sync All Apps</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}