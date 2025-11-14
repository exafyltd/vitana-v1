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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AutomationRuleDialog } from "@/components/sharing/AutomationRuleDialog";
import { TemplateDialog } from "@/components/sharing/TemplateDialog";
import { BrandGuidelineDialog } from "@/components/sharing/BrandGuidelineDialog";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { 
  Zap, 
  BarChart3, 
  Palette, 
  Plus, 
  ChevronDown,
  Plane,
  Sparkles,
  Paintbrush
} from "lucide-react";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  {
    id: "launch",
    icon: "🚀",
    name: "Launch Campaign",
    description: "2×/day, all channels",
    tooltip: "Use this to plan recurring content easily for product launches and major announcements.",
  },
  {
    id: "nurture",
    icon: "🌱",
    name: "Nurture Campaign",
    description: "2×/week, LinkedIn + Email",
    tooltip: "Perfect for thought leadership and ongoing community building.",
  },
  {
    id: "event",
    icon: "📅",
    name: "Event Promotion",
    description: "Daily countdown pattern",
    tooltip: "Ideal for conferences, webinars, and live events with automated countdown.",
  },
];

const BRAND_CHANNELS = [
  {
    icon: "📸",
    name: "Instagram",
    specs: "1080×1080 px, #hashtags",
    color: "from-purple-500/10 to-pink-500/10",
  },
  {
    icon: "💼",
    name: "LinkedIn",
    specs: "Best: Tue–Thu 9-11 AM",
    color: "from-blue-500/10 to-blue-600/10",
  },
  {
    icon: "🐦",
    name: "Twitter/X",
    specs: "280 chars, threads",
    color: "from-sky-500/10 to-blue-500/10",
  },
];

const BRAND_SWATCHES = [
  { name: "Vitana Teal", color: "hsl(173, 58%, 39%)" },
  { name: "Soft Pink", color: "hsl(328, 86%, 70%)" },
  { name: "Sky Blue", color: "hsl(199, 89%, 48%)" },
];

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

      <TooltipProvider>
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

          {/* Main Content Zone: Tri-Panel Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-10 gap-6">
            {/* 1️⃣ Campaign Templates (40%) */}
            <div className="lg:col-span-4 space-y-4 animate-fade-in">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2 mb-1">
                  <Palette className="w-5 h-5" />
                  Campaign Templates
                </h3>
                <p className="text-sm text-muted-foreground">
                  Pre-built templates for quick campaign creation.
                </p>
              </div>

              <div className="space-y-3">
                {TEMPLATES.map((template, index) => (
                  <Tooltip key={template.id}>
                    <TooltipTrigger asChild>
                      <Card
                        className={cn(
                          "rounded-2xl border-2 transition-all duration-300 cursor-pointer group",
                          "bg-gradient-to-br from-background via-background to-background",
                          "hover:shadow-lg hover:-translate-y-1",
                          "border-transparent",
                          "relative overflow-hidden"
                        )}
                        style={{
                          animationDelay: `${index * 100}ms`,
                          backgroundImage: "linear-gradient(135deg, hsl(173 58% 39% / 0.05), hsl(328 86% 70% / 0.05))",
                          borderImage: "linear-gradient(135deg, hsl(173 58% 39% / 0.3), hsl(328 86% 70% / 0.3)) 1",
                        }}
                      >
                        {/* Gradient border effect on hover */}
                        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          style={{
                            background: "linear-gradient(135deg, hsl(173 58% 39% / 0.1), hsl(328 86% 70% / 0.1))",
                          }}
                        />
                        
                        <CardContent className="p-4 relative">
                          <div className="flex items-start gap-3">
                            <div className="text-3xl group-hover:scale-110 transition-transform duration-300">
                              {template.icon}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm mb-1">
                                {template.name}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {template.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">{template.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}

                <Button 
                  variant="outline" 
                  className="w-full rounded-xl"
                  onClick={() => setTemplatePopupOpen(true)}
                >
                  Browse All Templates
                </Button>
              </div>
            </div>

            {/* 2️⃣ Automation Rules - Autopilot Section (30%) */}
            <div className="lg:col-span-3 space-y-4 animate-fade-in" style={{ animationDelay: "100ms" }}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <h3 className="text-base font-semibold flex items-center gap-2 mb-1 cursor-help">
                      <Plane className="w-5 h-5" />
                      Automation Rules ✈️
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Set up Autopilot logic for hands-free distribution.
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Autopilot powered distribution engine.</p>
                </TooltipContent>
              </Tooltip>

              <Card
                className="rounded-2xl border-2 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--background)), hsl(var(--sys-autopilot-accent) / 0.15))",
                }}
              >
                {/* Animated plane icon */}
                <div className="absolute top-4 right-4 text-muted-foreground/30 animate-pulse">
                  <Plane 
                    className="w-12 h-12" 
                    style={{
                      animation: "drift 3s ease-in-out infinite",
                    }}
                  />
                </div>

                <CardContent className="p-6 relative space-y-4">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border">
                      <Zap className="w-3 h-3" />
                      <span className="text-xs font-medium">Coming Soon</span>
                    </div>
                    
                    <h4 className="font-semibold text-sm">
                      Visual Rule Builder
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      'If X → then Y' automation for hands-free content distribution across all channels.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30 border border-dashed">
                    <p className="text-xs text-center text-muted-foreground">
                      Autopilot automates campaign delivery across all channels.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 3️⃣ Brand Kit (30%) */}
            <div className="lg:col-span-3 space-y-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2 mb-1">
                  <BarChart3 className="w-5 h-5" />
                  Brand Kit
                </h3>
                <p className="text-sm text-muted-foreground">
                  Maintain channel-specific look and consistency.
                </p>
              </div>

              <Card className="rounded-2xl">
                <CardContent className="p-4 space-y-4">
                  {/* Color Swatches */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                      Brand Colors
                    </p>
                    <div className="flex gap-2">
                      {BRAND_SWATCHES.map((swatch) => (
                        <Tooltip key={swatch.name}>
                          <TooltipTrigger asChild>
                            <div
                              className="w-10 h-10 rounded-lg border-2 border-border cursor-pointer hover:scale-110 transition-transform"
                              style={{ backgroundColor: swatch.color }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{swatch.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>

                  {/* Channel Guidelines */}
                  <div className="space-y-2">
                    {BRAND_CHANNELS.map((channel) => (
                      <Tooltip key={channel.name}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md",
                              "bg-gradient-to-br",
                              channel.color
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{channel.icon}</span>
                              <div>
                                <p className="text-xs font-medium">{channel.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {channel.specs}
                                </p>
                              </div>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Apply preset in Campaign Editor.</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full rounded-xl"
                    onClick={() => setGuidelinePopupOpen(true)}
                  >
                    Manage Brand Assets
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <Card className="rounded-2xl border-2 bg-gradient-to-r from-background via-muted/20 to-background">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setRulePopupOpen(true)}
                >
                  <Plane className="w-4 h-4 mr-2" />
                  Sync Autopilot Rules
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Apply AI Best Times
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setGuidelinePopupOpen(true)}
                >
                  <Paintbrush className="w-4 h-4 mr-2" />
                  Update Brand Kit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </TooltipProvider>

      <AutomationRuleDialog open={rulePopupOpen} onOpenChange={setRulePopupOpen} />
      <TemplateDialog open={templatePopupOpen} onOpenChange={setTemplatePopupOpen} />
      <BrandGuidelineDialog open={guidelinePopupOpen} onOpenChange={setGuidelinePopupOpen} />

      {/* Add drift animation for plane */}
      <style>{`
        @keyframes drift {
          0%, 100% {
            transform: translateX(0) translateY(0) rotate(0deg);
          }
          25% {
            transform: translateX(5px) translateY(-3px) rotate(2deg);
          }
          50% {
            transform: translateX(0) translateY(0) rotate(0deg);
          }
          75% {
            transform: translateX(-5px) translateY(3px) rotate(-2deg);
          }
        }
      `}</style>
    </AppLayout>
  );
}, SCREEN_IDS.SHARING_OVERVIEW);
