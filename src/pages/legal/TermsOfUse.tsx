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

const TermsOfUse = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Terms of Use | Maxina"
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
          <h1 className="text-lg font-semibold">Terms of Use</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Maxina App &amp; Website — Terms of Use
          </h1>
          <p className="text-muted-foreground mb-8">
            <strong>Effective Date:</strong> 17 May 2025 — Replaces all prior versions. You will be notified of any material change at least 30 days in advance.
          </p>

          {/* Section 1 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            1. Introduction
          </h2>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">1.1 Who we are.</h3>
          <p className="text-foreground/90 leading-relaxed">
            These Terms ("Terms") form a legally binding agreement between you ("you"/"User") and Exafy LTD, Al Khatem Tower, 15th Floor, ADGM Square, Al Maryah Island, Abu Dhabi, United Arab Emirates ("Exafy," "we," "us," "our"). Exafy owns and operates the Maxina mobile applications (iOS &amp; Android) and maxina.app website (together, the "Service"), built on the Vitana System.
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">1.2 Acceptance.</h3>
          <p className="text-foreground/90 leading-relaxed">
            By downloading, accessing or using any part of the Service, you acknowledge that you have read and agree to these Terms and to our{" "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. If you do not agree, do not use the Service.
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">1.3 Minimum age.</h3>
          <p className="text-foreground/90 leading-relaxed">
            The Service is intended for individuals 16 years or older; users aged 16–17 must have verifiable parental/guardian consent.
          </p>

          {/* Section 2 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            2. Accounts
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li>Create a single, truthful account; keep credentials confidential.</li>
            <li>We may suspend or terminate accounts for breach, fraud, or community-guideline violations.</li>
          </ul>

          {/* Section 3 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            3. Subscriptions &amp; Billing
          </h2>

          <div className="overflow-x-auto my-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Trial</TableHead>
                  <TableHead>Auto-Renew</TableHead>
                  <TableHead>Grace Period</TableHead>
                  <TableHead>Refund Window*</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Premium</TableCell>
                  <TableCell>€9.90</TableCell>
                  <TableCell>Monthly</TableCell>
                  <TableCell>7 days</TableCell>
                  <TableCell>Every 30 days</TableCell>
                  <TableCell>5 days</TableCell>
                  <TableCell>14 days</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Premium</TableCell>
                  <TableCell>€99</TableCell>
                  <TableCell>Annual</TableCell>
                  <TableCell>7 days</TableCell>
                  <TableCell>Every 12 months</TableCell>
                  <TableCell>5 days</TableCell>
                  <TableCell>14 days</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">VIP</TableCell>
                  <TableCell>€299</TableCell>
                  <TableCell>Monthly</TableCell>
                  <TableCell>7 days</TableCell>
                  <TableCell>Every 30 days</TableCell>
                  <TableCell>5 days</TableCell>
                  <TableCell>14 days</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">VIP</TableCell>
                  <TableCell>€2,990</TableCell>
                  <TableCell>Annual</TableCell>
                  <TableCell>7 days</TableCell>
                  <TableCell>Every 12 months</TableCell>
                  <TableCell>5 days</TableCell>
                  <TableCell>14 days</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            *Refund requests must be submitted via{" "}
            <a href="mailto:support@exafy.io" className="text-primary hover:underline">support@exafy.io</a>{" "}
            within 14 calendar days of purchase; we will reimburse the original payment method within a further 14 days if eligible.
          </p>

          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li>In-app purchases only. Payments are processed by Apple (App Store) or Google (Play Store) using cards, Apple Pay or Google Pay. Local strong-customer-authentication rules (e.g., PSD2) may apply.</li>
            <li>Manage or cancel auto-renewal at any time in your Apple/Google account settings. Deleting the app does not cancel your subscription.</li>
            <li>Prices include VAT where applicable; we will issue electronic invoices.</li>
          </ul>

          {/* Section 4 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            4. Maxina Experience Events
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li>Events are organised by independent third-party partners; their own terms govern ticketing, safety and conduct. Exafy acts solely as booking facilitator.</li>
            <li>Cancellation &amp; refunds: 100% refund if you cancel ≥ 48 hours before the event start; after that, tickets are non-refundable.</li>
            <li>Participant requirements: minimum age 16 (under-18s require adult accompaniment); no intoxicated or drug-impaired participants.</li>
            <li>Liability waiver: By attending you acknowledge the inherent risks and release the organiser(s) and Exafy from liability for personal injury, property loss or other claims to the maximum extent permitted by law (see full "Participant Agreement &amp; Liability Waiver" provided during booking).</li>
          </ul>

          {/* Section 5 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            5. Discover Shop
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li>We list third-party physical and digital products/services. Exafy is merchant of record, issues receipts, and collects payment.</li>
            <li>Shipping &amp; returns: For physical goods you may cancel or return unused items within 14 days of delivery (consumer must pay return postage unless goods are faulty). Digital goods are non-refundable once download or streaming begins, unless defective.</li>
            <li>Title and risk for goods pass to you upon delivery; manufacturer warranties apply where offered.</li>
          </ul>

          {/* Section 6 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            6. Community &amp; User-Generated Content ("UGC")
          </h2>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">6.1 Rules.</h3>
          <p className="text-foreground/90 leading-relaxed">
            Our Video Feed and other social features must be used responsibly. We follow content standards comparable to Instagram, TikTok and YouTube (no harassment, hate, sexual exploitation, illegal activity, spam, malware, etc.).
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">6.2 Licence.</h3>
          <p className="text-foreground/90 leading-relaxed">
            You grant Exafy a world-wide, non-exclusive, royalty-free licence to host, display, adapt and share your UGC solely for operating, promoting and improving the Service.
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6 mb-3">6.3 Moderation.</h3>
          <p className="text-foreground/90 leading-relaxed">
            We reserve the right (but have no obligation) to review, remove or disable content at our discretion, including upon valid copyright-takedown notices or lawful requests.
          </p>

          {/* Section 7 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            7. Health &amp; Wellness Disclaimer
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Maxina provides guidance and community support only. It is not a medical, psychological, or fitness service and does not replace professional care. Always consult qualified professionals before acting on information obtained through the Service.
          </p>

          {/* Section 8 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            8. Intellectual Property
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            The Service and all Exafy-owned content are protected by copyright, trademark and other laws. Except for the limited licence expressly granted herein, no rights are transferred to you.
          </p>

          {/* Section 9 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            9. Prohibited Conduct
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            You agree not to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li>Violate any applicable law or regulation.</li>
            <li>Infringe intellectual-property or privacy rights.</li>
            <li>Upload malicious code or attempt to gain unauthorised access.</li>
            <li>Harvest data or engage in automated scraping.</li>
          </ul>

          {/* Section 10 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            10. Disclaimers &amp; Limitation of Liability
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            The Service is provided "as-is" and "as-available", without warranties of any kind, express or implied. To the fullest extent permitted by ADGM and consumer-protection laws, Exafy disclaims liability for indirect, consequential or special damages and limits aggregate liability to the greater of (a) total fees paid by you in the preceding 12 months or (b) €100.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            Nothing in these Terms excludes liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded under law.
          </p>

          {/* Section 11 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            11. Governing Law &amp; Dispute Resolution
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li><strong>Governing law:</strong> Abu Dhabi Global Market (ADGM) law.</li>
            <li><strong>Arbitration:</strong> Any dispute not resolved amicably within 30 days shall be finally settled by arbitration under the ADGM Arbitration Centre rules; the seat, language and venue shall be Abu Dhabi.</li>
            <li><strong>EU consumers:</strong> You may additionally submit disputes via the EU Online Dispute Resolution (ODR) platform, which we accept.</li>
          </ul>

          {/* Section 12 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            12. Termination
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            We may suspend or terminate your access for violation of these Terms, legal requirements, or platform policies. On termination, rights granted to you cease immediately, but sections that by nature should survive (e.g., licences, disclaimers, governing law) will remain in force.
          </p>

          {/* Section 13 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            13. Changes to Terms
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            We may update these Terms from time to time. Material changes take effect 30 days after notice via the app, website or email. Continued use after the effective date constitutes acceptance.
          </p>

          {/* Section 14 */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            14. Contact
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            Questions? Contact us at:
          </p>
          <address className="not-italic text-foreground/90 leading-relaxed mb-4">
            <strong>Exafy LTD</strong><br />
            Al Khatem Tower, 15th Floor, ADGM Square, Al Maryah Island,<br />
            Abu Dhabi, United Arab Emirates<br />
            <br />
            Email: <a href="mailto:support@exafy.io" className="text-primary hover:underline">support@exafy.io</a>
          </address>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              By tapping "Accept", creating an account, or continuing to use Maxina you confirm that you have read, understood and agree to be bound by these Terms and our{" "}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        </article>
      </main>
    </div>
  );
};

export default TermsOfUse;
