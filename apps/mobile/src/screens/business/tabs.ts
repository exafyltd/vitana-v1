/**
 * VTID-05645 (native-wave2-sharing-business-r3/business-hub) — the Business Hub tab model, pure and
 * IO-free. Twin of `pathToMobileTab`, `VALID_MOBILE_TABS` and `resolveMobileTab` in the web
 * `src/pages/BusinessHub.tsx`. The five path routes keep their mapping; every other mode-pill leaf is
 * reached by `?tab=<leaf>`. The pill labels the web hardcodes in English come from the
 * `businessNative` catalog; the four group labels reuse the web `businessHub.tabs.*` keys.
 */
import type { ModeOption } from '../../shell/components/MobileModePill';

export type BusinessTab =
  | 'snapshot'
  | 'services.services'
  | 'services.events'
  | 'services.packages'
  | 'sales.inventory'
  | 'sales.promotions'
  | 'sales.referrals'
  | 'insights.clients'
  | 'insights.performance'
  | 'insights.earnings'
  | 'insights.growth';

export const VALID_BUSINESS_TABS: ReadonlySet<string> = new Set<BusinessTab>([
  'snapshot',
  'services.services',
  'services.events',
  'services.packages',
  'sales.inventory',
  'sales.promotions',
  'sales.referrals',
  'insights.clients',
  'insights.performance',
  'insights.earnings',
  'insights.growth',
]);

/** Web `pathToMobileTab`: the route path decides the pill when no `?tab=` leaf is given. */
export function pathToMobileTab(pathname: string): BusinessTab {
  if (pathname === '/business/services') return 'services.services';
  if (pathname === '/business/clients') return 'insights.clients';
  if (pathname === '/business/sell-earn') return 'sales.inventory';
  if (pathname === '/business/analytics') return 'insights.performance';
  return 'snapshot';
}

/** Web `resolveMobileTab`: an explicit, valid `?tab=` leaf wins; otherwise the path mapping. */
export function resolveMobileTab(pathname: string, tabParam: string | null | undefined): BusinessTab {
  if (tabParam && VALID_BUSINESS_TABS.has(tabParam)) return tabParam as BusinessTab;
  return pathToMobileTab(pathname);
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** The mode-pill options (web mobile branch). The Sales group is only offered to resellers. */
export function buildBusinessModes(t: Translate, isReseller: boolean): ModeOption[] {
  return [
    { value: 'snapshot', label: t('businessHub.tabs.snapshot'), icon: '📊' },
    {
      value: 'services',
      label: t('businessHub.tabs.services'),
      icon: '💼',
      children: [
        { value: 'services.services', label: t('businessNative.tabs.myServices'), icon: '💼' },
        { value: 'services.events', label: t('businessNative.tabs.myEvents'), icon: '📅' },
        { value: 'services.packages', label: t('businessNative.tabs.packages'), icon: '📦' },
      ],
    },
    ...(isReseller
      ? [
          {
            value: 'sales',
            label: t('businessHub.tabs.sales'),
            icon: '🎫',
            children: [
              { value: 'sales.inventory', label: t('businessNative.tabs.inventory'), icon: '📦' },
              { value: 'sales.promotions', label: t('businessNative.tabs.promotions'), icon: '📣' },
              { value: 'sales.referrals', label: t('businessNative.tabs.referrals'), icon: '🤝' },
            ],
          },
        ]
      : []),
    {
      value: 'insights',
      label: t('businessHub.tabs.insights'),
      icon: '📈',
      children: [
        { value: 'insights.clients', label: t('businessNative.tabs.clients'), icon: '👥' },
        { value: 'insights.performance', label: t('businessNative.tabs.performance'), icon: '📊' },
        { value: 'insights.earnings', label: t('businessNative.tabs.earnings'), icon: '💵' },
        { value: 'insights.growth', label: t('businessNative.tabs.growth'), icon: '📈' },
      ],
    },
  ];
}
