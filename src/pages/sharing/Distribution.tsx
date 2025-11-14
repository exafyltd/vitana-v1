import React from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SplitBar,
  SplitBarList,
  SplitBarTrigger,
  SplitBarContent,
} from "@/components/ui/split-bar";
import { AutomationRuleDialog } from "@/components/sharing/AutomationRuleDialog";
import { TemplateDialog } from "@/components/sharing/TemplateDialog";
import { BrandGuidelineDialog } from "@/components/sharing/BrandGuidelineDialog";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Zap, BarChart3, Palette, Plus, ChevronDown, Rocket } from "lucide-react";

export default withScreenId(function Distribution() {
  const [rulePopupOpen, setRulePopupOpen] = React.useState(false);
  const [templatePopupOpen, setTemplatePopupOpen] = React.useState(false);
  const [guidelinePopupOpen, setGuidelinePopupOpen] = React.useState(false);

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="default">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Asset
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setTemplatePopupOpen(true)}>
                  <Palette className="w-4 h-4 mr-2" />
                  <div className="flex flex-col">
                    <span className="font-medium">Campaign Template</span>
                    <span className="text-xs text-muted-foreground">Pre-built distribution pattern</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRulePopupOpen(true)}>
                  <Zap className="w-4 h-4 mr-2" />
                  <div className="flex flex-col">
                    <span className="font-medium">Automation Rule</span>
                    <span className="text-xs text-muted-foreground">If-then workflow logic</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setGuidelinePopupOpen(true)}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  <div className="flex flex-col">
                    <span className="font-medium">Brand Guideline</span>
                    <span className="text-xs text-muted-foreground">Channel-specific rules</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </UtilityActionButton>

          {/* Split Bar Navigation */}
          <SplitBar defaultValue="templates" className="w-full">
            <SplitBarList>
              <SplitBarTrigger value="templates">
                <Rocket className="w-4 h-4" />
                Campaign Templates
              </SplitBarTrigger>
              <SplitBarTrigger value="automation">
                <Zap className="w-4 h-4" />
                Automation Rules
              </SplitBarTrigger>
              <SplitBarTrigger value="brand">
                <Palette className="w-4 h-4" />
                Brand Kit
              </SplitBarTrigger>
            </SplitBarList>

            {/* Campaign Templates Tab */}
            <SplitBarContent value="templates">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pre-built templates for quick campaign creation
                </p>
                
                {/* Horizontal scroll list */}
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
                  <Card className="min-w-[300px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-2xl">
                          🚀
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">Launch Campaign</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            High-frequency distribution pattern
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded">2x/day</span>
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded">All channels</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="min-w-[300px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-2xl">
                          🌱
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">Nurture Campaign</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Build relationships over time
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded">2x/week</span>
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded">LinkedIn + Email</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="min-w-[300px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-2xl">
                          📅
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">Event Promotion</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Build excitement with countdown
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded">Daily</span>
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded">Multi-channel</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="min-w-[300px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-2xl">
                          🎯
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">Product Launch</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Coordinated multi-phase rollout
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded">3 phases</span>
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded">All platforms</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </SplitBarContent>

            {/* Automation Rules Tab */}
            <SplitBarContent value="automation">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Set up "if X then Y" logic for automated workflows
                </p>
                
                {/* Horizontal scroll list */}
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
                  <Card className="min-w-[320px] flex-shrink-0 bg-muted/30">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Zap className="w-10 h-10 text-muted-foreground/50" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">Visual Rule Builder</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Drag-and-drop interface for creating automation rules. Coming soon to help you automate your distribution workflows.
                          </p>
                          <Button variant="outline" size="sm" disabled>
                            Coming Soon
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="min-w-[320px] flex-shrink-0 bg-muted/30">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Zap className="w-10 h-10 text-muted-foreground/50" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">Smart Triggers</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Time-based, engagement-based, and event-based triggers for intelligent automation.
                          </p>
                          <Button variant="outline" size="sm" disabled>
                            Coming Soon
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </SplitBarContent>

            {/* Brand Kit Tab */}
            <SplitBarContent value="brand">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Brand assets and channel-specific guidelines
                </p>
                
                {/* Horizontal scroll list */}
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
                  <Card className="min-w-[280px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                          <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Instagram</h3>
                          <p className="text-xs text-muted-foreground mb-3">
                            Visual-first platform guidelines
                          </p>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Size:</span>
                              <span className="font-medium">1080×1080px</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Format:</span>
                              <span className="font-medium">JPG, PNG</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Best:</span>
                              <span className="font-medium">#hashtags</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="min-w-[280px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                          <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">LinkedIn</h3>
                          <p className="text-xs text-muted-foreground mb-3">
                            Professional network optimization
                          </p>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Size:</span>
                              <span className="font-medium">1200×627px</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Best time:</span>
                              <span className="font-medium">Tue-Thu 9-11am</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tone:</span>
                              <span className="font-medium">Professional</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="min-w-[280px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                          <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Twitter/X</h3>
                          <p className="text-xs text-muted-foreground mb-3">
                            Quick, engaging content
                          </p>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Limit:</span>
                              <span className="font-medium">280 chars</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Format:</span>
                              <span className="font-medium">Threads</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Best:</span>
                              <span className="font-medium">Quick updates</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="min-w-[280px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                          <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">YouTube</h3>
                          <p className="text-xs text-muted-foreground mb-3">
                            Video content guidelines
                          </p>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Thumbnail:</span>
                              <span className="font-medium">1280×720px</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Length:</span>
                              <span className="font-medium">7-15 min</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">SEO:</span>
                              <span className="font-medium">Keywords</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <AutomationRuleDialog open={rulePopupOpen} onOpenChange={setRulePopupOpen} />
      <TemplateDialog open={templatePopupOpen} onOpenChange={setTemplatePopupOpen} />
      <BrandGuidelineDialog open={guidelinePopupOpen} onOpenChange={setGuidelinePopupOpen} />
    </AppLayout>
  );
}, SCREEN_IDS.SHARING_OVERVIEW);
