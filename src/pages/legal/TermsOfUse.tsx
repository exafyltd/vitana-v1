import { ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { t } from '@/lib/i18n-toast';

const TermsOfUse = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={t('screens.legal.termsUseMaxina')}
        description="Terms of Use for the Maxina App & Website by Exafy LTD. Read our terms covering subscriptions, events, community guidelines, and more."
        canonical="https://vitanaland.com/terms"
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
          <h1 className="text-lg font-semibold">{t('screens.legal.termsUse')}</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {t('screens.legal.maxinaAppAmpWebsiteTermsUse')}
          </h1>
          <p className="text-muted-foreground mb-8">
            <strong>{t('screens.legal.effectiveDate')}</strong>{t('screens.legal.text17May2025ReplacesAllPrior')}
          </p>

          {/* Section 1 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text1Introduction')}
          </h2>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{t('screens.legal.text11WhoWe')}</h3>
          <p className="text-foreground/90 leading-relaxed">{t('screens.legal.theseTermsTermsFormLegallyBinding')}
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{t('screens.legal.text12Acceptance')}</h3>
          <p className="text-foreground/90 leading-relaxed">{t('screens.legal.byDownloadingAccessingUsingAnyPart', { value0: " " })}<Link to="/privacy" className="text-primary hover:underline">{t('screens.legal.privacyPolicy')}</Link>{t('screens.legal.ifYouDoNotAgreeDo')}
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{t('screens.legal.text13MinimumAge')}</h3>
          <p className="text-foreground/90 leading-relaxed">
            {t('screens.legal.serviceIntendedForIndividuals16Years')}
          </p>

          {/* Section 2 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text2Accounts')}
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li>{t('screens.legal.createSingleTruthfulAccountKeepCredentials')}</li>
            <li>{t('screens.legal.weMaySuspendTerminateAccountsFor')}</li>
          </ul>

          {/* Section 3 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text3SubscriptionsAmpBilling')}
          </h2>

          <div className="overflow-x-auto my-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('screens.legal.plan')}</TableHead>
                  <TableHead>{t('screens.legal.price')}</TableHead>
                  <TableHead>{t('screens.legal.cycle')}</TableHead>
                  <TableHead>{t('screens.legal.trial')}</TableHead>
                  <TableHead>{t('screens.legal.autorenew')}</TableHead>
                  <TableHead>{t('screens.legal.gracePeriod')}</TableHead>
                  <TableHead>{t('screens.legal.refundWindow')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">{t('screens.legal.premium')}</TableCell>
                  <TableCell>€9.90</TableCell>
                  <TableCell>{t('screens.legal.monthly')}</TableCell>
                  <TableCell>{t('screens.legal.text7Days')}</TableCell>
                  <TableCell>{t('screens.legal.every30Days')}</TableCell>
                  <TableCell>{t('screens.legal.text5Days')}</TableCell>
                  <TableCell>{t('screens.legal.text14Days')}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">{t('screens.legal.premium')}</TableCell>
                  <TableCell>€99</TableCell>
                  <TableCell>{t('screens.legal.annual')}</TableCell>
                  <TableCell>{t('screens.legal.text7Days')}</TableCell>
                  <TableCell>{t('screens.legal.every12Months')}</TableCell>
                  <TableCell>{t('screens.legal.text5Days')}</TableCell>
                  <TableCell>{t('screens.legal.text14Days')}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">{t('screens.legal.vip')}</TableCell>
                  <TableCell>€299</TableCell>
                  <TableCell>{t('screens.legal.monthly')}</TableCell>
                  <TableCell>{t('screens.legal.text7Days')}</TableCell>
                  <TableCell>{t('screens.legal.every30Days')}</TableCell>
                  <TableCell>{t('screens.legal.text5Days')}</TableCell>
                  <TableCell>{t('screens.legal.text14Days')}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">{t('screens.legal.vip')}</TableCell>
                  <TableCell>€2,990</TableCell>
                  <TableCell>{t('screens.legal.annual')}</TableCell>
                  <TableCell>{t('screens.legal.text7Days')}</TableCell>
                  <TableCell>{t('screens.legal.every12Months')}</TableCell>
                  <TableCell>{t('screens.legal.text5Days')}</TableCell>
                  <TableCell>{t('screens.legal.text14Days')}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <p className="text-sm text-muted-foreground mb-6">{t('screens.legal.refundRequestsMustSubmittedViaValue0', { value0: " " })}<a href="mailto:support@exafy.io" className="text-primary hover:underline">{t('screens.legal.supportExafyIo')}</a>{t('screens.legal.value0Within14CalendarDaysPurchase', { value0: " " })}
          </p>

          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li>{t('screens.legal.inappPurchasesOnlyPaymentsProcessedBy')}</li>
            <li>{t('screens.legal.manageCancelAutorenewalAtAnyTime')}</li>
            <li>{t('screens.legal.pricesIncludeVatWhereApplicableWe')}</li>
          </ul>

          {/* Section 4 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text4MaxinaExperienceEvents')}
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li>{t('screens.legal.eventsOrganisedByIndependentThirdpartyPartners')}</li>
            <li>{t('screens.legal.cancellationAmpRefunds100RefundIf')}</li>
            <li>{t('screens.legal.participantRequirementsMinimumAge16Under18s')}</li>
            <li>{t('screens.legal.liabilityWaiverByAttendingYouAcknowledge')}</li>
          </ul>

          {/* Section 5 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text5DiscoverShop')}
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li>{t('screens.legal.weListThirdpartyPhysicalDigitalProductsservices')}</li>
            <li>{t('screens.legal.shippingAmpReturnsForPhysicalGoods')}</li>
            <li>{t('screens.legal.titleRiskForGoodsPassYou')}</li>
          </ul>

          {/* Section 6 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text6CommunityAmpUsergeneratedContentUgc')}
          </h2>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{t('screens.legal.text61Rules')}</h3>
          <p className="text-foreground/90 leading-relaxed">{t('screens.legal.ourVideoFeedOtherSocialFeatures')}
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{t('screens.legal.text62Licence')}</h3>
          <p className="text-foreground/90 leading-relaxed">{t('screens.legal.youGrantExafyWorldwideNonexclusiveRoyaltyfree')}
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{t('screens.legal.text63Moderation')}</h3>
          <p className="text-foreground/90 leading-relaxed">{t('screens.legal.weReserveRightButHaveNo')}
          </p>

          {/* Section 7 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text7HealthAmpWellnessDisclaimer')}
          </h2>
          <p className="text-foreground/90 leading-relaxed">{t('screens.legal.maxinaProvidesGuidanceCommunitySupportOnly')}
          </p>

          {/* Section 8 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text8IntellectualProperty')}
          </h2>
          <p className="text-foreground/90 leading-relaxed">{t('screens.legal.serviceAllExafyownedContentProtectedBy')}
          </p>

          {/* Section 9 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text9ProhibitedConduct')}
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            {t('screens.legal.youAgreeNot')}
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li>{t('screens.legal.violateAnyApplicableLawRegulation')}</li>
            <li>{t('screens.legal.infringeIntellectualpropertyPrivacyRights')}</li>
            <li>{t('screens.legal.uploadMaliciousCodeAttemptGainUnauthorised')}</li>
            <li>{t('screens.legal.harvestDataEngageAutomatedScraping')}</li>
          </ul>

          {/* Section 10 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text10DisclaimersAmpLimitationLiability')}
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">{t('screens.legal.serviceProvidedAsisAsavailableWithoutWarranties')}
          </p>
          <p className="text-foreground/90 leading-relaxed">{t('screens.legal.nothingTheseTermsExcludesLiabilityFor')}
          </p>

          {/* Section 11 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text11GoverningLawAmpDisputeResolution')}
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li><strong>{t('screens.legal.governingLaw')}</strong> {t('screens.legal.abuDhabiGlobalMarketAdgmLaw')}</li>
            <li><strong>{t('screens.legal.arbitration')}</strong> {t('screens.legal.anyDisputeNotResolvedAmicablyWithin')}</li>
            <li><strong>{t('screens.legal.euConsumers')}</strong> {t('screens.legal.youMayAdditionallySubmitDisputesVia')}</li>
          </ul>

          {/* Section 12 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text12Termination')}
          </h2>
          <p className="text-foreground/90 leading-relaxed">{t('screens.legal.weMaySuspendTerminateYourAccess')}
          </p>

          {/* Section 13 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text13ChangesTerms')}
          </h2>
          <p className="text-foreground/90 leading-relaxed">{t('screens.legal.weMayUpdateTheseTermsFrom')}
          </p>

          {/* Section 14 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text14Contact')}
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            {t('screens.legal.questionsContactUsAt')}
          </p>
          <address className="not-italic text-foreground/90 leading-relaxed mb-4">
            <strong>{t('screens.legal.exafyLtd')}</strong><br />
            {t('screens.legal.alKhatemTower15thFloorAdgm2')}<br />
            {t('screens.legal.abuDhabiUnitedArabEmirates')}<br />
            <br />{t('screens.legal.email')} <a href="mailto:support@exafy.io" className="text-primary hover:underline">{t('screens.legal.supportExafyIo')}</a>
          </address>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">{t('screens.legal.byTappingAcceptCreatingAccountContinuing', { value0: " " })}<Link to="/privacy" className="text-primary hover:underline">{t('screens.legal.privacyPolicy')}</Link>.
            </p>
          </div>
        </article>
      </main>
    </div>
  );
};

export default TermsOfUse;
