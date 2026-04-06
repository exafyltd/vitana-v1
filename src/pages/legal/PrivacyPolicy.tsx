import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Privacy Policy | Maxina Mobile Application"
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
          <h1 className="text-lg font-semibold">Privacy Policy</h1>
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
            <strong>Effective Date:</strong> 6th April 2026
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

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">1.1 About Us</h3>
          <p className="text-foreground/90 leading-relaxed">
            Exafy LTD is incorporated in Abu Dhabi, UAE. Our goal is to provide a secure, user-friendly mobile application—Maxina Mobile—built on top of the Vitana System ("System"). The Vitana System provides technological infrastructure and backend services used to support Maxina Mobile's features.
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">1.2 Scope</h3>
          <p className="text-foreground/90 leading-relaxed">
            This Privacy Policy applies to all users of Maxina Mobile, regardless of their geographic location, including users in the European Union (EU), United Arab Emirates (UAE), and elsewhere.
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">1.3 Compliance</h3>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li><strong>GDPR:</strong> We adhere to the EU General Data Protection Regulation to ensure the protection of personal data of individuals located in the EU.</li>
            <li><strong>UAE Regulations:</strong> As an Abu Dhabi-based company, we also comply with relevant federal and local data protection laws and regulations within the UAE.</li>
            <li><strong>App Store & Play Store Requirements:</strong> We follow Apple App Store and Google Play Store guidelines to ensure transparency and user data protection.</li>
          </ul>

          {/* Section 2 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            2. Data We Collect
          </h2>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">2.1 Account Information</h3>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li><strong>Account Information:</strong> Name, email address, phone number, and other information you voluntarily provide when creating an account or using specific features.</li>
            <li><strong>Profile Information:</strong> User profile pictures, usernames, or other details you voluntarily provide within the App.</li>
            <li><strong>Contact Information:</strong> If you communicate with us, we may keep a record of that correspondence, including your email address and the content of your communication.</li>
          </ul>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">2.2 Usage Data</h3>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li><strong>Device Information:</strong> IP address, device model, operating system, unique device identifiers, and crash logs.</li>
            <li><strong>Activity Logs:</strong> Information about how you interact with the App, such as feature usage, timestamps, and navigation paths.</li>
          </ul>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">2.3 Location Data (If Applicable)</h3>
          <p className="text-foreground/90 leading-relaxed">
            If you permit us to access location data (e.g., precise location via GPS), we may collect this information to provide location-based services. You can control whether the App has access to location data in your device settings.
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">2.4 Cookies and Similar Technologies</h3>
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
            <li><strong>Directly from You:</strong> When you register an account, enter information into the App, or communicate with us.</li>
            <li><strong>Automatically:</strong> Through the use of cookies, log data, and device identifiers as you navigate and interact with Maxina Mobile.</li>
            <li><strong>From Third Parties:</strong> We may receive personal data from trusted third-party service providers, such as analytics partners, to improve the App's functionality.</li>
          </ul>

          {/* Section 4 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            4. Purpose and Legal Bases for Processing
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            We process your personal data for the following purposes and under the following legal bases:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li><strong>To Provide and Maintain the Service:</strong> We use your data to enable core features of Maxina Mobile (e.g., account login, personalized user experience). Our legal basis for this is the performance of a contract or user agreement.</li>
          </ul>

          {/* Section 5 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            5. How We Share Your Data
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            We do not sell or rent your personal data. We may share your information with:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li><strong>Service Providers and Partners:</strong> To help us operate, maintain, and improve the App and the underlying Vitana System (e.g., hosting providers, analytics services). These third parties are contractually bound to protect your data and only process it as directed by us.</li>
            <li><strong>AI Service Providers:</strong> To power the in-app AI assistant and related AI features, certain personal data — including voice recordings and transcripts, typed prompts and chat messages, diary entries, Memory Garden entries, wellness goals, profile context (such as your name and preferences), and social media profile URLs and bio text (when using import/enrichment features) — may be transmitted to Google (Gemini AI models and Google Cloud AI services) via the Lovable AI Gateway. This data is used to generate personalized AI responses, voice synthesis, proactive greetings, health coaching, and profile enrichment suggestions. This data is sent only after you provide explicit consent through an in-app disclosure dialog that appears before first use of any AI feature. It is transmitted via encrypted connections and is not permanently stored by the AI provider. You may revoke this consent at any time in Settings &gt; Privacy. Google is contractually required to provide protections equivalent to or exceeding those described in this Privacy Policy.</li>
            <li><strong>Affiliates and Subsidiaries:</strong> We may share data with subsidiaries or affiliates under Exafy LTD that support our business operations, provided they also adhere to this Privacy Policy.</li>
            <li><strong>Legal or Regulatory Authorities:</strong> We may disclose data if required to do so by law or in good faith that such disclosure is necessary to comply with legal processes or to protect our rights, property, or personal safety.</li>
            <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, personal data may be transferred to the acquiring entity under the same or a revised privacy policy, subject to your rights to be notified and/or to withdraw consent.</li>
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
            <li>Duration of your relationship with us (e.g., while you maintain an account).</li>
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
            <li><strong>Right of Access:</strong> You can request access to the personal data we hold about you.</li>
            <li><strong>Right to Rectification:</strong> You can request correction of incomplete or inaccurate data we have about you.</li>
            <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> You can request deletion of your data, subject to certain legal limitations.</li>
            <li><strong>Right to Restrict Processing:</strong> You can request that we limit how we process your personal data.</li>
            <li><strong>Right to Data Portability:</strong> You can request a copy of your personal data in a structured, commonly used, and machine-readable format.</li>
            <li><strong>Right to Object:</strong> You can object to certain processing activities based on legitimate interests or direct marketing.</li>
            <li><strong>Right to Withdraw Consent:</strong> If we rely on consent to process your data, you may withdraw your consent at any time.</li>
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
            <strong>Exafy LTD</strong><br />
            Al Khatem Tower, 15th floor, ADGM Square, Al Maryah Island,<br />
            Abu Dhabi, United Arab Emirates<br />
            <br />
            Email: <a href="mailto:support@exafy.io" className="text-primary hover:underline">support@exafy.io</a>
          </address>
          <p className="text-foreground/90 leading-relaxed">
            We will do our best to address and resolve any issues you raise regarding our handling of your personal data.
          </p>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              <strong>Last Updated:</strong> 6th April 2026
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
