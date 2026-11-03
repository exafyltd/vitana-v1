/**
 * VTID-05431 (Native Wave 2, settings lane) — the two preferences sections of
 * `src/pages/MobileSettings.tsx`:
 *
 *  - `preferences.appearance` — the theme select (light / dark / system; the
 *    native `ThemeProvider` mode, the web's next-themes), the primary-colour
 *    swatches and the five local display switches (no backing store on the
 *    web either).
 *  - `preferences.language` — the voice/AI language select (the native
 *    `LanguageProvider`, the web's `LanguageContext`), the date / time format
 *    selects (unbound on the web) and the regional settings list.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useUITheme } from '../../../ports/ui';
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ports/settings-ui';
import { useI18n } from '../../../i18n/I18nProvider';
import { useLanguage } from '../../../identity/LanguageProvider';
import { useThemeMode, type ThemeMode } from '../../../theme/ThemeProvider';
import { Divider, SectionCard, ToggleRow } from '../components';

const APPEARANCE_ITEMS = [
  { title: 'screens.settings.compactMode', desc: 'screens.settings.showMoreContentByReducingSpacing', defaultChecked: false },
  { title: 'screens.settings.highContrast', desc: 'screens.settings.increaseContrastForBetterVisibility', defaultChecked: false },
  { title: 'screens.settings.reduceMotion', desc: 'screens.settings.minimizeAnimationsTransitions', defaultChecked: false },
  { title: 'screens.settings.autoDarkMode', desc: 'screens.settings.switchThemesBasedTime', defaultChecked: false },
  { title: 'screens.settings.smoothScrolling', desc: 'screens.settings.enhancedPageNavigation', defaultChecked: true },
] as const;

export function AppearanceSection(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { mode, setMode } = useThemeMode();
  const swatches = [colors.primary, colors.statusInfo, colors.statusSuccess, colors.statusWarning];
  return (
    <SectionCard icon="Palette" title={t('screens.mobilesettings.appearance')} testID="settings-appearance">
      <View style={styles.field}>
        <Label>{t('screens.mobilesettings.theme')}</Label>
        <Select value={mode} onValueChange={(v) => setMode(v as ThemeMode)}>
          <SelectTrigger testID="settings-theme-trigger">
            <SelectValue placeholder={t('screens.mobilesettings.selectTheme')} />
          </SelectTrigger>
          <SelectContent testID="settings-theme">
            <SelectItem value="light" testID="settings-theme-light">
              {t('screens.mobilesettings.light')}
            </SelectItem>
            <SelectItem value="dark" testID="settings-theme-dark">
              {t('screens.mobilesettings.dark')}
            </SelectItem>
            <SelectItem value="system" testID="settings-theme-system">
              {t('screens.mobilesettings.system')}
            </SelectItem>
          </SelectContent>
        </Select>
      </View>
      <View style={styles.field}>
        <Label>{t('screens.mobilesettings.primaryColor')}</Label>
        <View style={styles.swatches}>
          {swatches.map((c, i) => (
            <View key={i} style={[styles.swatch, { backgroundColor: c, borderColor: i === 0 ? colors.primary : 'transparent' }]} />
          ))}
        </View>
      </View>
      <Divider />
      {APPEARANCE_ITEMS.map((item) => (
        <ToggleRow key={item.title} title={t(item.title)} description={t(item.desc)} defaultChecked={item.defaultChecked} testID={`settings-appearance-${item.title.split('.').pop()}`} />
      ))}
    </SectionCard>
  );
}

const REGIONAL = [
  ['screens.settings.distance', 'screens.settings.miles'],
  ['screens.settings.weight', 'screens.settings.pounds'],
  ['screens.settings.temperature', 'screens.settings.fahrenheit'],
  ['screens.settings.currency', 'screens.settings.usd'],
  ['screens.settings.firstDayWeek', 'screens.settings.sunday'],
] as const;

export function LanguageSection(): ReactElement {
  const { t } = useI18n();
  const { language, options, setLanguage } = useLanguage();
  return (
    <SectionCard icon="Globe" title={t('screens.mobilesettings.languageRegion')} testID="settings-language">
      <View style={styles.field}>
        <Label>{t('screens.mobilesettings.voiceAiLanguage')}</Label>
        <Select value={language} onValueChange={(v) => void setLanguage(v)}>
          <SelectTrigger testID="settings-language-trigger">
            <SelectValue placeholder={t('screens.mobilesettings.selectLanguage')} />
          </SelectTrigger>
          <SelectContent testID="settings-language-list">
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} testID={`settings-language-${opt.value}`}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Text size="xs" muted>
          {t('screens.mobilesettings.usedForVoiceRecognitionAiResponses')}
        </Text>
      </View>
      <View style={styles.grid}>
        <View style={[styles.field, styles.cell]}>
          <Label>{t('screens.mobilesettings.dateFormat')}</Label>
          <Select>
            <SelectTrigger testID="settings-date-format-trigger">
              <SelectValue placeholder={t('screens.mobilesettings.format')} />
            </SelectTrigger>
            <SelectContent testID="settings-date-format">
              <SelectItem value="mm/dd/yyyy">{t('screens.mobilesettings.mmddyyyy')}</SelectItem>
              <SelectItem value="dd/mm/yyyy">{t('screens.mobilesettings.ddmmyyyy')}</SelectItem>
              <SelectItem value="yyyy-mm-dd">{t('screens.mobilesettings.yyyymmdd')}</SelectItem>
            </SelectContent>
          </Select>
        </View>
        <View style={[styles.field, styles.cell]}>
          <Label>{t('screens.mobilesettings.timeFormat')}</Label>
          <Select>
            <SelectTrigger testID="settings-time-format-trigger">
              <SelectValue placeholder={t('screens.mobilesettings.format')} />
            </SelectTrigger>
            <SelectContent testID="settings-time-format">
              <SelectItem value="12">{t('screens.mobilesettings.text12hour')}</SelectItem>
              <SelectItem value="24">{t('screens.mobilesettings.text24hour')}</SelectItem>
            </SelectContent>
          </Select>
        </View>
      </View>
      <Divider />
      <View style={styles.regional} testID="settings-regional">
        <Text size="sm" weight="500">
          {t('screens.mobilesettings.regionalSettings')}
        </Text>
        {REGIONAL.map(([label, value]) => (
          <View key={label} style={styles.regionalRow}>
            <Text size="sm" muted>
              {t(label)}
            </Text>
            <Text size="sm" weight="500">
              {t(value)}
            </Text>
          </View>
        ))}
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  swatches: { flexDirection: 'row', gap: 12 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2 },
  grid: { flexDirection: 'row', gap: 12 },
  cell: { flex: 1 },
  regional: { gap: 8 },
  regionalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
});
