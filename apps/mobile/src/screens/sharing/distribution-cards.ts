/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — the Distribution screen's sample cards:
 * campaign templates, automation rules and the brand kit, as the web `Distribution.tsx` lists them
 * (fixed copy, buttons that only log). Card titles, descriptions, metadata and buttons are the new
 * `sharingNative.dist.<id>.*` keys; the detail lines reuse the web's `screens.sharing.*` keys.
 * Generated from the web source once, then maintained here.
 */
export type DistTab = 'templates' | 'automation' | 'brand';

export interface DistCard {
  id: string;
  tab: DistTab;
  icon: string;
  badge?: 'popular' | 'active';
  /** A detail line: [label key | 'X:' | null, text key]; `bulleted` lists render as a bullet list. */
  heading: string;
  bulleted: boolean;
  lines: ReadonlyArray<readonly [string | null, string]>;
  foot: ReadonlyArray<readonly [string, string]>;
}

const ICONS: Record<string, string> = {
  'template-launch': '🚀', 'template-nurture': '✨', 'template-event': '📅', 'template-product': '🎯', 'template-flash': '⚡',
  'rule-schedule': '🕒', 'rule-crosspost': '🔗', 'rule-boost': '📈', 'rule-repost': '🔁', 'rule-targeting': '🎯',
  'brand-voice': '💬', 'brand-assets': '🖼️', 'brand-guidelines': '📖', 'brand-templates': '🎨', 'brand-library': '📄',
};
const BADGES: Record<string, 'popular' | 'active' | undefined> = {
  'template-launch': 'popular', 'rule-schedule': 'active', 'rule-crosspost': 'active', 'rule-repost': 'active', 'rule-targeting': 'active',
};
const tabOf = (id: string): DistTab => (id.startsWith('template') ? 'templates' : id.startsWith('rule') ? 'automation' : 'brand');

const RAW: Array<[string, string, boolean, Array<[string | null, string]>, Array<[string, string]>]> = [
  ['template-launch', 'screens.sharing.campaignPlaybook', true, [[null, 'screens.sharing.week1TeaserPosts3xShortform'], [null, 'screens.sharing.launchDayHeroAnnouncementEmailBlast'], [null, 'screens.sharing.week2SocialProofTestimonialsMicrofaq'], [null, 'screens.sharing.week3LastchanceUrgencyPosts']], [['screens.sharing.channels', 'screens.sharing.linkedinXInstagramEmailBlog'], ['screens.sharing.duration', 'screens.sharing.text3Weeks'], ['screens.sharing.estReach', 'screens.sharing.text50k100kImpressions']]],
  ['template-nurture', 'screens.sharing.educationalSeries', true, [[null, 'screens.sharing.phase1FoundationConceptsWeeks12'], [null, 'screens.sharing.phase2PracticalApplicationsWeeks34'], [null, 'screens.sharing.phase3AdvancedStrategiesWeeks56'], [null, 'screens.sharing.phase4CaseStudiesResultsWeeks']], [['screens.sharing.format', 'screens.sharing.blogPostsEmailDigests'], ['screens.sharing.goal', 'screens.sharing.buildAuthorityTrustOver8Weeks']]],
  ['template-event', 'screens.sharing.countdownTimeline', true, [[null, 'screens.sharing.t14DaysSaveDateAnnouncement'], [null, 'screens.sharing.t7DaysSpeakeragendaReveal'], [null, 'screens.sharing.t3DaysLastChanceReminder'], [null, 'screens.sharing.t1DayFinalCountdownDetails'], [null, 'screens.sharing.eventDayLiveUpdatesEngagement']], [['screens.sharing.bestFor', 'screens.sharing.webinarsLaunchesLiveEvents']]],
  ['template-product', 'screens.sharing.launchSequence', true, [[null, 'screens.sharing.prelaunchWaitlistBuilding2Weeks'], [null, 'screens.sharing.launchWeekDailyFeatureHighlights'], [null, 'screens.sharing.week2CustomerTestimonialsSocialProof'], [null, 'screens.sharing.week3LimitedtimeOfferPush']], [['screens.sharing.channels', 'screens.sharing.allPlatformsPaidAds'], ['screens.sharing.duration', 'screens.sharing.text4WeeksIntensiveCampaign']]],
  ['template-flash', 'screens.sharing.urgencyTactics', true, [[null, 'screens.sharing.hour0FlashAnnouncementAcrossAll'], [null, 'screens.sharing.hour350ClaimedUrgencyUpdate'], [null, 'screens.sharing.hour6Last3HoursCountdown'], [null, 'screens.sharing.finalHourMinutebyminuteUpdates']], [['screens.sharing.bestFor', 'screens.sharing.clearanceLimitedInventoryTimesensitiveOffers']]],
  ['rule-schedule', 'screens.sharing.ruleConfiguration', false, [['screens.sharing.trigger', 'screens.sharing.newPostCreated'], ['screens.sharing.action', 'screens.sharing.scheduleForOptimalTimeBasedAudience'], ['screens.sharing.channels', 'screens.sharing.linkedin9AmX12Pm'], ['screens.sharing.timezone', 'screens.sharing.userSLocalTimezone']], [['screens.sharing.last7Days', 'screens.sharing.text24PostsAutoscheduled'], ['screens.sharing.avgEngagement', 'screens.sharing.text32VsManualPosts']]],
  ['rule-crosspost', 'screens.sharing.distributionSettings', false, [['screens.sharing.trigger', 'screens.sharing.newBlogPostPublished'], ['screens.sharing.action', 'screens.sharing.createTailoredPostsForEachPlatform'], ['screens.sharing.activeChannels', 'screens.sharing.linkedinXInstagramFacebookBlog'], ['screens.sharing.customization', 'screens.sharing.autoadaptFormatPerChannel']], [['screens.sharing.timeSaved', 'screens.sharing.text3HoursPerBlogPost']]],
  ['rule-boost', 'screens.sharing.boostStrategy', false, [['screens.sharing.criteria', 'screens.sharing.postsWithGt100Engagements'], ['screens.sharing.timing', 'screens.sharing.repost7DaysAfterOriginal'], ['screens.sharing.updates', 'screens.sharing.addCaseYouMissedPreface'], ['screens.sharing.frequency', 'screens.sharing.max1RepostPerWeek']], [['screens.sharing.avgBoost', 'screens.sharing.text45AdditionalReachPerRepost']]],
  ['rule-repost', 'screens.sharing.evergreenRotation', false, [['screens.sharing.contentPool', 'screens.sharing.text12EvergreenPostsTagged'], ['screens.sharing.schedule', 'screens.sharing.text1RepostPerMonthRotating'], ['screens.sharing.optimization', 'screens.sharing.bestTimeDayPerPlatform'], ['screens.sharing.updates', 'screens.sharing.minorRefreshesHeadlinesctas']], [['screens.sharing.strategy', 'screens.sharing.keepValuableContentCirculation']]],
  ['rule-targeting', 'screens.sharing.segmentRules', false, [['screens.sharing.segment1', 'screens.sharing.beginnersHowtoGuides'], ['screens.sharing.segment2', 'screens.sharing.intermediateCaseStudies'], ['screens.sharing.segment3', 'screens.sharing.advancedThoughtLeadership'], ['screens.sharing.logic', 'screens.sharing.basedEngagementHistoryProfileData']], [['screens.sharing.result', 'screens.sharing.text28RelevanceScore15Unsubscribes']]],
  ['brand-voice', 'screens.sharing.voiceGuidelines', false, [['screens.sharing.professional', 'screens.sharing.sciencebackedCredibleExpert'], ['screens.sharing.encouraging', 'screens.sharing.positiveSupportiveEmpowering'], ['screens.sharing.accessible', 'screens.sharing.clearJargonfreeRelatable'], ['screens.sharing.authentic', 'screens.sharing.honestTransparentHuman']], [['screens.sharing.example', 'screens.sharing.yourLongevityJourneyStartsWithSmall']]],
  ['brand-assets', 'screens.sharing.assetLibrary', false, [['screens.sharing.logos', 'screens.sharing.text8VariationsColorMonoWordmark'], ['screens.sharing.templates', 'screens.sharing.text12SocialMediaPostDesigns'], ['screens.sharing.images', 'screens.sharing.text20BrandPhotographyAssets'], ['screens.sharing.icons', 'screens.sharing.text8CustomIconSets']], [['screens.sharing.format', 'screens.sharing.svgPngJpgHighresWeboptimized']]],
  ['brand-guidelines', 'screens.sharing.platformSpecs', false, [['screens.sharing.linkedin', 'screens.sharing.thoughtLeadership12001500Chars'], ['X:', 'screens.sharing.quickInsights240CharsImage'], ['screens.sharing.instagram', 'screens.sharing.visualStories125CharsCarousel'], ['screens.sharing.email2', 'screens.sharing.deepDives500800Words']], [['screens.sharing.includes', 'screens.sharing.imageSpecsHashtagStrategyPostingTimes']]],
  ['brand-templates', 'screens.sharing.templateCollection', false, [['screens.sharing.quoteCards', 'screens.sharing.text6Designs'], ['screens.sharing.statGraphics', 'screens.sharing.text5Layouts'], ['screens.sharing.tipsHowtos', 'screens.sharing.text8Formats'], ['screens.sharing.announcements', 'screens.sharing.text5Styles']], [['screens.sharing.editable', 'screens.sharing.canvaFigmaDirectlyInapp']]],
  ['brand-library', 'screens.sharing.approvedMessaging', false, [['screens.sharing.headlines', 'screens.sharing.text12ProvenFormulas'], ['screens.sharing.ctas', 'screens.sharing.text8HighconvertingPhrases'], ['screens.sharing.intros', 'screens.sharing.text10HookTemplates'], ['screens.sharing.closings', 'screens.sharing.text6SignatureSignoffs']], [['screens.sharing.usage', 'screens.sharing.copypasteCustomizeForYourNeeds']]],
];

export const DIST_CARDS: readonly DistCard[] = RAW.map(([id, heading, bulleted, lines, foot]) => ({
  id, tab: tabOf(id), icon: ICONS[id], badge: BADGES[id], heading, bulleted, lines, foot,
}));
