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
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide">
                <Card className="snap-start min-w-[340px] max-w-[340px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-2xl">
                        🚀
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">Launch Campaign</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Multi-channel product launch
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded">7 posts</span>
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded">3 channels</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="snap-start min-w-[340px] max-w-[340px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-2xl">
                        🌱
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">Nurture Campaign</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Weekly engagement sequence
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded">Recurring</span>
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded">Email + Social</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="snap-start min-w-[340px] max-w-[340px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-2xl">
                        🎉
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">Event Promotion</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Build excitement before event
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded">14-day countdown</span>
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded">All channels</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="snap-start min-w-[340px] max-w-[340px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-2xl">
                        🎯
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">Product Launch</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Coordinated multi-channel rollout
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded">3x/day</span>
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded">All channels</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="snap-start min-w-[340px] max-w-[340px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-2xl">
                        ⚡
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">Flash Sale</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Urgent time-sensitive promotion
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded">Hourly</span>
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded">Social + Email</span>
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
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide">
                  <Card className="snap-start min-w-[340px] max-w-[340px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-2xl">
                          ⏰
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">Auto-Schedule</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Optimize posting times automatically
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded font-medium">Active</span>
                            <span className="text-muted-foreground">3 campaigns</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="snap-start min-w-[340px] max-w-[340px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-2xl">
                          📡
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">Cross-Post</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Sync content across platforms
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-amber-500/10 text-amber-600 rounded font-medium">Paused</span>
                            <span className="text-muted-foreground">5 channels</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="snap-start min-w-[340px] max-w-[340px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-2xl">
                          📈
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">Engagement Boost</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Auto-reply and boost trending posts
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded font-medium">Active</span>
                            <span className="text-muted-foreground">Real-time</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="snap-start min-w-[340px] max-w-[340px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-2xl">
                          🔄
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">Auto-Repost</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Repost top performers automatically
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded font-medium">Active</span>
                            <span className="text-muted-foreground">12 posts affected</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="snap-start min-w-[340px] max-w-[340px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-2xl">
                          🎯
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">Audience Targeting</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Auto-adjust based on engagement
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded font-medium">Active</span>
                            <span className="text-muted-foreground">8 campaigns</span>
                          </div>
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
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide">
                  <Card className="snap-start min-w-[340px] max-w-[340px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-2xl">
                          🎨
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">Voice & Tone</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Brand personality guidelines
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded">4 guidelines</span>
                            <span className="text-muted-foreground">Last updated: 2w ago</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="snap-start min-w-[340px] max-w-[340px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-2xl">
                          🖼️
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">Visual Assets</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Logos, colors, and imagery
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded">42 assets</span>
                            <span className="text-muted-foreground">Brand approved</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="snap-start min-w-[340px] max-w-[340px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-2xl">
                          📋
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">Channel Guidelines</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Platform-specific best practices
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded">6 channels</span>
                            <span className="text-muted-foreground">Detailed specs</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="snap-start min-w-[340px] max-w-[340px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-2xl">
                          📐
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">Design Templates</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Pre-made layouts for each channel
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded">24 templates</span>
                            <span className="text-muted-foreground">Updated weekly</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="snap-start min-w-[340px] max-w-[340px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl">
                          ✨
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">Content Library</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Stock photos and graphics
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded">1,200+ assets</span>
                            <span className="text-muted-foreground">Licensed</span>
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
