import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Save, Database, Mail, Code } from "lucide-react";
import { adminSystemNavigation } from "@/config/navigation";

export default function SystemConfig() {
  return (
    <AppLayout>
      <SEO 
        title="Admin - System Configuration" 
        description="Global system settings and configurations" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminSystemNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title="System Configuration"
            description="Configure global system settings, integrations, and API keys"
            emoji="⚙️"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Database
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">Connection and backup settings</p>
                <Button variant="outline" size="sm">Configure</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Service
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">SMTP and notification settings</p>
                <Button variant="outline" size="sm">Configure</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  API Keys
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">Third-party integrations</p>
                <Button variant="outline" size="sm">Manage</Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Global Settings
              </CardTitle>
              <Button>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">System-wide configuration options</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
