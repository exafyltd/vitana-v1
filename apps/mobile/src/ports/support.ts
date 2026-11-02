/**
 * VTID-05432 (Native Wave 2, support-connectors lane) — the two hand-offs the
 * support and connectors screens make to something outside the screen:
 *
 * - `activateOrbForSupportReport()` — web `src/lib/orbActivate.ts`: opens the
 *   ORB as a support intake. The native ORB wave registers its handler here;
 *   until then it returns `false` and the screen shows the same
 *   `supportTickets.orbUnavailable` error the web shows when no widget is loaded.
 * - `openConsentUrl(url)` — web `redirectViaSystemBrowser`: hands a provider's
 *   OAuth consent URL to the system browser. One way only: the return leg (the
 *   provider redirecting back into the app) is the G1 device-runtime pass, and
 *   no test ever opens a real URL (tests replace the opener).
 */
import { Linking } from 'react-native';

type SupportReportHandler = () => boolean;
type ConsentOpener = (url: string) => Promise<void>;

let supportReport: SupportReportHandler | null = null;

const systemBrowser: ConsentOpener = async (url) => {
  await Linking.openURL(url);
};

let consentOpener: ConsentOpener = systemBrowser;

/** The ORB wave registers its support-intake opener (null unregisters). */
export function registerSupportReportHandler(handler: SupportReportHandler | null): void {
  supportReport = handler;
}

/** True when the ORB opened as a support intake. */
export function activateOrbForSupportReport(): boolean {
  return supportReport ? supportReport() : false;
}

export function openConsentUrl(url: string): Promise<void> {
  return consentOpener(url);
}

/** Tests replace the opener; `null` restores the system browser. */
export function __setConsentOpenerForTests(opener: ConsentOpener | null): void {
  consentOpener = opener ?? systemBrowser;
}
