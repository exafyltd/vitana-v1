import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import { t } from '@/lib/i18n-toast';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

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
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">{t('screens.legal.privacyPolicy')}</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Privacy Policy for the Maxina Mobile Application
          </h1>
          <p className="text-muted-foreground mb-8">
            <strong>{t('screens.legal.effectiveDate')}</strong> 6th April 2026
          </p>

          <p className="text-foreground/90 leading-relaxed">
            Thank you for choosing to use Maxina Mobile ("App"), which is developed and provided by Exafy LTD ("we," "us," or "our"), a company based in Abu Dhabi, United Arab Emirates (UAE). This Privacy Policy explains how we collect, use, disclose, and protect your personal data when you use Maxina Mobile, including your rights under the EU General Data Protection Regulation (GDPR) and applicable UAE data protection regulations, and how we comply with the requirements of the Apple App Store and Google Play Store.
          </p>

          <p className="text-foreground/90 leading-relaxed">
            By downloading, accessing, or using Maxina Mobile, you acknowledge that you have read, understood, and agree to the practices described in this Policy. If you do not agree with these terms, please do not use the App.
          </p>

          {/* Section 1 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            1. Introduction
          </h2>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{t('screens.legal.text11AboutUs')}</h3>
          <p className="text-foreground/90 leading-relaxed">
            Exafy LTD is incorporated in Abu Dhabi, UAE. Our goal is to provide a secure, user-friendly mobile application—Maxina Mobile—built on top of the Vitana System ("System"). The Vitana System provides technological infrastructure and backend services used to support Maxina Mobile's features.
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{t('screens.legal.text12Scope')}</h3>
          <p className="text-foreground/90 leading-relaxed">
            This Privacy Policy applies to all users of Maxina Mobile, regardless of their geographic location, including users in the European Union (EU), United Arab Emirates (UAE), and elsewhere.
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{t('screens.legal.text13Compliance')}</h3>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li><strong>{t('screens.legal.gdpr')}</strong> {t('screens.legal.weAdhereEuGeneralDataProtection')}</li>
            <li><strong>{t('screens.legal.uaeRegulations')}</strong> {t('screens.legal.asAbuDhabibasedCompanyWeAlso')}</li>
            <li><strong>{t('screens.legal.appStorePlayStoreRequirements')}</strong> {t('screens.legal.weFollowAppleAppStoreGoogle')}</li>
          </ul>

          {/* Section 2 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            2. Data We Collect
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
          <p className="text-foreground/90 leading-relaxed">
            If you permit us to access location data (e.g., precise location via GPS), we may collect this information to provide location-based services. You can control whether the App has access to location data in your device settings.
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{t('screens.legal.text24CookiesSimilarTechnologies')}</h3>
          <p className="text-foreground/90 leading-relaxed">
            We may use cookies or similar tracking technologies within the App or on associated websites to understand usage patterns, remember preferences, and enhance user experience. You have the choice to manage your cookie preferences via your device or browser settings, depending on platform capabilities.
          </p>

          {/* Section 3 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            3. How We Collect Your Data
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            We collect personal data in the following ways:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li><strong>{t('screens.legal.directlyFromYou')}</strong> {t('screens.legal.whenYouRegisterAccountEnterInformation')}</li>
            <li><strong>{t('screens.legal.automatically')}</strong> {t('screens.legal.throughUseCookiesLogDataDevice')}</li>
            <li><strong>{t('screens.legal.fromThirdParties')}</strong> {t('screens.legal.weMayReceivePersonalDataFrom')}</li>
          </ul>

          {/* Section 4 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            4. Purpose and Legal Bases for Processing
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            We process your personal data for the following purposes and under the following legal bases:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li><strong>{t('screens.legal.provideMaintainService')}</strong> {t('screens.legal.weUseYourDataEnableCore')}</li>
          </ul>

          {/* Section 5 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            5. How We Share Your Data
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            We do not sell or rent your personal data. We may share your information with:
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
            6. International Data Transfers
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Given that Exafy LTD operates in the UAE, your data may be processed and stored in servers located outside your country of residence, including countries within or outside the European Economic Area (EEA). If we transfer your data outside of the EEA, we will take measures to ensure adequate protection, such as implementing standard contractual clauses (SCCs) or equivalent legal mechanisms in compliance with GDPR.
          </p>

          {/* Section 7 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            7. Data Retention
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            We will only retain your personal data for as long as necessary to fulfill the purposes outlined in this Privacy Policy or as required by law. The criteria used to determine retention periods include:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li>{t('screens.legal.durationYourRelationshipWithUsE')}</li>
          </ul>

          {/* Section 8 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            8. Data Security
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            We are committed to protecting your personal data by implementing appropriate technical and organizational security measures. These measures include encryption, access controls, and secure servers to safeguard your information against unauthorized access, alteration, disclosure, or destruction. However, no method of electronic transmission or storage is completely secure, and we cannot guarantee absolute security.
          </p>

          {/* Section 9 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            9. Your Rights Under GDPR (If You Are in the EU)
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            If you are located in the European Union, you have the following rights under GDPR (subject to certain exceptions):
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
          <p className="text-foreground/90 leading-relaxed mt-4">
            To exercise any of these rights, please contact us using the contact details provided in Section 13. We will respond to your request within the time limits stipulated by GDPR and other applicable data protection laws.
          </p>

          {/* Section 10 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            10. Children's Privacy
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Maxina Mobile is not intended for use by children under the age of 16 (or such other age as defined by local law). We do not knowingly collect personal data from children. If you believe that a child under 16 has provided personal information to us, please contact us immediately, and we will take steps to delete such information.
          </p>

          {/* Section 11 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            11. Third-Party Services
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Maxina Mobile may contain links to third-party websites or integrate services operated by third parties (e.g., payment processors, analytics tools). We do not control and are not responsible for the privacy practices of these third parties. We encourage you to review their separate privacy policies to understand how they handle your personal data.
          </p>

          {/* Section 12 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            12. Changes to This Privacy Policy
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. If we make significant changes, we will notify you through the App or by other means. Your continued use of Maxina Mobile after the posting of the updated Privacy Policy constitutes your acceptance of those changes.
          </p>

          {/* Section 13 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            13. Contact Us
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            If you have any questions, concerns, or requests regarding this Privacy Policy or our data processing practices, please contact us at:
          </p>
          <address className="not-italic text-foreground/90 leading-relaxed mb-4">
            <strong>{t('screens.legal.exafyLtd')}</strong><br />
            Al Khatem Tower, 15th floor, ADGM Square, Al Maryah Island,<br />
            Abu Dhabi, United Arab Emirates<br />
            <br />
            Email: <a href="mailto:support@exafy.io" className="text-primary hover:underline">{t('screens.legal.supportExafyIo')}</a>
          </address>
          <p className="text-foreground/90 leading-relaxed">
            We will do our best to address and resolve any issues you raise regarding our handling of your personal data.
          </p>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              <strong>{t('screens.legal.lastUpdated')}</strong> 6th April 2026
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              By using the Maxina Mobile Application, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree, please discontinue the use of the App immediately.
            </p>
          </div>
        </article>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
