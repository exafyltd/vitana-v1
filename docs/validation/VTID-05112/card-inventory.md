# VTID-05112 — Spotlight 6.1 card inventory

Task 6.1 (approved plan, `docs/plans/desktop-spotlight/plan.md` Phase 6, sparring finding F9): *retire only cards on the
Phase 5 list with zero static and zero dynamic references; split into sub-phases if > 20.*

Measured on base `a3fa315`. 150 card-like components: every non-test `src/components/**/*Card*.tsx` (145) plus every
`*card*` module a Phase-5 list page imports (the shadcn `ui/card.tsx`, `ui/*card-list*`, `ui/standard-horizontal-card.tsx`,
`spotlight/tier-b/cardButtonProps.ts`).

**Result: 6 components have zero static and zero dynamic references and are retired. 144 stay.** 6 ≤ 20, so there is no
6.1b sub-phase. No retired component had a test file; no test file was changed.

## Method

- **Static references** — `import … from` / `export … from` / side-effect `import '…'` in non-test files under `src/`, `scripts/`,
  `public/` and the root config files, resolved (`@/` alias and relative paths, `.tsx/.ts/.jsx/.js/index.*`) to the
  component's own file. A barrel re-export counts as a reference.
- **Dynamic references** — `import('…')` / `lazy(() => import('…'))` / `require('…')` resolved to the file, plus every
  word-boundary occurrence of the file name **or any exported identifier of ≥ 6 characters** as a plain string in any
  scanned file that does not already import it (registries such as `card-registry.tsx`, JSON configs, route tables,
  `screen-manifest.json`, the navigation registry). Not counted: `scripts/ci/pr-gate/baseline/*.json` (the lint
  ratchet's per-path counts, removed for retired files) and the i18n catalogues (`src/i18n/**`, prose keys only).
  Mentions in `docs/` are history, not use.
- **Tests** — test, spec, story, `__tests__`, `__regression__`, `tests/` and `e2e` files are listed separately and
  never counted as use.
- **On Phase-5 list?** — `yes` names the Phase-5 list page(s) that import the module directly (Health, settings/{Limitations,
  Support, SettingsNotifications, TenantRole, Billing}, sharing/{CampaignDetail, DataConsent, Campaigns},
  health/{EducationResources, MyBiology, ConditionsRisks, PillarsOfHealth, WellnessServices}, wallet/Subscriptions).
  Phase 5's PR body did not enumerate card components; the plan defines the list as *every card component still not on
  VCard*, and no retired file renders through VCard, so each retired file is on that list by definition (see Decisions).
- Re-running the inventory after the deletions finds **0** further zero-reference cards (no retired file was the only
  referrer of another card).

## Retired

| Component | Path | Static | Dynamic | Why it was dead |
|---|---|---|---|---|
| EventCard | `src/components/templates/EventCard.tsx` | 0 | 0 | no importer at base |
| StatCard | `src/components/templates/StatCard.tsx` | 0 | 0 | `admin/marketplace/Overview.tsx` defines its own local `function StatCard`, `dev/AnalyticsView.tsx` an `interface StatCard` — same name, unrelated identifiers, neither imports this file |
| WalletRewardCard | `src/components/wallet/WalletRewardCard.tsx` | 0 | 0 | no importer left |
| CommissionForecastingCard | `src/components/wallet/intelligence/CommissionForecastingCard.tsx` | 0 | 0 | mock child card; VTID-05037 recorded it as imported by `EarningOptimizationSplitScreen`, which no longer imports it at base |
| EarningStreaksAnalyticsCard | `src/components/wallet/intelligence/EarningStreaksAnalyticsCard.tsx` | 0 | 0 | same |
| SocialEarningIntelligenceCard | `src/components/wallet/intelligence/SocialEarningIntelligenceCard.tsx` | 0 | 0 | same |

Their per-file entries were removed from `scripts/ci/pr-gate/baseline/{design,eslint}.json` (nothing else in either
baseline changed).

## Verification

- `npx tsc --noEmit -p tsconfig.app.json`: 176 errors at base, 176 after (no increase).
- `npx vitest run`: 418 files / 3259 tests passed.
- `npm run build`: green. Compared with a build of base `a3fa315` (asset names and import specifiers normalised for
  content hashes), all 629 chunks are identical except `index.css`, which is 442 bytes smaller — Tailwind utilities that
  only the retired files used. Every JavaScript chunk is byte-identical, so no screen, mobile or desktop, can render
  differently ("mobile screenshots unchanged" holds by construction).

## Full inventory

| Component | Path | Static refs | Dynamic refs | Test refs (not use) | On Phase-5 list? | Decision |
|---|---|---|---|---|---|---|
| LabTestCard | `src/components/LabTestCard.tsx` | 1 | 1 | 0 | no | keep (referenced) |
| AdminStatsCard | `src/components/admin/AdminStatsCard.tsx` | 26 | 0 | 0 | no | keep (referenced) |
| CommercePartnerCard | `src/components/business/CommercePartnerCard.tsx` | 3 | 0 | 2 | no | keep (referenced) |
| MissionOpportunitiesCard | `src/components/business/MissionOpportunitiesCard.tsx` | 2 | 0 | 1 | no | keep (referenced) |
| PackageCard | `src/components/business/PackageCard.tsx` | 2 | 0 | 0 | no | keep (referenced) |
| VaeaDetectionsCard | `src/components/business/vaea/VaeaDetectionsCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| GoogleSyncCard | `src/components/calendar/vcal/GoogleSyncCard.tsx` | 1 | 0 | 2 | no | keep (referenced) |
| GuideCard | `src/components/calendar/vcal/GuideCard.tsx` | 1 | 0 | 2 | no | keep (referenced) |
| UnifiedCaptureCard | `src/components/capture/UnifiedCaptureCard.tsx` | 1 | 1 | 2 | no | keep (referenced) |
| AgentConnectCard | `src/components/commerce/AgentConnectCard.tsx` | 1 | 0 | 3 | no | keep (referenced) |
| ConnectionCard | `src/components/commerce/ConnectionCard.tsx` | 1 | 2 | 2 | no | keep (referenced) |
| MyOrgCard | `src/components/commerce/MyOrgCard.tsx` | 13 | 2 | 0 | no | keep (referenced) |
| MobileEntryCard | `src/components/community/MobileEntryCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| ShortPreviewCard | `src/components/community/ShortPreviewCard.tsx` | 1 | 0 | 1 | no | keep (referenced) |
| WhyThisMatchCard | `src/components/community/WhyThisMatchCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| SocialVCard | `src/components/community/spotlight/SocialVCard.tsx` | 5 | 0 | 0 | no | keep (referenced) |
| ContactConsentCard | `src/components/contacts/ContactConsentCard.tsx` | 1 | 0 | 1 | no | keep (referenced) |
| CrossoverCard | `src/components/crossover/CrossoverCard.tsx` | 6 | 0 | 1 | no | keep (referenced) |
| LifestylePlanCard | `src/components/crossover/LifestylePlanCard.tsx` | 2 | 0 | 0 | no | keep (referenced) |
| MotivationCard | `src/components/crossover/MotivationCard.tsx` | 2 | 0 | 0 | no | keep (referenced) |
| NewsArticleCard | `src/components/crossover/NewsArticleCard.tsx` | 2 | 1 | 2 | no | keep (referenced) |
| NewsArticleCardMenu | `src/components/crossover/NewsArticleCardMenu.tsx` | 2 | 0 | 1 | no | keep (referenced) |
| NewsCard | `src/components/crossover/NewsCard.tsx` | 10 | 3 | 2 | yes (Health.tsx) | keep (referenced) |
| PodcastCard | `src/components/crossover/PodcastCard.tsx` | 1 | 0 | 1 | no | keep (referenced) |
| ProgressStreaksCard | `src/components/crossover/ProgressStreaksCard.tsx` | 4 | 0 | 0 | no | keep (referenced) |
| SmartCalendarCard | `src/components/crossover/SmartCalendarCard.tsx` | 4 | 0 | 0 | no | keep (referenced) |
| TaskCard | `src/components/dev/TaskCard.tsx` | 3 | 0 | 0 | no | keep (referenced) |
| PhotoEntryCard | `src/components/diary/PhotoEntryCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| MarketplaceProductCard | `src/components/discover/MarketplaceProductCard.tsx` | 1 | 0 | 1 | no | keep (referenced) |
| PremiumProductCard | `src/components/discover/PremiumProductCard.tsx` | 3 | 2 | 0 | no | keep (referenced) |
| VisitHistoryCard | `src/components/discover/VisitHistoryCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| DiscoverCards | `src/components/discover/spotlight/DiscoverCards.tsx` | 5 | 0 | 0 | no | keep (referenced) |
| AddBioCard | `src/components/enrichment/AddBioCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| AddInterestsCard | `src/components/enrichment/AddInterestsCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| CompleteProfileCard | `src/components/enrichment/CompleteProfileCard.tsx` | 1 | 0 | 1 | no | keep (referenced) |
| ConnectCalendarCard | `src/components/enrichment/ConnectCalendarCard.tsx` | 1 | 2 | 2 | no | keep (referenced) |
| ConnectFacebookCard | `src/components/enrichment/ConnectFacebookCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| ConnectInstagramCard | `src/components/enrichment/ConnectInstagramCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| EnableNotificationsCard | `src/components/enrichment/EnableNotificationsCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| FirstPostCard | `src/components/enrichment/FirstPostCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| ImportContactsCard | `src/components/enrichment/ImportContactsCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| SetLocationCard | `src/components/enrichment/SetLocationCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| StreakAtRiskCard | `src/components/enrichment/StreakAtRiskCard.tsx` | 1 | 0 | 1 | no | keep (referenced) |
| UnreadMatchesCard | `src/components/enrichment/UnreadMatchesCard.tsx` | 1 | 0 | 1 | no | keep (referenced) |
| UploadCoverCard | `src/components/enrichment/UploadCoverCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| UploadPhotoCard | `src/components/enrichment/UploadPhotoCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| EventCardSkeleton | `src/components/events/EventCardSkeleton.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| AutopilotCard | `src/components/feature/AutopilotCard.tsx` | 1 | 2 | 0 | no | keep (referenced) |
| CalendarCard | `src/components/feature/CalendarCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| DailyDiaryCard | `src/components/feature/DailyDiaryCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| DiscoverCard | `src/components/feature/DiscoverCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| FindAMatchCard | `src/components/feature/FindAMatchCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| TalkToVitanaCard | `src/components/feature/TalkToVitanaCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| UploadMediaCard | `src/components/feature/UploadMediaCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| EventAttachmentCard | `src/components/feed/EventAttachmentCard.tsx` | 1 | 0 | 2 | no | keep (referenced) |
| MissionAlignmentCard | `src/components/health/MissionAlignmentCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| MotivationalDataCard | `src/components/health/MotivationalDataCard.tsx` | 1 | 0 | 0 | yes (Health.tsx) | keep (referenced) |
| NextBestActionCard | `src/components/health/NextBestActionCard.tsx` | 1 | 0 | 0 | yes (Health.tsx) | keep (referenced) |
| PersonalizedPlanCard | `src/components/health/PersonalizedPlanCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| VitanaIndexTrajectoryCard | `src/components/health/VitanaIndexTrajectoryCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| ExerciseOverviewCard | `src/components/health/exercise/ExerciseOverviewCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| WorkoutCard | `src/components/health/exercise/WorkoutCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| DailyHydrationCard | `src/components/health/hydration/DailyHydrationCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| HydrationOverviewCard | `src/components/health/hydration/HydrationOverviewCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| DailyMentalCard | `src/components/health/mental/DailyMentalCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| MentalOverviewCard | `src/components/health/mental/MentalOverviewCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| NutritionOverviewCard | `src/components/health/nutrition/NutritionOverviewCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| RecipeCard | `src/components/health/nutrition/RecipeCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| DailySleepCard | `src/components/health/sleep/DailySleepCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| SleepOverviewCard | `src/components/health/sleep/SleepOverviewCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| CommunityPostCard | `src/components/home/CommunityPostCard.tsx` | 3 | 5 | 3 | no | keep (referenced) |
| FeatureAnnouncementCard | `src/components/home/FeatureAnnouncementCard.tsx` | 1 | 2 | 2 | no | keep (referenced) |
| InviteFriendCard | `src/components/home/InviteFriendCard.tsx` | 2 | 1 | 2 | no | keep (referenced) |
| LongevityJourneyCard | `src/components/home/LongevityJourneyCard.tsx` | 2 | 1 | 3 | no | keep (referenced) |
| MusicListCard | `src/components/home/MusicListCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| NewMemberCard | `src/components/home/NewMemberCard.tsx` | 2 | 2 | 3 | no | keep (referenced) |
| NewsFeedItemCard | `src/components/home/NewsFeedItemCard.tsx` | 1 | 4 | 2 | no | keep (referenced) |
| PodcastListCard | `src/components/home/PodcastListCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| VitanaIndexCard | `src/components/home/VitanaIndexCard.tsx` | 2 | 1 | 3 | no | keep (referenced) |
| FocusStageCard | `src/components/home/desktop/FocusStageCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| FindPartnerMatchCard | `src/components/intents/FindPartnerMatchCard.tsx` | 1 | 1 | 0 | no | keep (referenced) |
| IntentCard | `src/components/intents/IntentCard.tsx` | 6 | 2 | 0 | no | keep (referenced) |
| IntentMatchCard | `src/components/intents/IntentMatchCard.tsx` | 2 | 1 | 0 | no | keep (referenced) |
| AutopilotCard | `src/components/journey/AutopilotCard.tsx` | 1 | 2 | 0 | no | keep (referenced) |
| TodaysGoalCard | `src/components/journey/TodaysGoalCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| LiveRoomCard | `src/components/liverooms/LiveRoomCard.tsx` | 8 | 2 | 7 | no | keep (referenced) |
| LiveRoomEventCard | `src/components/liverooms/LiveRoomEventCard.tsx` | 1 | 0 | 3 | no | keep (referenced) |
| PastRoomCard | `src/components/liverooms/PastRoomCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| MemoryCategoryCard | `src/components/memory/MemoryCategoryCard.tsx` | 1 | 0 | 1 | no | keep (referenced) |
| CalendarInviteCard | `src/components/messages/CalendarInviteCard.tsx` | 1 | 2 | 3 | no | keep (referenced) |
| MobileConversationCard | `src/components/messages/mobile/MobileConversationCard.tsx` | 1 | 0 | 1 | no | keep (referenced) |
| TurnOnNotificationsCard | `src/components/notifications/TurnOnNotificationsCard.tsx` | 1 | 1 | 1 | no | keep (referenced) |
| VitanaIdOnboardingCard | `src/components/onboarding/VitanaIdOnboardingCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| PartnerLinkRequestsCard | `src/components/patient/PartnerLinkRequestsCard.tsx` | 1 | 0 | 1 | no | keep (referenced) |
| DidYouKnowCard | `src/components/proactive/DidYouKnowCard.tsx` | 2 | 2 | 2 | no | keep (referenced) |
| DesktopAccountCard | `src/components/profile/desktop/DesktopAccountCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| DesktopBusinessCard | `src/components/profile/desktop/DesktopBusinessCard.tsx` | 1 | 3 | 0 | no | keep (referenced) |
| DesktopIdCardSwitcher | `src/components/profile/desktop/DesktopIdCardSwitcher.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| ProfileProgressCard | `src/components/profile/editor/ProfileProgressCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| SharedConnectionsCard | `src/components/profile/insight/SharedConnectionsCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| MobileAccountCard | `src/components/profile/mobile/MobileAccountCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| MobileBusinessCard | `src/components/profile/mobile/MobileBusinessCard.tsx` | 1 | 3 | 0 | no | keep (referenced) |
| MobileIdCardBack | `src/components/profile/mobile/MobileIdCardBack.tsx` | 1 | 1 | 1 | no | keep (referenced) |
| MobileIdCardSwitcher | `src/components/profile/mobile/MobileIdCardSwitcher.tsx` | 2 | 0 | 0 | no | keep (referenced) |
| MobileIdentityCard | `src/components/profile/mobile/MobileIdentityCard.tsx` | 1 | 4 | 1 | no | keep (referenced) |
| BusinessPublicCard | `src/components/profile/shared/BusinessPublicCard.tsx` | 2 | 0 | 0 | no | keep (referenced) |
| CoachingSpecialtyCard | `src/components/profile/shared/CoachingSpecialtyCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| ProfileIdCardBack | `src/components/profile/shared/ProfileIdCardBack.tsx` | 3 | 1 | 0 | no | keep (referenced) |
| ProfileIdCardFront | `src/components/profile/shared/ProfileIdCardFront.tsx` | 3 | 1 | 0 | no | keep (referenced) |
| MobileInventoryCard | `src/components/reseller/MobileInventoryCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| PhoneNumberCard | `src/components/settings/PhoneNumberCard.tsx` | 2 | 0 | 2 | no | keep (referenced) |
| CampaignCard | `src/components/sharing/CampaignCard.tsx` | 1 | 0 | 0 | yes (sharing/Campaigns.tsx) | keep (referenced) |
| ShareableEventCard | `src/components/sharing/ShareableEventCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| VitanaIndexHeroCard | `src/components/spotlight/tier-b/VitanaIndexHeroCard.tsx` | 2 | 0 | 1 | yes (Health.tsx) | keep (referenced) |
| cardButtonProps.ts | `src/components/spotlight/tier-b/cardButtonProps.ts` | 2 | 0 | 0 | yes (health/MyBiology.tsx, health/WellnessServices.tsx) | keep (referenced) |
| RedeemCodeCard | `src/components/subscription/RedeemCodeCard.tsx` | 2 | 0 | 0 | yes (wallet/Subscriptions.tsx) | keep (referenced) |
| SubscriptionStateCard | `src/components/subscription/SubscriptionStateCard.tsx` | 4 | 0 | 0 | yes (settings/Billing.tsx, wallet/Subscriptions.tsx) | keep (referenced) |
| SupplementCard | `src/components/supplements/SupplementCard.tsx` | 2 | 0 | 0 | yes (health/MyBiology.tsx) | keep (referenced) |
| EventCard | `src/components/templates/EventCard.tsx` | 0 | 0 | 0 | no | **retired** (6.1) |
| OfferCard | `src/components/templates/OfferCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| RecommendationCard | `src/components/templates/RecommendationCard.tsx` | 1 | 2 | 0 | no | keep (referenced) |
| StandardCard | `src/components/templates/StandardCard.tsx` | 4 | 0 | 0 | no | keep (referenced) |
| StatCard | `src/components/templates/StatCard.tsx` | 0 | 0 (+2 unrelated same-name local identifiers) | 0 | no | **retired** (6.1) |
| card | `src/components/ui/card.tsx` | 396 | 388 | 123 | yes (Health.tsx, health/ConditionsRisks.tsx, health/EducationResources.tsx, health/MyBiology.tsx, health/PillarsOfHealth.tsx, health/WellnessServices.tsx, settings/Billing.tsx, settings/Limitations.tsx, settings/SettingsNotifications.tsx, settings/Support.tsx, settings/TenantRole.tsx, sharing/CampaignDetail.tsx, sharing/Campaigns.tsx, sharing/DataConsent.tsx, wallet/Subscriptions.tsx) | keep (referenced) |
| horizontal-card-list | `src/components/ui/horizontal-card-list.tsx` | 9 | 0 | 1 | yes (health/MyBiology.tsx) | keep (referenced) |
| stacked-card-list | `src/components/ui/stacked-card-list.tsx` | 1 | 0 | 0 | yes (Health.tsx) | keep (referenced) |
| standard-horizontal-card | `src/components/ui/standard-horizontal-card.tsx` | 13 | 0 | 0 | yes (health/MyBiology.tsx) | keep (referenced) |
| VCard | `src/components/ui/vcard/VCard.tsx` | 3 | 51 | 12 | no | keep (referenced) |
| VCardSkeleton | `src/components/ui/vcard/VCardSkeleton.tsx` | 1 | 16 | 1 | no | keep (referenced) |
| AgentProposalCard | `src/components/universal-cart/AgentProposalCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| EnrichmentCardStrip | `src/components/vitana/EnrichmentCardStrip.tsx` | 8 | 1 | 3 | no | keep (referenced) |
| VitanaActionCard | `src/components/vitana/VitanaActionCard.tsx` | 21 | 0 | 0 | no | keep (referenced) |
| VitanaCardActionButton | `src/components/vitana/VitanaCardActionButton.tsx` | 6 | 0 | 2 | no | keep (referenced) |
| VitanaChatCard | `src/components/vitana/VitanaChatCard.tsx` | 1 | 1 | 1 | no | keep (referenced) |
| VitanaRecommendationCard | `src/components/vitana/VitanaRecommendationCard.tsx` | 6 | 1 | 0 | no | keep (referenced) |
| GatewayWalletBalanceCard | `src/components/wallet/GatewayWalletBalanceCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| WalletBalanceCard | `src/components/wallet/WalletBalanceCard.tsx` | 2 | 1 | 1 | no | keep (referenced) |
| WalletRewardCard | `src/components/wallet/WalletRewardCard.tsx` | 0 | 0 | 0 | no | **retired** (6.1) |
| WalletTransactionCard | `src/components/wallet/WalletTransactionCard.tsx` | 2 | 0 | 1 | no | keep (referenced) |
| CommissionForecastingCard | `src/components/wallet/intelligence/CommissionForecastingCard.tsx` | 0 | 0 | 0 | no | **retired** (6.1) |
| CreditEarningPredictionCard | `src/components/wallet/intelligence/CreditEarningPredictionCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| DynamicRewardOpportunityCard | `src/components/wallet/intelligence/DynamicRewardOpportunityCard.tsx` | 2 | 0 | 1 | no | keep (referenced) |
| EarningStreaksAnalyticsCard | `src/components/wallet/intelligence/EarningStreaksAnalyticsCard.tsx` | 0 | 0 | 0 | no | **retired** (6.1) |
| IntelligentSpendingCard | `src/components/wallet/intelligence/IntelligentSpendingCard.tsx` | 2 | 0 | 1 | no | keep (referenced) |
| MembershipROIAnalyticsCard | `src/components/wallet/intelligence/MembershipROIAnalyticsCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| PredictiveActionsCard | `src/components/wallet/intelligence/PredictiveActionsCard.tsx` | 1 | 0 | 1 | no | keep (referenced) |
| SmartEarningsForecastCard | `src/components/wallet/intelligence/SmartEarningsForecastCard.tsx` | 2 | 0 | 1 | no | keep (referenced) |
| SocialEarningIntelligenceCard | `src/components/wallet/intelligence/SocialEarningIntelligenceCard.tsx` | 0 | 0 | 0 | no | **retired** (6.1) |
| TokenMarketIntelligenceCard | `src/components/wallet/intelligence/TokenMarketIntelligenceCard.tsx` | 1 | 0 | 0 | no | keep (referenced) |
| MobileWalletBalanceCard | `src/components/wallet/mobile/MobileWalletBalanceCard.tsx` | 1 | 1 | 1 | no | keep (referenced) |
