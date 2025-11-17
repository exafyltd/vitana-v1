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
    },
    expandedContent: (
      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-sm mb-2">📋 Campaign Playbook</h4>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li>Week 1: Teaser posts (3x, short-form)</li>
            <li>Launch Day: Hero announcement + email blast</li>
            <li>Week 2: Social proof, testimonials, micro-FAQ</li>
            <li>Week 3: Last-chance urgency posts</li>
          </ul>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>Channels:</strong> LinkedIn, X, Instagram, Email, Blog<br/>
          <strong>Duration:</strong> 3 weeks<br/>
          <strong>Est. Reach:</strong> 50K-100K impressions
        </div>
      </div>
    )
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
    },
    expandedContent: (
      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-sm mb-2">📖 Educational Series</h4>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li>Phase 1: Foundation concepts (Weeks 1-2)</li>
            <li>Phase 2: Practical applications (Weeks 3-4)</li>
            <li>Phase 3: Advanced strategies (Weeks 5-6)</li>
            <li>Phase 4: Case studies & results (Weeks 7-8)</li>
          </ul>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>Format:</strong> Blog posts + Email digests<br/>
          <strong>Goal:</strong> Build authority and trust over 8 weeks
        </div>
      </div>
    )
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
    },
    expandedContent: (
      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-sm mb-2">⏰ Countdown Timeline</h4>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li>T-14 days: Save the date announcement</li>
            <li>T-7 days: Speaker/agenda reveal</li>
            <li>T-3 days: Last chance reminder</li>
            <li>T-1 day: Final countdown + details</li>
            <li>Event day: Live updates & engagement</li>
          </ul>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>Best for:</strong> Webinars, launches, live events
        </div>
      </div>
    )
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
    },
    expandedContent: (
      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-sm mb-2">🚀 Launch Sequence</h4>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li>Pre-launch: Waitlist building (2 weeks)</li>
            <li>Launch week: Daily feature highlights</li>
            <li>Week 2: Customer testimonials & social proof</li>
            <li>Week 3: Limited-time offer push</li>
          </ul>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>Channels:</strong> All platforms + paid ads<br/>
          <strong>Duration:</strong> 4 weeks intensive campaign
        </div>
      </div>
    )
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
    },
    expandedContent: (
      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-sm mb-2">⚡ Urgency Tactics</h4>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li>Hour 0: Flash announcement across all channels</li>
            <li>Hour 3: "50% claimed" urgency update</li>
            <li>Hour 6: "Last 3 hours" countdown</li>
            <li>Final hour: Minute-by-minute updates</li>
          </ul>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>Best for:</strong> Clearance, limited inventory, time-sensitive offers
        </div>
      </div>
    )
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
    primaryAction: {
      label: 'Edit Rule',
      onClick: () => console.log('Edit Auto-Schedule'),
      variant: 'outline'
    },
    expandedContent: (
      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-sm mb-2">⚙️ Rule Configuration</h4>
          <div className="text-sm text-muted-foreground space-y-1.5">
            <div><strong>Trigger:</strong> New post created</div>
            <div><strong>Action:</strong> Schedule for optimal time based on audience activity</div>
            <div><strong>Channels:</strong> LinkedIn (9 AM), X (12 PM), Instagram (6 PM)</div>
            <div><strong>Timezone:</strong> User's local timezone</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>Last 7 days:</strong> 24 posts auto-scheduled<br/>
          <strong>Avg. Engagement:</strong> +32% vs manual posts
        </div>
      </div>
    )
  },
  {
    id: 'rule-crosspost',
    screenId: 'sharing-distribution',
    icon: <Share2 className="w-5 h-5" />,
    title: 'Cross-Post',
    description: 'Share new content across all channels',
    badges: [
      { label: 'Active', variant: 'default' }
    ],
    metadata: [
      { icon: <Repeat className="w-3.5 h-3.5" />, text: '5 channels' }
    ],
    primaryAction: {
      label: 'Edit Rule',
      onClick: () => console.log('Edit Cross-Post'),
      variant: 'outline'
    },
    expandedContent: (
      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-sm mb-2">🔄 Distribution Settings</h4>
          <div className="text-sm text-muted-foreground space-y-1.5">
            <div><strong>Trigger:</strong> New blog post published</div>
            <div><strong>Action:</strong> Create tailored posts for each platform</div>
            <div><strong>Active Channels:</strong> LinkedIn, X, Instagram, Facebook, Blog</div>
            <div><strong>Customization:</strong> Auto-adapt format per channel</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>Time saved:</strong> ~3 hours per blog post
        </div>
      </div>
    )
  },
  {
    id: 'rule-boost',
    screenId: 'sharing-distribution',
    icon: <TrendingUp className="w-5 h-5" />,
    title: 'Engagement Boost',
    description: 'Repost high-performing content',
    metadata: [
      { icon: <Repeat className="w-3.5 h-3.5" />, text: 'Weekly' }
    ],
    primaryAction: {
      label: 'Enable Boost',
      onClick: () => console.log('Enable Engagement Boost'),
      variant: 'outline'
    },
    expandedContent: (
      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-sm mb-2">📈 Boost Strategy</h4>
          <div className="text-sm text-muted-foreground space-y-1.5">
            <div><strong>Criteria:</strong> Posts with &gt;100 engagements</div>
            <div><strong>Timing:</strong> Repost 7 days after original</div>
            <div><strong>Updates:</strong> Add "In case you missed..." preface</div>
            <div><strong>Frequency:</strong> Max 1 repost per week</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>Avg. Boost:</strong> +45% additional reach per repost
        </div>
      </div>
    )
  },
  {
    id: 'rule-repost',
    screenId: 'sharing-distribution',
    icon: <Repeat className="w-5 h-5" />,
    title: 'Auto-Repost',
    description: 'Reshare evergreen content periodically',
    badges: [
      { label: 'Active', variant: 'default' }
    ],
    metadata: [
      { icon: <Repeat className="w-3.5 h-3.5" />, text: 'Monthly' }
    ],
    primaryAction: {
      label: 'Edit Rule',
      onClick: () => console.log('Edit Auto-Repost'),
      variant: 'outline'
    },
    expandedContent: (
      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-sm mb-2">♻️ Evergreen Rotation</h4>
          <div className="text-sm text-muted-foreground space-y-1.5">
            <div><strong>Content Pool:</strong> 12 evergreen posts tagged</div>
            <div><strong>Schedule:</strong> 1 repost per month, rotating</div>
            <div><strong>Optimization:</strong> Best time of day per platform</div>
            <div><strong>Updates:</strong> Minor refreshes to headlines/CTAs</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>Strategy:</strong> Keep valuable content in circulation
        </div>
      </div>
    )
  },
  {
    id: 'rule-targeting',
    screenId: 'sharing-distribution',
    icon: '🎯',
    title: 'Audience Targeting',
    description: 'Smart content routing based on preferences',
    badges: [
      { label: 'Active', variant: 'default' }
    ],
    metadata: [
      { icon: <Repeat className="w-3.5 h-3.5" />, text: '3 segments' }
    ],
    primaryAction: {
      label: 'Edit Rule',
      onClick: () => console.log('Edit Audience Targeting'),
      variant: 'outline'
    },
    expandedContent: (
      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-sm mb-2">🎯 Segment Rules</h4>
          <div className="text-sm text-muted-foreground space-y-1.5">
            <div><strong>Segment 1:</strong> Beginners → How-to guides</div>
            <div><strong>Segment 2:</strong> Intermediate → Case studies</div>
            <div><strong>Segment 3:</strong> Advanced → Thought leadership</div>
            <div><strong>Logic:</strong> Based on engagement history & profile data</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>Result:</strong> +28% relevance score, -15% unsubscribes
        </div>
      </div>
    )
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
    },
    expandedContent: (
      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-sm mb-2">📝 Voice Guidelines</h4>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li><strong>Professional:</strong> Science-backed, credible, expert</li>
            <li><strong>Encouraging:</strong> Positive, supportive, empowering</li>
            <li><strong>Accessible:</strong> Clear, jargon-free, relatable</li>
            <li><strong>Authentic:</strong> Honest, transparent, human</li>
          </ul>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>Example:</strong> "Your longevity journey starts with small, sustainable changes. We're here to guide you every step of the way."
        </div>
      </div>
    )
  },
  {
    id: 'brand-assets',
    screenId: 'sharing-distribution',
    icon: <Image className="w-5 h-5" />,
    title: 'Visual Assets',
    description: 'Logos, images, templates library',
    metadata: [
      { icon: <FileText className="w-3.5 h-3.5" />, text: '48 assets' }
    ],
    primaryAction: {
      label: 'Browse Assets',
      onClick: () => console.log('Browse Visual Assets'),
      variant: 'outline'
    },
    expandedContent: (
      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-sm mb-2">🎨 Asset Library</h4>
          <div className="text-sm text-muted-foreground space-y-1.5">
            <div><strong>Logos:</strong> 8 variations (color, mono, wordmark)</div>
            <div><strong>Templates:</strong> 12 social media post designs</div>
            <div><strong>Images:</strong> 20 brand photography assets</div>
            <div><strong>Icons:</strong> 8 custom icon sets</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>Format:</strong> SVG, PNG, JPG • High-res & web-optimized
        </div>
      </div>
    )
  },
  {
    id: 'brand-guidelines',
    screenId: 'sharing-distribution',
    icon: <BookOpen className="w-5 h-5" />,
    title: 'Channel Guidelines',
    description: 'Platform-specific best practices',
    metadata: [
      { icon: <FileText className="w-3.5 h-3.5" />, text: '6 channels' }
    ],
    primaryAction: {
      label: 'View Guidelines',
      onClick: () => console.log('View Channel Guidelines'),
      variant: 'outline'
    },
    expandedContent: (
      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-sm mb-2">📱 Platform Specs</h4>
          <div className="text-sm text-muted-foreground space-y-1.5">
            <div><strong>LinkedIn:</strong> Thought leadership, 1200-1500 chars</div>
            <div><strong>X:</strong> Quick insights, 240 chars + image</div>
            <div><strong>Instagram:</strong> Visual stories, 125 chars + carousel</div>
            <div><strong>Email:</strong> Deep dives, 500-800 words</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>Includes:</strong> Image specs, hashtag strategy, posting times
        </div>
      </div>
    )
  },
  {
    id: 'brand-templates',
    screenId: 'sharing-distribution',
    icon: <Palette className="w-5 h-5" />,
    title: 'Design Templates',
    description: 'Ready-to-use post templates',
    metadata: [
      { icon: <FileText className="w-3.5 h-3.5" />, text: '24 templates' }
    ],
    primaryAction: {
      label: 'Browse Templates',
      onClick: () => console.log('Browse Design Templates'),
      variant: 'outline'
    },
    expandedContent: (
      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-sm mb-2">🎨 Template Collection</h4>
          <div className="text-sm text-muted-foreground space-y-1.5">
            <div><strong>Quote Cards:</strong> 6 designs</div>
            <div><strong>Stat Graphics:</strong> 5 layouts</div>
            <div><strong>Tips & How-Tos:</strong> 8 formats</div>
            <div><strong>Announcements:</strong> 5 styles</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>Editable in:</strong> Canva, Figma, or directly in-app
        </div>
      </div>
    )
  },
  {
    id: 'brand-library',
    screenId: 'sharing-distribution',
    icon: <FileText className="w-5 h-5" />,
    title: 'Content Library',
    description: 'Approved copy and messaging',
    metadata: [
      { icon: <FileText className="w-3.5 h-3.5" />, text: '36 snippets' }
    ],
    primaryAction: {
      label: 'Browse Library',
      onClick: () => console.log('Browse Content Library'),
      variant: 'outline'
    },
    expandedContent: (
      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-sm mb-2">📚 Approved Messaging</h4>
          <div className="text-sm text-muted-foreground space-y-1.5">
            <div><strong>Headlines:</strong> 12 proven formulas</div>
            <div><strong>CTAs:</strong> 8 high-converting phrases</div>
            <div><strong>Intros:</strong> 10 hook templates</div>
            <div><strong>Closings:</strong> 6 signature sign-offs</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>Usage:</strong> Copy-paste or customize for your needs
        </div>
      </div>
    )
  }
];
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
