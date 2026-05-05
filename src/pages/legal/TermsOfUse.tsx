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
            aria-label="Go back"
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
            <strong>{t('screens.legal.effectiveDate')}</strong> 17 May 2025 — Replaces all prior versions. You will be notified of any material change at least 30 days in advance.
          </p>

          {/* Section 1 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text1Introduction')}
          </h2>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{t('screens.legal.text11WhoWe')}</h3>
          <p className="text-foreground/90 leading-relaxed">
            These Terms ("Terms") form a legally binding agreement between you ("you"/"User") and Exafy LTD, Al Khatem Tower, 15th Floor, ADGM Square, Al Maryah Island, Abu Dhabi, United Arab Emirates ("Exafy," "we," "us," "our"). Exafy owns and operates the Maxina mobile applications (iOS &amp; Android) and maxina.app website (together, the "Service"), built on the Vitana System.
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{t('screens.legal.text12Acceptance')}</h3>
          <p className="text-foreground/90 leading-relaxed">
            By downloading, accessing or using any part of the Service, you acknowledge that you have read and agree to these Terms and to our{" "}
            <Link to="/privacy" className="text-primary hover:underline">{t('screens.legal.privacyPolicy')}</Link>. If you do not agree, do not use the Service.
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

          <p className="text-sm text-muted-foreground mb-6">
            *Refund requests must be submitted via{" "}
            <a href="mailto:support@exafy.io" className="text-primary hover:underline">{t('screens.legal.supportExafyIo')}</a>{" "}
            within 14 calendar days of purchase; we will reimburse the original payment method within a further 14 days if eligible.
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
          <p className="text-foreground/90 leading-relaxed">
            Our Video Feed and other social features must be used responsibly. We follow content standards comparable to Instagram, TikTok and YouTube (no harassment, hate, sexual exploitation, illegal activity, spam, malware, etc.).
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{t('screens.legal.text62Licence')}</h3>
          <p className="text-foreground/90 leading-relaxed">
            You grant Exafy a world-wide, non-exclusive, royalty-free licence to host, display, adapt and share your UGC solely for operating, promoting and improving the Service.
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{t('screens.legal.text63Moderation')}</h3>
          <p className="text-foreground/90 leading-relaxed">
            We reserve the right (but have no obligation) to review, remove or disable content at our discretion, including upon valid copyright-takedown notices or lawful requests.
          </p>

          {/* Section 7 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text7HealthAmpWellnessDisclaimer')}
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Maxina provides guidance and community support only. It is not a medical, psychological, or fitness service and does not replace professional care. Always consult qualified professionals before acting on information obtained through the Service.
          </p>

          {/* Section 8 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text8IntellectualProperty')}
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            The Service and all Exafy-owned content are protected by copyright, trademark and other laws. Except for the limited licence expressly granted herein, no rights are transferred to you.
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
          <p className="text-foreground/90 leading-relaxed mb-4">
            The Service is provided "as-is" and "as-available", without warranties of any kind, express or implied. To the fullest extent permitted by ADGM and consumer-protection laws, Exafy disclaims liability for indirect, consequential or special damages and limits aggregate liability to the greater of (a) total fees paid by you in the preceding 12 months or (b) €100.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            Nothing in these Terms excludes liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded under law.
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
          <p className="text-foreground/90 leading-relaxed">
            We may suspend or terminate your access for violation of these Terms, legal requirements, or platform policies. On termination, rights granted to you cease immediately, but sections that by nature should survive (e.g., licences, disclaimers, governing law) will remain in force.
          </p>

          {/* Section 13 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            {t('screens.legal.text13ChangesTerms')}
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            We may update these Terms from time to time. Material changes take effect 30 days after notice via the app, website or email. Continued use after the effective date constitutes acceptance.
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
            <br />
            Email: <a href="mailto:support@exafy.io" className="text-primary hover:underline">{t('screens.legal.supportExafyIo')}</a>
          </address>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              By tapping "Accept", creating an account, or continuing to use Maxina you confirm that you have read, understood and agree to be bound by these Terms and our{" "}
              <Link to="/privacy" className="text-primary hover:underline">{t('screens.legal.privacyPolicy')}</Link>.
            </p>
          </div>
        </article>
      </main>
    </div>
  );
};

export default TermsOfUse;
