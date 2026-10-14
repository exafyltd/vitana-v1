/**
 * VTID-05186 (N3, plan changes 12 + 18) — the drawer's language picker
 * (LanguageOptionsList equivalent): every GA language by its endonym
 * (LOCALE_PRESENTATION), the selection written through LanguageProvider.
 */
import { BottomSheet, RadioGroup } from '../../ports/ui';
import { LOCALE_PRESENTATION } from '../../ports/core';
import { useI18n } from '../../i18n/I18nProvider';
import { useLanguage } from '../../identity/LanguageProvider';

export function LanguageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { language, options, setLanguage } = useLanguage();
  return (
    <BottomSheet testID="language-sheet" open={open} onClose={onClose} title={t('screens.settings.language')}>
      <RadioGroup
        testID="language-options"
        accessibilityLabel={t('screens.settings.language')}
        value={language}
        onChange={(v) => {
          void setLanguage(v);
          onClose();
        }}
        options={options.map((o) => ({ value: o.value, label: LOCALE_PRESENTATION[o.value]?.endonym ?? o.value }))}
      />
    </BottomSheet>
  );
}
