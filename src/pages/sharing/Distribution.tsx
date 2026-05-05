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
import { t } from '@/lib/i18n-toast';

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
          <h4 className="font-semibold text-sm mb-2">{t('screens.sharing.campaignPlaybook')}</h4>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li>{t('screens.sharing.week1TeaserPosts3xShortform')}</li>
            <li>{t('screens.sharing.launchDayHeroAnnouncementEmailBlast')}</li>
            <li>{t('screens.sharing.week2SocialProofTestimonialsMicrofaq')}</li>
            <li>{t('screens.sharing.week3LastchanceUrgencyPosts')}</li>
          </ul>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>{t('screens.sharing.channels')}</strong>{t('screens.sharing.linkedinXInstagramEmailBlog')}<br/>
          <strong>{t('screens.sharing.duration')}</strong>{t('screens.sharing.text3Weeks')}<br/>
          <strong>{t('screens.sharing.estReach')}</strong>{t('screens.sharing.text50k100kImpressions')}
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
          <h4 className="font-semibold text-sm mb-2">{t('screens.sharing.educationalSeries')}</h4>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li>{t('screens.sharing.phase1FoundationConceptsWeeks12')}</li>
            <li>{t('screens.sharing.phase2PracticalApplicationsWeeks34')}</li>
            <li>{t('screens.sharing.phase3AdvancedStrategiesWeeks56')}</li>
            <li>{t('screens.sharing.phase4CaseStudiesResultsWeeks')}</li>
          </ul>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>{t('screens.sharing.format')}</strong>{t('screens.sharing.blogPostsEmailDigests')}<br/>
          <strong>{t('screens.sharing.goal')}</strong>{t('screens.sharing.buildAuthorityTrustOver8Weeks')}
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
          <h4 className="font-semibold text-sm mb-2">{t('screens.sharing.countdownTimeline')}</h4>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li>{t('screens.sharing.t14DaysSaveDateAnnouncement')}</li>
            <li>{t('screens.sharing.t7DaysSpeakeragendaReveal')}</li>
            <li>{t('screens.sharing.t3DaysLastChanceReminder')}</li>
            <li>{t('screens.sharing.t1DayFinalCountdownDetails')}</li>
            <li>{t('screens.sharing.eventDayLiveUpdatesEngagement')}</li>
          </ul>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>{t('screens.sharing.bestFor')}</strong>{t('screens.sharing.webinarsLaunchesLiveEvents')}
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
          <h4 className="font-semibold text-sm mb-2">{t('screens.sharing.launchSequence')}</h4>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li>{t('screens.sharing.prelaunchWaitlistBuilding2Weeks')}</li>
            <li>{t('screens.sharing.launchWeekDailyFeatureHighlights')}</li>
            <li>{t('screens.sharing.week2CustomerTestimonialsSocialProof')}</li>
            <li>{t('screens.sharing.week3LimitedtimeOfferPush')}</li>
          </ul>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>{t('screens.sharing.channels')}</strong>{t('screens.sharing.allPlatformsPaidAds')}<br/>
          <strong>{t('screens.sharing.duration')}</strong>{t('screens.sharing.text4WeeksIntensiveCampaign')}
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
          <h4 className="font-semibold text-sm mb-2">{t('screens.sharing.urgencyTactics')}</h4>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li>{t('screens.sharing.hour0FlashAnnouncementAcrossAll')}</li>
            <li>{t('screens.sharing.hour350ClaimedUrgencyUpdate')}</li>
            <li>{t('screens.sharing.hour6Last3HoursCountdown')}</li>
            <li>{t('screens.sharing.finalHourMinutebyminuteUpdates')}</li>
          </ul>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>{t('screens.sharing.bestFor')}</strong>{t('screens.sharing.clearanceLimitedInventoryTimesensitiveOffers')}
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
          <h4 className="font-semibold text-sm mb-2">{t('screens.sharing.ruleConfiguration')}</h4>
          <div className="text-sm text-muted-foreground space-y-1.5">
            <div><strong>{t('screens.sharing.trigger')}</strong> {t('screens.sharing.newPostCreated')}</div>
            <div><strong>{t('screens.sharing.action')}</strong> {t('screens.sharing.scheduleForOptimalTimeBasedAudience')}</div>
            <div><strong>{t('screens.sharing.channels')}</strong> {t('screens.sharing.linkedin9AmX12Pm')}</div>
            <div><strong>{t('screens.sharing.timezone')}</strong> {t('screens.sharing.userSLocalTimezone')}</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>{t('screens.sharing.last7Days')}</strong>{t('screens.sharing.text24PostsAutoscheduled')}<br/>
          <strong>{t('screens.sharing.avgEngagement')}</strong>{t('screens.sharing.text32VsManualPosts')}
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
          <h4 className="font-semibold text-sm mb-2">{t('screens.sharing.distributionSettings')}</h4>
          <div className="text-sm text-muted-foreground space-y-1.5">
            <div><strong>{t('screens.sharing.trigger')}</strong> {t('screens.sharing.newBlogPostPublished')}</div>
            <div><strong>{t('screens.sharing.action')}</strong> {t('screens.sharing.createTailoredPostsForEachPlatform')}</div>
            <div><strong>{t('screens.sharing.activeChannels')}</strong> {t('screens.sharing.linkedinXInstagramFacebookBlog')}</div>
            <div><strong>{t('screens.sharing.customization')}</strong> {t('screens.sharing.autoadaptFormatPerChannel')}</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>{t('screens.sharing.timeSaved')}</strong>{t('screens.sharing.text3HoursPerBlogPost')}
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
          <h4 className="font-semibold text-sm mb-2">{t('screens.sharing.boostStrategy')}</h4>
          <div className="text-sm text-muted-foreground space-y-1.5">
            <div><strong>{t('screens.sharing.criteria')}</strong> {t('screens.sharing.postsWithGt100Engagements')}</div>
            <div><strong>{t('screens.sharing.timing')}</strong> {t('screens.sharing.repost7DaysAfterOriginal')}</div>
            <div><strong>{t('screens.sharing.updates')}</strong> {t('screens.sharing.addCaseYouMissedPreface')}</div>
            <div><strong>{t('screens.sharing.frequency')}</strong> {t('screens.sharing.max1RepostPerWeek')}</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>{t('screens.sharing.avgBoost')}</strong>{t('screens.sharing.text45AdditionalReachPerRepost')}
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
          <h4 className="font-semibold text-sm mb-2">{t('screens.sharing.evergreenRotation')}</h4>
          <div className="text-sm text-muted-foreground space-y-1.5">
            <div><strong>{t('screens.sharing.contentPool')}</strong> {t('screens.sharing.text12EvergreenPostsTagged')}</div>
            <div><strong>{t('screens.sharing.schedule')}</strong> {t('screens.sharing.text1RepostPerMonthRotating')}</div>
            <div><strong>{t('screens.sharing.optimization')}</strong> {t('screens.sharing.bestTimeDayPerPlatform')}</div>
            <div><strong>{t('screens.sharing.updates')}</strong> {t('screens.sharing.minorRefreshesHeadlinesctas')}</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>{t('screens.sharing.strategy')}</strong>{t('screens.sharing.keepValuableContentCirculation')}
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
          <h4 className="font-semibold text-sm mb-2">{t('screens.sharing.segmentRules')}</h4>
          <div className="text-sm text-muted-foreground space-y-1.5">
            <div><strong>{t('screens.sharing.segment1')}</strong> {t('screens.sharing.beginnersHowtoGuides')}</div>
            <div><strong>{t('screens.sharing.segment2')}</strong> {t('screens.sharing.intermediateCaseStudies')}</div>
            <div><strong>{t('screens.sharing.segment3')}</strong> {t('screens.sharing.advancedThoughtLeadership')}</div>
            <div><strong>{t('screens.sharing.logic')}</strong> {t('screens.sharing.basedEngagementHistoryProfileData')}</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>{t('screens.sharing.result')}</strong>{t('screens.sharing.text28RelevanceScore15Unsubscribes')}
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
          <h4 className="font-semibold text-sm mb-2">{t('screens.sharing.voiceGuidelines')}</h4>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li><strong>{t('screens.sharing.professional')}</strong> {t('screens.sharing.sciencebackedCredibleExpert')}</li>
            <li><strong>{t('screens.sharing.encouraging')}</strong> {t('screens.sharing.positiveSupportiveEmpowering')}</li>
            <li><strong>{t('screens.sharing.accessible')}</strong> {t('screens.sharing.clearJargonfreeRelatable')}</li>
            <li><strong>{t('screens.sharing.authentic')}</strong> {t('screens.sharing.honestTransparentHuman')}</li>
          </ul>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>{t('screens.sharing.example')}</strong>{t('screens.sharing.yourLongevityJourneyStartsWithSmall')}
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
          <h4 className="font-semibold text-sm mb-2">{t('screens.sharing.assetLibrary')}</h4>
          <div className="text-sm text-muted-foreground space-y-1.5">
            <div><strong>{t('screens.sharing.logos')}</strong> {t('screens.sharing.text8VariationsColorMonoWordmark')}</div>
            <div><strong>{t('screens.sharing.templates')}</strong> {t('screens.sharing.text12SocialMediaPostDesigns')}</div>
            <div><strong>{t('screens.sharing.images')}</strong> {t('screens.sharing.text20BrandPhotographyAssets')}</div>
            <div><strong>{t('screens.sharing.icons')}</strong> {t('screens.sharing.text8CustomIconSets')}</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>{t('screens.sharing.format')}</strong>{t('screens.sharing.svgPngJpgHighresWeboptimized')}
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
          <h4 className="font-semibold text-sm mb-2">{t('screens.sharing.platformSpecs')}</h4>
          <div className="text-sm text-muted-foreground space-y-1.5">
            <div><strong>{t('screens.sharing.linkedin')}</strong> {t('screens.sharing.thoughtLeadership12001500Chars')}</div>
            <div><strong>X:</strong> {t('screens.sharing.quickInsights240CharsImage')}</div>
            <div><strong>{t('screens.sharing.instagram')}</strong> {t('screens.sharing.visualStories125CharsCarousel')}</div>
            <div><strong>{t('screens.sharing.email2')}</strong> {t('screens.sharing.deepDives500800Words')}</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>{t('screens.sharing.includes')}</strong>{t('screens.sharing.imageSpecsHashtagStrategyPostingTimes')}
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
          <h4 className="font-semibold text-sm mb-2">{t('screens.sharing.templateCollection')}</h4>
          <div className="text-sm text-muted-foreground space-y-1.5">
            <div><strong>{t('screens.sharing.quoteCards')}</strong> {t('screens.sharing.text6Designs')}</div>
            <div><strong>{t('screens.sharing.statGraphics')}</strong> {t('screens.sharing.text5Layouts')}</div>
            <div><strong>{t('screens.sharing.tipsHowtos')}</strong> {t('screens.sharing.text8Formats')}</div>
            <div><strong>{t('screens.sharing.announcements')}</strong> {t('screens.sharing.text5Styles')}</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>{t('screens.sharing.editable')}</strong>{t('screens.sharing.canvaFigmaDirectlyInapp')}
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
          <h4 className="font-semibold text-sm mb-2">{t('screens.sharing.approvedMessaging')}</h4>
          <div className="text-sm text-muted-foreground space-y-1.5">
            <div><strong>{t('screens.sharing.headlines')}</strong> {t('screens.sharing.text12ProvenFormulas')}</div>
            <div><strong>{t('screens.sharing.ctas')}</strong> {t('screens.sharing.text8HighconvertingPhrases')}</div>
            <div><strong>{t('screens.sharing.intros')}</strong> {t('screens.sharing.text10HookTemplates')}</div>
            <div><strong>{t('screens.sharing.closings')}</strong> {t('screens.sharing.text6SignatureSignoffs')}</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>{t('screens.sharing.usage')}</strong>{t('screens.sharing.copypasteCustomizeForYourNeeds')}
        </div>
      </div>
    )
  }
];

export default withScreenId(function Distribution() {
  const [rulePopupOpen, setRulePopupOpen] = React.useState(false);
  const [templatePopupOpen, setTemplatePopupOpen] = React.useState(false);
  const [guidelinePopupOpen, setGuidelinePopupOpen] = React.useState(false);

  return (
    <AppLayout>
      <SEO
        title={t('screens.sharing.distributionToolingVitana')}
        description="Advanced distribution rules, templates, and analytics"
        canonical={window.location.href}
      />
      <SubNavigation items={sharingNavigation} />

      <div className="p-6 min-h-screen pb-24">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title={t('screens.sharing.distributionTooling')}
            description="Templates, automation rules, and brand guidelines"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder={t('screens.sharing.searchAutomationRulesTemplates')}
            />
            <UniversalCalendarButton />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="default">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('screens.sharing.createAsset')}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setTemplatePopupOpen(true)}>
                  <Palette className="w-4 h-4 mr-2" />
                  <div className="flex flex-col">
                    <span className="font-medium">{t('screens.sharing.campaignTemplate')}</span>
                    <span className="text-xs text-muted-foreground">{t('screens.sharing.prebuiltDistributionPattern')}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRulePopupOpen(true)}>
                  <Zap className="w-4 h-4 mr-2" />
                  <div className="flex flex-col">
                    <span className="font-medium">{t('screens.sharing.automationRule')}</span>
                    <span className="text-xs text-muted-foreground">{t('screens.sharing.ifthenWorkflowLogic')}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setGuidelinePopupOpen(true)}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  <div className="flex flex-col">
                    <span className="font-medium">{t('screens.sharing.brandGuideline')}</span>
                    <span className="text-xs text-muted-foreground">{t('screens.sharing.channelspecificRules')}</span>
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
                {t('screens.sharing.campaignTemplates')}
              </SplitBarTrigger>
              <SplitBarTrigger value="automation">
                <Zap className="w-4 h-4" />
                {t('screens.sharing.automationRules')}
              </SplitBarTrigger>
              <SplitBarTrigger value="brand">
                <Palette className="w-4 h-4" />
                {t('screens.sharing.brandKit')}
              </SplitBarTrigger>
            </SplitBarList>

            {/* Campaign Templates Tab */}
            <SplitBarContent value="templates" className="mt-6">
              <HorizontalCardList
                items={getCampaignTemplateCards()}
                variant="standard"
                layout="stack"
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
                layout="stack"
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
                layout="stack"
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
