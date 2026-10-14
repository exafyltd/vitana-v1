/**
 * VTID-05176 — every i18n key the dev catalogue (app/native-ui-catalogue.tsx)
 * shows, listed once (plan change 31). All are EXISTING keys, present in all
 * 11 locales (checked by tests/ui/catalogue.test.tsx without the `de`
 * fallback): no key is added, because a new key is a `src/i18n/de` edit — a
 * web deploy path. The kit itself uses only `screens.ui.close`.
 */
export const CATALOGUE_KEYS = {
  // buttons, menu items, select options, tabs
  save: 'common.save',
  cancel: 'common.cancel',
  delete: 'common.delete',
  select: 'common.select',
  more: 'common.more',
  next: 'common.next',
  back: 'common.back',
  yes: 'common.yes',
  no: 'common.no',
  retry: 'common.retry',
  // input / textarea placeholder and label
  search: 'common.search',
  // dialog / sheet titles and descriptions
  done: 'common.done',
  learnMore: 'screens.ui.learnMore',
  // toasts
  updating: 'screens.ui.updating',
  failedLoadData: 'screens.ui.failedLoadData',
  offline: 'screens.ui.offline',
  reconnecting: 'screens.ui.reconnecting',
  // progress / skeleton label
  loading: 'common.loading',
  // every close button
  close: 'screens.ui.close',
  closeCommon: 'common.close',
} as const;

export type CatalogueKey = (typeof CATALOGUE_KEYS)[keyof typeof CATALOGUE_KEYS];

/** The keys the kit itself renders (close buttons). */
export const KIT_KEYS = ['screens.ui.close'] as const;
