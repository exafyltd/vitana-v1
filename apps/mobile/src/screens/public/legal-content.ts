/**
 * VTID-05451 (native-wave2-public-auth-onboarding-r3/public-legal) — the
 * Privacy Policy and Terms of Use bodies as data: the same sections, order
 * and `screens.legal.*` catalog keys as src/pages/legal/PrivacyPolicy.tsx and
 * src/pages/legal/TermsOfUse.tsx, rendered by `LegalArticle` (legal.tsx).
 * Only keys live here; every string is resolved by the scoped `t`.
 */

/** A run of text: a catalog key (with params), optionally bold or a link to a native path. */
export type Segment = { key: string; params?: Record<string, string>; strong?: boolean; href?: string; mailto?: string };

export type Block =
  | { kind: 'h1'; key: string }
  | { kind: 'h2'; key: string }
  | { kind: 'h3'; key: string }
  | { kind: 'meta'; label: string; value: string }
  | { kind: 'p'; segments: Segment[] }
  | { kind: 'ul' | 'ol'; items: Segment[][] }
  | { kind: 'address'; lines: Segment[][] }
  | { kind: 'footer'; paragraphs: Segment[][] };

const L = (k: string) => `screens.legal.${k}`;
const p = (k: string): Block => ({ kind: 'p', segments: [{ key: L(k) }] });
const h2 = (k: string): Block => ({ kind: 'h2', key: L(k) });
const h3 = (k: string): Block => ({ kind: 'h3', key: L(k) });
/** `<li><strong>{a}</strong> {b}</li>` — or a plain item when only one key is given. */
const li = (a: string, b?: string): Segment[] => (b ? [{ key: L(a), strong: true }, { key: L(b) }] : [{ key: L(a) }]);
const ul = (...items: Segment[][]): Block => ({ kind: 'ul', items });
const ol = (...items: Segment[][]): Block => ({ kind: 'ol', items });

const EMAIL: Segment[] = [{ key: L('email') }, { key: L('supportExafyIo'), mailto: 'support@exafy.io' }];

export const PRIVACY: readonly Block[] = [
  { kind: 'h1', key: L('privacyPolicyForMaxinaMobileApplication') },
  { kind: 'meta', label: L('effectiveDate'), value: L('text6thApril2026') },
  p('thankYouForChoosingUseMaxina'),
  p('byDownloadingAccessingUsingMaxinaMobile'),
  h2('text1Introduction'),
  h3('text11AboutUs'),
  p('exafyLtdIncorporatedAbuDhabiUae'),
  h3('text12Scope'),
  p('thisPrivacyPolicyAppliesAllUsers'),
  h3('text13Compliance'),
  ul(li('gdpr', 'weAdhereEuGeneralDataProtection'), li('uaeRegulations', 'asAbuDhabibasedCompanyWeAlso'), li('appStorePlayStoreRequirements', 'weFollowAppleAppStoreGoogle')),
  h2('text2DataWeCollect'),
  h3('text21AccountInformation'),
  ul(
    li('accountInformation', 'nameEmailAddressPhoneNumberOther'),
    li('profileInformation', 'userProfilePicturesUsernamesOtherDetails'),
    li('contactInformation', 'ifYouCommunicateWithUsWe'),
  ),
  h3('text22UsageData'),
  ul(li('deviceInformation', 'ipAddressDeviceModelOperatingSystem'), li('activityLogs', 'informationAboutHowYouInteractWith')),
  h3('text23LocationDataIfApplicable'),
  p('ifYouPermitUsAccessLocation'),
  h3('text24CookiesSimilarTechnologies'),
  p('weMayUseCookiesSimilarTracking'),
  h2('text3HowWeCollectYourData'),
  p('weCollectPersonalDataFollowingWays'),
  ul(
    li('directlyFromYou', 'whenYouRegisterAccountEnterInformation'),
    li('automatically', 'throughUseCookiesLogDataDevice'),
    li('fromThirdParties', 'weMayReceivePersonalDataFrom'),
  ),
  h2('text4PurposeLegalBasesForProcessing'),
  p('weProcessYourPersonalDataFor'),
  ul(
    li('provideMaintainService', 'weUseYourDataEnableCore'),
    li('improveApp', 'improveAppDescription'),
    li('communicateWithYou', 'communicateWithYouDescription'),
    li('personalizeUserExperience', 'personalizeUserExperienceDescription'),
    li('provideAiFeatures', 'provideAiFeaturesDescription'),
    li('complyLegalObligations', 'complyLegalObligationsDescription'),
  ),
  h2('text5HowWeShareYourData'),
  p('weDoNotSellRentYour'),
  ul(
    li('serviceProvidersPartners', 'helpUsOperateMaintainImproveApp'),
    li('aiServiceProviders', 'powerInappAiAssistantRelatedAi'),
    li('affiliatesSubsidiaries', 'weMayShareDataWithSubsidiaries'),
    li('legalRegulatoryAuthorities', 'weMayDiscloseDataIfRequired'),
    li('businessTransfers', 'eventMergerAcquisitionSaleAssetsPersonal'),
  ),
  h2('text6InternationalDataTransfers'),
  p('givenThatExafyLtdOperatesUae'),
  h2('text7DataRetention'),
  p('weWillOnlyRetainYourPersonal'),
  ul(li('durationYourRelationshipWithUsE'), li('legalRetentionObligations'), li('securityFraudPreventionReasons'), li('legalClaimsDefense')),
  p('retentionAnonymizeDelete'),
  h2('text8DataSecurity'),
  p('weCommittedProtectingYourPersonalData'),
  h2('text9YourRightsUnderGdprIf'),
  p('ifYouLocatedEuropeanUnionYou'),
  ol(
    li('rightAccess', 'youCanRequestAccessPersonalData'),
    li('rightRectification', 'youCanRequestCorrectionIncompleteInaccurate'),
    li('rightErasureRightForgotten', 'youCanRequestDeletionYourData'),
    li('rightRestrictProcessing', 'youCanRequestThatWeLimit'),
    li('rightDataPortability', 'youCanRequestCopyYourPersonal'),
    li('rightObject', 'youCanObjectCertainProcessingActivities'),
    li('rightWithdrawConsent', 'ifWeRelyConsentProcessYour'),
  ),
  p('exerciseAnyTheseRightsPleaseContact'),
  h2('text10ChildrenSPrivacy'),
  p('maxinaMobileNotIntendedForUse'),
  h2('text11ThirdpartyServices'),
  p('maxinaMobileMayContainLinksThirdparty'),
  h2('text12ChangesThisPrivacyPolicy'),
  p('weMayUpdateThisPrivacyPolicy'),
  h2('text13ContactUs'),
  p('ifYouHaveAnyQuestionsConcerns'),
  { kind: 'address', lines: [[{ key: L('exafyLtd'), strong: true }], [{ key: L('alKhatemTower15thFloorAdgm') }], [{ key: L('abuDhabiUnitedArabEmirates') }], EMAIL] },
  p('weWillDoOurBestAddress'),
  {
    kind: 'footer',
    paragraphs: [[{ key: L('lastUpdated'), strong: true }, { key: L('text6thApril2026') }], [{ key: L('byUsingMaxinaMobileApplicationYou') }]],
  },
];

export const TERMS: readonly Block[] = [
  { kind: 'h1', key: L('maxinaAppAmpWebsiteTermsUse') },
  { kind: 'meta', label: L('effectiveDate'), value: L('text6thApril2026') },
  h2('text1Introduction'),
  h3('text11WhoWe'),
  p('theseTermsTermsFormLegallyBinding'),
  h3('text12Acceptance'),
  {
    kind: 'p',
    segments: [
      { key: L('byDownloadingAccessingUsingAnyPart'), params: { value0: ' ' } },
      { key: L('privacyPolicy'), href: '/privacy' },
      { key: L('ifYouDoNotAgreeDo') },
    ],
  },
  h3('text13MinimumAge'),
  p('serviceIntendedForIndividuals16Years'),
  h2('text2Accounts'),
  ul(li('createSingleTruthfulAccountKeepCredentials'), li('weMaySuspendTerminateAccountsFor')),
  // §3 Subscriptions & Billing is removed on the web too (this version of the app has no subscription).
  h2('text4MaxinaExperienceEvents'),
  ul(
    li('eventsOrganisedByIndependentThirdpartyPartners'),
    li('cancellationAmpRefunds100RefundIf'),
    li('participantRequirementsMinimumAge16Under18s'),
    li('liabilityWaiverByAttendingYouAcknowledge'),
  ),
  h2('text5DiscoverShop'),
  ul(li('weListThirdpartyPhysicalDigitalProductsservices'), li('shippingAmpReturnsForPhysicalGoods'), li('titleRiskForGoodsPassYou')),
  h2('text6CommunityAmpUsergeneratedContentUgc'),
  h3('text61Rules'),
  p('ourVideoFeedOtherSocialFeatures'),
  h3('text62Licence'),
  p('youGrantExafyWorldwideNonexclusiveRoyaltyfree'),
  h3('text63Moderation'),
  p('weReserveRightButHaveNo'),
  h2('text7HealthAmpWellnessDisclaimer'),
  p('maxinaProvidesGuidanceCommunitySupportOnly'),
  h2('text8IntellectualProperty'),
  p('serviceAllExafyownedContentProtectedBy'),
  h2('text9ProhibitedConduct'),
  p('youAgreeNot'),
  ul(
    li('violateAnyApplicableLawRegulation'),
    li('infringeIntellectualpropertyPrivacyRights'),
    li('uploadMaliciousCodeAttemptGainUnauthorised'),
    li('harvestDataEngageAutomatedScraping'),
  ),
  h2('text10DisclaimersAmpLimitationLiability'),
  p('serviceProvidedAsisAsavailableWithoutWarranties'),
  p('nothingTheseTermsExcludesLiabilityFor'),
  h2('text11GoverningLawAmpDisputeResolution'),
  ul(li('governingLaw', 'abuDhabiGlobalMarketAdgmLaw'), li('arbitration', 'anyDisputeNotResolvedAmicablyWithin'), li('euConsumers', 'youMayAdditionallySubmitDisputesVia')),
  h2('text12Termination'),
  p('weMaySuspendTerminateYourAccess'),
  h2('text13ChangesTerms'),
  p('weMayUpdateTheseTermsFrom'),
  h2('text14Contact'),
  p('questionsContactUsAt'),
  { kind: 'address', lines: [[{ key: L('exafyLtd'), strong: true }], [{ key: L('alKhatemTower15thFloorAdgm2') }], [{ key: L('abuDhabiUnitedArabEmirates') }], EMAIL] },
  {
    kind: 'footer',
    paragraphs: [
      [
        { key: L('byTappingAcceptCreatingAccountContinuing'), params: { value0: ' ' } },
        { key: L('privacyPolicy'), href: '/privacy' },
        { key: 'publicLegalNative.fullStop' },
      ],
    ],
  },
];

/** Every catalog key a block list renders (tests check each resolves in all 11 locales). */
export function blockKeys(blocks: readonly Block[]): string[] {
  const out: string[] = [];
  const seg = (s: Segment[]) => s.forEach((x) => out.push(x.key));
  for (const b of blocks) {
    if (b.kind === 'h1' || b.kind === 'h2' || b.kind === 'h3') out.push(b.key);
    else if (b.kind === 'meta') out.push(b.label, b.value);
    else if (b.kind === 'p') seg(b.segments);
    else if (b.kind === 'ul' || b.kind === 'ol') b.items.forEach(seg);
    else if (b.kind === 'address') b.lines.forEach(seg);
    else if (b.kind === 'footer') b.paragraphs.forEach(seg);
  }
  return out;
}
