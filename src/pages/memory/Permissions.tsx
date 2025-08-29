import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { memoryNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Shield, Lock, Eye } from "lucide-react";

function Permissions() {
  return (
    <AppLayout>
      <SEO title="Permissions - Vitana Memory" description="Control who can access your health memories and personal data." />
      <SubNavigation items={memoryNavigation} />
      
      <div className="px-6 py-8 space-y-8">
        <StandardHeader 
          title="Memory Permissions"
          description="Control access to your health memories and personal data"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Public Timeline</div>
                  <div className="text-sm text-muted-foreground">Allow others to see your health journey</div>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">AI Memory Analysis</div>
                  <div className="text-sm text-muted-foreground">Enable AI insights from your memories</div>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Data Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Healthcare Providers</div>
                  <div className="text-sm text-muted-foreground">Share timeline with your doctors</div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Research Participation</div>
                  <div className="text-sm text-muted-foreground">Include memories in research studies</div>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Permissions, SCREEN_IDS.MEMORY_PERMISSIONS);