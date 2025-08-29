import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SplitScreen } from "@/components/ui/split-screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";
import { ViewAsMode } from "@/types/profile";
import { IdentityForm } from "@/components/profile/editor/IdentityForm";
import { AboutForm } from "@/components/profile/editor/AboutForm";
import { ServicesForm } from "@/components/profile/editor/ServicesForm";
import { ComplianceForm } from "@/components/profile/editor/ComplianceForm";
import { ShowcaseForm } from "@/components/profile/editor/ShowcaseForm";
import { VisibilityForm } from "@/components/profile/editor/VisibilityForm";
import { PreviewPane } from "@/components/profile/PreviewPane";
import { Eye, Users, Globe } from "lucide-react";

const ProfileEditor = () => {
  const [activeTab, setActiveTab] = useState("identity");
  const [viewAsMode, setViewAsMode] = useState<ViewAsMode>("me");

  const getViewAsIcon = (mode: ViewAsMode) => {
    switch (mode) {
      case "me": return <Eye className="w-4 h-4" />;
      case "public": return <Globe className="w-4 h-4" />;
      case "follower": return <Users className="w-4 h-4" />;
    }
  };

  const getViewAsLabel = (mode: ViewAsMode) => {
    switch (mode) {
      case "me": return "Me";
      case "public": return "Public";
      case "follower": return "Follower";
    }
  };

  const cycleViewAs = () => {
    const modes: ViewAsMode[] = ["me", "public", "follower"];
    const currentIndex = modes.indexOf(viewAsMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setViewAsMode(modes[nextIndex]);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Edit Profile – VITANA" 
        description="Edit your VITANA profile and customize your public presence" 
        canonical={window.location.href} 
      />
      
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Edit Profile</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">View as:</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={cycleViewAs}
                className="gap-2"
              >
                {getViewAsIcon(viewAsMode)}
                {getViewAsLabel(viewAsMode)}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="identity">Identity</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="services">Services & Pricing</TabsTrigger>
            <TabsTrigger value="compliance">Professional</TabsTrigger>
            <TabsTrigger value="showcase">Showcase</TabsTrigger>
            <TabsTrigger value="visibility">Visibility</TabsTrigger>
          </TabsList>

          <div className="h-[calc(100vh-200px)]">
            <SplitScreen 
              defaultLeftSize={50}
              leftPanel={
                <Card className="p-6 h-full overflow-y-auto">
                  <TabsContent value="identity" className="mt-0">
                    <IdentityForm />
                  </TabsContent>
                  <TabsContent value="about" className="mt-0">
                    <AboutForm />
                  </TabsContent>
                  <TabsContent value="services" className="mt-0">
                    <ServicesForm />
                  </TabsContent>
                  <TabsContent value="compliance" className="mt-0">
                    <ComplianceForm />
                  </TabsContent>
                  <TabsContent value="showcase" className="mt-0">
                    <ShowcaseForm />
                  </TabsContent>
                  <TabsContent value="visibility" className="mt-0">
                    <VisibilityForm />
                  </TabsContent>
                </Card>
              }
              rightPanel={
                <Card className="p-6 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Live Preview</h3>
                    <Badge variant="secondary" className="gap-1">
                      {getViewAsIcon(viewAsMode)}
                      {getViewAsLabel(viewAsMode)}
                    </Badge>
                  </div>
                  <div className="h-full overflow-y-auto border rounded-lg">
                    <PreviewPane viewAs={viewAsMode} />
                  </div>
                </Card>
              }
            />
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfileEditor;