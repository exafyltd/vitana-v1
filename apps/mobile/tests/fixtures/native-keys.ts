/**
 * VTID-05186 — test fixture for the `native.*` keys PR-K adds as
 * src/i18n/<locale>/native.json (plan section H). Until that shard is on this
 * branch, tests inject the DE and EN texts (copied from PR-K) into the loaded
 * catalogs; other locales fall back to DE exactly as in the app. Once the shard
 * is present this fixture changes nothing (it only fills a missing namespace).
 */
import { catalogs } from '../../src/i18n';

const NATIVE = {
  de: {
    unported: {
      title: 'Noch nicht in der App',
      body: 'Dieser Bereich ist in der App noch nicht verfügbar. Wir arbeiten daran – bis dahin kannst du ihn in der Web-Version nutzen.',
    },
    adminInBrowser: {
      title: 'Verwaltung im Browser',
      body: 'Diesen Bereich nutzt du im Browser, nicht in der App. In dieser Version ist dafür noch keine Web-Adresse eingerichtet.',
    },
    configMissing: {
      title: 'Konfiguration fehlt',
      body: 'Dieser App-Version fehlen Einstellungen, die sie zum Start braucht. Die fehlenden Werte stehen unten.',
    },
    a11y: { unread: '{count} ungelesene Nachrichten', openNotifications: 'Benachrichtigungen öffnen, {count} ungelesen', openCart: 'Warenkorb öffnen, {count} Artikel' },
  },
  en: {
    unported: { title: 'Not in the app yet', body: "This area isn't available in the app yet. We're working on it – until then, you can use it in the web version." },
    adminInBrowser: { title: 'Admin in the browser', body: 'You use this area in the browser, not in the app. No web address is set up for it in this version yet.' },
    configMissing: { title: 'Configuration missing', body: 'This app version is missing settings it needs to start. The missing values are listed below.' },
    a11y: { unread: '{count} unread messages', openNotifications: 'Open notifications, {count} unread', openCart: 'Open cart, {count} items' },
  },
};

/** The 9 keys of plan section H. */
export const NATIVE_KEYS = [
  'native.unported.title',
  'native.unported.body',
  'native.adminInBrowser.title',
  'native.adminInBrowser.body',
  'native.configMissing.title',
  'native.configMissing.body',
  'native.a11y.unread',
  'native.a11y.openNotifications',
  'native.a11y.openCart',
];

for (const locale of ['de', 'en'] as const) {
  const cat = catalogs[locale] as Record<string, unknown>;
  if (!cat.native) cat.native = NATIVE[locale];
}
export {};
