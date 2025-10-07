import React from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AutomationRuleDialog } from "@/components/sharing/AutomationRuleDialog";
import { TemplateDialog } from "@/components/sharing/TemplateDialog";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Zap, BarChart3, Palette, Plus } from "lucide-react";

export default withScreenId(function Distribution() {
  const [rulePopupOpen, setRulePopupOpen] = React.useState(false);
  const [templatePopupOpen, setTemplatePopupOpen] = React.useState(false);

  return (
    <AppLayout>
      <SEO
        title="Distribution Tooling | VITANA"
        description="Advanced distribution rules, templates, and analytics"
        canonical={window.location.href}
      />
      <SubNavigation items={sharingNavigation} />

      <div className="p-6 min-h-screen pb-24">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title="🛠️ Distribution Tooling"
            description="Templates, automation rules, and brand guidelines"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search automation rules, templates..."
            />
            <UniversalCalendarButton />
            <Button size="sm" variant="default" onClick={() => setRulePopupOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Rule
            </Button>
            <Button size="sm" variant="outline" onClick={() => setTemplatePopupOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </UtilityActionButton>

          {/* Three Split Sections: Templates / Rules / Brand Kit */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            {/* Left: Templates Library (40%) */}
            <div className="lg:col-span-4">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Campaign Templates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Pre-built templates for quick campaign creation
                  </p>
                  <div className="space-y-2">
                    <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🚀</span>
                        <div>
                          <p className="font-medium text-sm">Launch Campaign</p>
                          <p className="text-xs text-muted-foreground">2x/day, all channels</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🌱</span>
                        <div>
                          <p className="font-medium text-sm">Nurture Campaign</p>
                          <p className="text-xs text-muted-foreground">2x/week, LinkedIn + Email</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📅</span>
                        <div>
                          <p className="font-medium text-sm">Event Promotion</p>
                          <p className="text-xs text-muted-foreground">Daily countdown pattern</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-4">
                    Browse All Templates
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Middle: Automation Rules (30%) */}
            <div className="lg:col-span-3">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Automation Rules
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Set up "if X then Y" logic for automated workflows
                  </p>
                  <div className="space-y-2">
                    <div className="p-3 border rounded-lg bg-muted/30">
                      <p className="text-xs font-medium">Coming Soon</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Visual rule builder for automated distribution
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Brand Kit (30%) */}
            <div className="lg:col-span-3">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Brand Kit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Brand assets and channel-specific guidelines
                  </p>
                  <div className="space-y-2">
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs font-medium">Instagram</p>
                      <p className="text-xs text-muted-foreground">1080x1080px, #hashtags</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs font-medium">LinkedIn</p>
                      <p className="text-xs text-muted-foreground">Best: Tue-Thu 9-11am</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs font-medium">Twitter/X</p>
                      <p className="text-xs text-muted-foreground">280 chars, threads</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <AutomationRuleDialog open={rulePopupOpen} onOpenChange={setRulePopupOpen} />
      <TemplateDialog open={templatePopupOpen} onOpenChange={setTemplatePopupOpen} />
    </AppLayout>
  );
}, SCREEN_IDS.SHARING_OVERVIEW);
