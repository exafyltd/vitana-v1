import React from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
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
import { HorizontalCardList } from '@/components/ui/horizontal-card-list';
import { StandardHorizontalCardProps } from '@/components/ui/standard-horizontal-card';
import { AutomationRuleDialog } from "@/components/sharing/AutomationRuleDialog";
import { TemplateDialog } from "@/components/sharing/TemplateDialog";
import { BrandGuidelineDialog } from "@/components/sharing/BrandGuidelineDialog";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Zap, BarChart3, Palette, Plus, ChevronDown, Rocket, Sparkles, Calendar, Clock, Share2, TrendingUp, MessageSquare, Image, BookOpen, FileText, Settings, Repeat } from "lucide-react";

// Transform campaign templates to StandardHorizontalCard format
const getCampaignTemplateCards = (): StandardHorizontalCardProps[] => [
  {
    id: 'template-launch',
    screenId: 'sharing-distribution',
    icon: <Rocket className="w-5 h-5" />,
    title: 'Launch Campaign',
    description: 'Multi-channel coordinated rollout with timed posts',
    badges: [
      { label: 'Popular', variant: 'default' }
    ],
    metadata: [
      { icon: <Zap className="w-3.5 h-3.5" />, text: '1x/day' },
      { icon: <Repeat className="w-3.5 h-3.5" />, text: 'All channels' }
    ],
    primaryAction: {
      label: 'Use Template',
      onClick: () => console.log('Use Launch Campaign'),
      variant: 'outline'
    }
  },
  {
    id: 'template-nurture',
    screenId: 'sharing-distribution',
    icon: <Sparkles className="w-5 h-5" />,
    title: 'Nurture Campaign',
    description: 'Educational series to build trust over time',
    metadata: [
      { icon: <Zap className="w-3.5 h-3.5" />, text: '3x/week' },
      { icon: <Repeat className="w-3.5 h-3.5" />, text: 'Email + Blog' }
    ],
    primaryAction: {
      label: 'Use Template',
      onClick: () => console.log('Use Nurture Campaign'),
      variant: 'outline'
    }
  },
  {
    id: 'template-event',
    screenId: 'sharing-distribution',
    icon: <Calendar className="w-5 h-5" />,
    title: 'Event Promotion',
    description: 'Countdown sequence leading to an event date',
    metadata: [
      { icon: <Zap className="w-3.5 h-3.5" />, text: '2x/day' },
      { icon: <Repeat className="w-3.5 h-3.5" />, text: 'Social + Email' }
    ],
    primaryAction: {
      label: 'Use Template',
      onClick: () => console.log('Use Event Promotion'),
      variant: 'outline'
    }
  },
  {
    id: 'template-product',
    screenId: 'sharing-distribution',
    icon: '🎯',
    title: 'Product Launch',
    description: 'Coordinated multi-channel rollout',
    metadata: [
      { icon: <Zap className="w-3.5 h-3.5" />, text: '3x/day' },
      { icon: <Repeat className="w-3.5 h-3.5" />, text: 'All channels' }
    ],
    primaryAction: {
      label: 'Use Template',
      onClick: () => console.log('Use Product Launch'),
      variant: 'outline'
    }
  },
  {
    id: 'template-flash',
    screenId: 'sharing-distribution',
    icon: '⚡',
    title: 'Flash Sale',
    description: 'Urgent time-sensitive promotion',
    metadata: [
      { icon: <Zap className="w-3.5 h-3.5" />, text: 'Hourly' },
      { icon: <Repeat className="w-3.5 h-3.5" />, text: 'Social + Email' }
    ],
    primaryAction: {
      label: 'Use Template',
      onClick: () => console.log('Use Flash Sale'),
      variant: 'outline'
    }
  }
];

// Transform automation rules to StandardHorizontalCard format
const getAutomationRuleCards = (): StandardHorizontalCardProps[] => [
  {
    id: 'rule-schedule',
    screenId: 'sharing-distribution',
    icon: <Clock className="w-5 h-5" />,
    title: 'Auto-Schedule',
    description: 'Automatically schedule posts at optimal times',
    badges: [
      { label: 'Active', variant: 'default' }
    ],
    metadata: [
      { icon: <Repeat className="w-3.5 h-3.5" />, text: '24 posts affected' }
    ],
    secondaryActions: [
      {
        label: 'Edit',
        onClick: () => console.log('Edit Auto-Schedule'),
        icon: <Settings className="w-4 h-4" />
      }
    ]
  },
  {
    id: 'rule-crosspost',
    screenId: 'sharing-distribution',
    icon: <Share2 className="w-5 h-5" />,
    title: 'Cross-Post',
    description: 'Mirror LinkedIn posts to Twitter automatically',
    badges: [
      { label: 'Active', variant: 'default' }
    ],
    metadata: [
      { icon: <Repeat className="w-3.5 h-3.5" />, text: '15 posts this week' }
    ],
    secondaryActions: [
      {
        label: 'Edit',
        onClick: () => console.log('Edit Cross-Post'),
        icon: <Settings className="w-4 h-4" />
      }
    ]
  },
  {
    id: 'rule-boost',
    screenId: 'sharing-distribution',
    icon: <TrendingUp className="w-5 h-5" />,
    title: 'Engagement Boost',
    description: 'Repost underperforming content at better times',
    metadata: [
      { icon: <Repeat className="w-3.5 h-3.5" />, text: '8 boosted' }
    ],
    secondaryActions: [
      {
        label: 'Edit',
        onClick: () => console.log('Edit Engagement Boost'),
        icon: <Settings className="w-4 h-4" />
      }
    ]
  },
  {
    id: 'rule-repost',
    screenId: 'sharing-distribution',
    icon: '🔄',
    title: 'Auto-Repost',
    description: 'Repost top performers automatically',
    badges: [
      { label: 'Active', variant: 'default' }
    ],
    metadata: [
      { icon: <Repeat className="w-3.5 h-3.5" />, text: '12 posts affected' }
    ],
    secondaryActions: [
      {
        label: 'Edit',
        onClick: () => console.log('Edit Auto-Repost'),
        icon: <Settings className="w-4 h-4" />
      }
    ]
  },
  {
    id: 'rule-targeting',
    screenId: 'sharing-distribution',
    icon: '🎯',
    title: 'Audience Targeting',
    description: 'Auto-adjust based on engagement',
    badges: [
      { label: 'Active', variant: 'default' }
    ],
    metadata: [
      { icon: <Repeat className="w-3.5 h-3.5" />, text: '8 campaigns' }
    ],
    secondaryActions: [
      {
        label: 'Edit',
        onClick: () => console.log('Edit Audience Targeting'),
        icon: <Settings className="w-4 h-4" />
      }
    ]
  }
];

// Transform brand kit items to StandardHorizontalCard format
const getBrandKitCards = (): StandardHorizontalCardProps[] => [
  {
    id: 'brand-voice',
    screenId: 'sharing-distribution',
    icon: <MessageSquare className="w-5 h-5" />,
    title: 'Voice & Tone',
    description: 'Professional, encouraging, science-backed',
    metadata: [
      { icon: <FileText className="w-3.5 h-3.5" />, text: '12 guidelines' }
    ],
    primaryAction: {
      label: 'View Guide',
      onClick: () => console.log('View Voice & Tone Guide'),
      variant: 'outline'
    }
  },
  {
    id: 'brand-assets',
    screenId: 'sharing-distribution',
    icon: <Image className="w-5 h-5" />,
    title: 'Visual Assets',
    description: 'Logos, colors, fonts, imagery library',
    metadata: [
      { icon: <FileText className="w-3.5 h-3.5" />, text: '48 assets' }
    ],
    primaryAction: {
      label: 'Browse Assets',
      onClick: () => console.log('Browse Visual Assets'),
      variant: 'outline'
    }
  },
  {
    id: 'brand-guidelines',
    screenId: 'sharing-distribution',
    icon: <BookOpen className="w-5 h-5" />,
    title: 'Channel Guidelines',
    description: 'Specific rules for LinkedIn, X, Instagram',
    metadata: [
      { icon: <FileText className="w-3.5 h-3.5" />, text: '5 channels' }
    ],
    primaryAction: {
      label: 'View Guidelines',
      onClick: () => console.log('View Channel Guidelines'),
      variant: 'outline'
    }
  },
  {
    id: 'brand-templates',
    screenId: 'sharing-distribution',
    icon: '📐',
    title: 'Design Templates',
    description: 'Pre-made layouts for each channel',
    metadata: [
      { icon: <FileText className="w-3.5 h-3.5" />, text: '24 templates' }
    ],
    primaryAction: {
      label: 'Browse Templates',
      onClick: () => console.log('Browse Design Templates'),
      variant: 'outline'
    }
  },
  {
    id: 'brand-library',
    screenId: 'sharing-distribution',
    icon: '✨',
    title: 'Content Library',
    description: 'Stock photos and graphics',
    metadata: [
      { icon: <FileText className="w-3.5 h-3.5" />, text: '1,200+ assets' }
    ],
    primaryAction: {
      label: 'Browse Library',
      onClick: () => console.log('Browse Content Library'),
      variant: 'outline'
    }
  }
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
            <SplitBarContent value="templates" className="mt-6">
              <HorizontalCardList
                items={getCampaignTemplateCards()}
                variant="standard"
                layout="rail"
                screenId="sharing-distribution"
                listId="campaign-templates"
                groupBy="none"
                gap="md"
                className="pb-4"
              />
            </SplitBarContent>

            {/* Automation Rules Tab */}
            <SplitBarContent value="automation" className="mt-6">
              <HorizontalCardList
                items={getAutomationRuleCards()}
                variant="standard"
                layout="rail"
                screenId="sharing-distribution"
                listId="automation-rules"
                groupBy="none"
                gap="md"
                className="pb-4"
              />
            </SplitBarContent>

            {/* Brand Kit Tab */}
            <SplitBarContent value="brand" className="mt-6">
              <HorizontalCardList
                items={getBrandKitCards()}
                variant="standard"
                layout="rail"
                screenId="sharing-distribution"
                listId="brand-kit"
                groupBy="none"
                gap="md"
                className="pb-4"
              />
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
