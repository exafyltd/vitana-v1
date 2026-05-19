import { ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import { LegalLocaleToggle } from "@/components/LegalLocaleToggle";
import { useScopedT, type LegalLang } from "@/lib/use-scoped-t";

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlLang = searchParams.get("lang");
  const lang: LegalLang | null =
    urlLang === "de" || urlLang === "en" ? urlLang : null;
  const t = useScopedT(lang);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={t('screens.legal.privacyPolicyMaxinaMobileApplication')}
        description="Privacy Policy for the Maxina Mobile Application by Exafy LTD. Learn how we collect, use, and protect your personal data."
        canonical="https://vitanaland.com/privacy"
      />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label={t('screens.legal.goBack')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">{t('screens.legal.privacyPolicy')}</h1>
          <div className="ml-auto">
            <LegalLocaleToggle />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {t('screens.legal.privacyPolicyForMaxinaMobileApplication')}
          </h1>
          <p className="text-muted-foreground mb-8">
            <strong>{t('screens.legal.effectiveDate')}</strong>{t('screens.legal.text6thApril2026')}
          </p>

          <p className="text-foreground/90 leading-relaxed">{t('screens.legal.thankYouForChoosingUseMaxina')}
          </p>

          <p className="text-foreground/90 leading-relaxed">{t('screens.legal.byDownloadingAccessingUsingMaxinaMobile')}
          </p>

          {/* Section 1 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text1Introduction')}
          </h2>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{t('screens.legal.text11AboutUs')}</h3>
          <p className="text-foreground/90 leading-relaxed">{t('screens.legal.exafyLtdIncorporatedAbuDhabiUae')}
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{t('screens.legal.text12Scope')}</h3>
          <p className="text-foreground/90 leading-relaxed">{t('screens.legal.thisPrivacyPolicyAppliesAllUsers')}
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{t('screens.legal.text13Compliance')}</h3>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li><strong>{t('screens.legal.gdpr')}</strong> {t('screens.legal.weAdhereEuGeneralDataProtection')}</li>
            <li><strong>{t('screens.legal.uaeRegulations')}</strong> {t('screens.legal.asAbuDhabibasedCompanyWeAlso')}</li>
            <li><strong>{t('screens.legal.appStorePlayStoreRequirements')}</strong> {t('screens.legal.weFollowAppleAppStoreGoogle')}</li>
          </ul>

          {/* Section 2 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text2DataWeCollect')}
          </h2>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{t('screens.legal.text21AccountInformation')}</h3>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li><strong>{t('screens.legal.accountInformation')}</strong> {t('screens.legal.nameEmailAddressPhoneNumberOther')}</li>
            <li><strong>{t('screens.legal.profileInformation')}</strong> {t('screens.legal.userProfilePicturesUsernamesOtherDetails')}</li>
            <li><strong>{t('screens.legal.contactInformation')}</strong> {t('screens.legal.ifYouCommunicateWithUsWe')}</li>
          </ul>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{t('screens.legal.text22UsageData')}</h3>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li><strong>{t('screens.legal.deviceInformation')}</strong> {t('screens.legal.ipAddressDeviceModelOperatingSystem')}</li>
            <li><strong>{t('screens.legal.activityLogs')}</strong> {t('screens.legal.informationAboutHowYouInteractWith')}</li>
          </ul>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{t('screens.legal.text23LocationDataIfApplicable')}</h3>
          <p className="text-foreground/90 leading-relaxed">{t('screens.legal.ifYouPermitUsAccessLocation')}
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{t('screens.legal.text24CookiesSimilarTechnologies')}</h3>
          <p className="text-foreground/90 leading-relaxed">{t('screens.legal.weMayUseCookiesSimilarTracking')}
          </p>

          {/* Section 3 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text3HowWeCollectYourData')}
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            {t('screens.legal.weCollectPersonalDataFollowingWays')}
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li><strong>{t('screens.legal.directlyFromYou')}</strong> {t('screens.legal.whenYouRegisterAccountEnterInformation')}</li>
            <li><strong>{t('screens.legal.automatically')}</strong> {t('screens.legal.throughUseCookiesLogDataDevice')}</li>
            <li><strong>{t('screens.legal.fromThirdParties')}</strong> {t('screens.legal.weMayReceivePersonalDataFrom')}</li>
          </ul>

          {/* Section 4 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text4PurposeLegalBasesForProcessing')}
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            {t('screens.legal.weProcessYourPersonalDataFor')}
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li><strong>{t('screens.legal.provideMaintainService')}</strong> {t('screens.legal.weUseYourDataEnableCore')}</li>
          </ul>

          {/* Section 5 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text5HowWeShareYourData')}
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            {t('screens.legal.weDoNotSellRentYour')}
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li><strong>{t('screens.legal.serviceProvidersPartners')}</strong> {t('screens.legal.helpUsOperateMaintainImproveApp')}</li>
            <li><strong>{t('screens.legal.aiServiceProviders')}</strong> {t('screens.legal.powerInappAiAssistantRelatedAi')}</li>
            <li><strong>{t('screens.legal.affiliatesSubsidiaries')}</strong> {t('screens.legal.weMayShareDataWithSubsidiaries')}</li>
            <li><strong>{t('screens.legal.legalRegulatoryAuthorities')}</strong> {t('screens.legal.weMayDiscloseDataIfRequired')}</li>
            <li><strong>{t('screens.legal.businessTransfers')}</strong> {t('screens.legal.eventMergerAcquisitionSaleAssetsPersonal')}</li>
          </ul>

          {/* Section 6 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text6InternationalDataTransfers')}
          </h2>
          <p className="text-foreground/90 leading-relaxed">{t('screens.legal.givenThatExafyLtdOperatesUae')}
          </p>

          {/* Section 7 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text7DataRetention')}
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">{t('screens.legal.weWillOnlyRetainYourPersonal')}
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li>{t('screens.legal.durationYourRelationshipWithUsE')}</li>
          </ul>

          {/* Section 8 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text8DataSecurity')}
          </h2>
          <p className="text-foreground/90 leading-relaxed">{t('screens.legal.weCommittedProtectingYourPersonalData')}
          </p>

          {/* Section 9 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text9YourRightsUnderGdprIf')}
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            {t('screens.legal.ifYouLocatedEuropeanUnionYou')}
          </p>
          <ol className="list-decimal pl-6 space-y-2 text-foreground/90">
            <li><strong>{t('screens.legal.rightAccess')}</strong> {t('screens.legal.youCanRequestAccessPersonalData')}</li>
            <li><strong>{t('screens.legal.rightRectification')}</strong> {t('screens.legal.youCanRequestCorrectionIncompleteInaccurate')}</li>
            <li><strong>{t('screens.legal.rightErasureRightForgotten')}</strong> {t('screens.legal.youCanRequestDeletionYourData')}</li>
            <li><strong>{t('screens.legal.rightRestrictProcessing')}</strong> {t('screens.legal.youCanRequestThatWeLimit')}</li>
            <li><strong>{t('screens.legal.rightDataPortability')}</strong> {t('screens.legal.youCanRequestCopyYourPersonal')}</li>
            <li><strong>{t('screens.legal.rightObject')}</strong> {t('screens.legal.youCanObjectCertainProcessingActivities')}</li>
            <li><strong>{t('screens.legal.rightWithdrawConsent')}</strong> {t('screens.legal.ifWeRelyConsentProcessYour')}</li>
          </ol>
          <p className="text-foreground/90 leading-relaxed mt-4">{t('screens.legal.exerciseAnyTheseRightsPleaseContact')}
          </p>

          {/* Section 10 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text10ChildrenSPrivacy')}
          </h2>
          <p className="text-foreground/90 leading-relaxed">{t('screens.legal.maxinaMobileNotIntendedForUse')}
          </p>

          {/* Section 11 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text11ThirdpartyServices')}
          </h2>
          <p className="text-foreground/90 leading-relaxed">{t('screens.legal.maxinaMobileMayContainLinksThirdparty')}
          </p>

          {/* Section 12 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text12ChangesThisPrivacyPolicy')}
          </h2>
          <p className="text-foreground/90 leading-relaxed">{t('screens.legal.weMayUpdateThisPrivacyPolicy')}
          </p>

          {/* Section 13 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text13ContactUs')}
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">{t('screens.legal.ifYouHaveAnyQuestionsConcerns')}
          </p>
          <address className="not-italic text-foreground/90 leading-relaxed mb-4">
            <strong>{t('screens.legal.exafyLtd')}</strong><br />
            {t('screens.legal.alKhatemTower15thFloorAdgm')}<br />
            {t('screens.legal.abuDhabiUnitedArabEmirates')}<br />
            <br />{t('screens.legal.email')} <a href="mailto:support@exafy.io" className="text-primary hover:underline">{t('screens.legal.supportExafyIo')}</a>
          </address>
          <p className="text-foreground/90 leading-relaxed">
            {t('screens.legal.weWillDoOurBestAddress')}
          </p>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              <strong>{t('screens.legal.lastUpdated')}</strong>{t('screens.legal.text6thApril2026')}
            </p>
            <p className="text-sm text-muted-foreground mt-4">{t('screens.legal.byUsingMaxinaMobileApplicationYou')}
            </p>
          </div>
        </article>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
