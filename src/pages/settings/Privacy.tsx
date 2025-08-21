import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Shield, Eye, Users, Lock, Smartphone, History } from "lucide-react";

const settingsSubItems = [
  { id: "overview", name: "Overview", path: "/settings" },
  { id: "privacy", name: "Privacy", path: "/settings/privacy" },
  { id: "notifications", name: "Notifications", path: "/settings/notifications" },
  { id: "preferences", name: "Preferences", path: "/settings/preferences" },
  { id: "connected-apps", name: "Connected Apps", path: "/settings/connected-apps" },
  { id: "billing", name: "Billing", path: "/settings/billing" },
  { id: "support", name: "Support", path: "/settings/support" },
];

export default function Privacy() {
  return (
    <AppLayout>
      <SEO title="Privacy | Settings" description="Manage your privacy settings and data control" canonical={window.location.href} />
      <SubNavigation items={settingsSubItems} />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <PageHeader 
          title="Your data, your control! 🔒"
          description="Manage your privacy settings and data control"
          icon={Shield}
        />
        
        {/* Privacy Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Profile Visibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Public Profile</h4>
                <p className="text-sm text-muted-foreground">Allow others to find and view your profile</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Activity Status</h4>
                <p className="text-sm text-muted-foreground">Show when you're active on the platform</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">VITANA Index Score</h4>
                <p className="text-sm text-muted-foreground">Share your wellness score with community</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Data Sharing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Data Sharing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Health Data Analytics</h4>
                <p className="text-sm text-muted-foreground">Share anonymized health data to improve AI recommendations</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Community Insights</h4>
                <p className="text-sm text-muted-foreground">Allow your progress to contribute to community statistics</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Third-party Integrations</h4>
                <p className="text-sm text-muted-foreground">Share data with connected apps and services</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Password</h4>
                <p className="text-sm text-muted-foreground">Last changed 30 days ago</p>
              </div>
              <Button variant="outline">Change password</Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Two-Factor Authentication</h4>
                <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Login Notifications</h4>
                <p className="text-sm text-muted-foreground">Get notified of new login attempts</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <h4 className="font-medium">Current Device</h4>
                  <p className="text-sm text-muted-foreground">Chrome on Windows • Active now</p>
                </div>
              </div>
              <span className="text-sm text-green-600 font-medium">Current</span>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="font-medium">iPhone</h4>
                  <p className="text-sm text-muted-foreground">Safari • Last active 2 hours ago</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Revoke</Button>
            </div>
          </CardContent>
        </Card>

        {/* Privacy History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Privacy History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Data export requested</p>
                <p className="text-sm text-muted-foreground">December 1, 2024</p>
              </div>
              <Button variant="ghost" size="sm">View</Button>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Privacy settings updated</p>
                <p className="text-sm text-muted-foreground">November 15, 2024</p>
              </div>
              <Button variant="ghost" size="sm">View</Button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Account created</p>
                <p className="text-sm text-muted-foreground">October 20, 2024</p>
              </div>
              <Button variant="ghost" size="sm">View</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}