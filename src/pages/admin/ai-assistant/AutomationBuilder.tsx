import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Zap } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminAIAssistantNavigation } from "@/config/navigation";

export default function AutomationBuilder() {
  return (
    <AppLayout>
      <SEO 
        title="Automation Builder | AI Assistant | Admin" 
        description="Create and manage automation rules" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminAIAssistantNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title="Automation Builder"
            description="Create and manage intelligent automation rules"
            emoji="⚡"
            rightAction={
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Automation
              </Button>
            }
          />

          <Card>
            <CardHeader>
              <CardTitle>Visual Automation Builder</CardTitle>
              <CardDescription>Coming in Phase 3</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <div className="text-center space-y-2">
                  <Zap className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Visual automation builder will be implemented in Phase 3
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
