/**
 * VTID-05426 (native-wave2-memory-diary-r2/diary) — the native Daily Diary,
 * a 1:1 port of the phone-shaped web page `src/pages/MobileDailyDiary.tsx`
 * (it renders through `MobileAppShell`; the N3 shell supplies that chrome
 * here). One route for the three ledger rows: the `tab` search param picks
 * the `MobileModePill` mode — `health` (default; MEMORY.DAILY_DIARY,
 * MEMORY.DIARY) or `bugs` (MEMORY.DIARY_BUGS); only an explicit valid value
 * sets it, like the web `searchParams.get("tab")` effect.
 *
 * Health Diary: the voice-first capture card, the Text / Photo option row
 * (the active option opens inline in a card with its close button) and the
 * entry list. Bug Reports: the capture card in bug mode (bug / UX sub-mode)
 * and "My reports".
 *
 * The utility bar (VTID-05653, web `MobileDailyDiary.tsx:86-108`) is the
 * shared shell bar: Search, the mode pill, Calendar, then Life Compass, Gift
 * Voucher and the Vitana Index / Autopilot chips. The web
 * ExpandableSearchButton only stores a query nothing reads
 * (`MobileDailyDiary.tsx` `searchQuery` is unused), so Search has no
 * `onSearch` here. React 19: typed with `ReactElement`.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text, useUITheme } from '../../ports/ui';
import { DiaryIcon } from '../../ports/diary';
import { MobileModePill, type ModeOption } from '../../shell/components/MobileModePill';
import { AutopilotChip, CalendarButton, SearchButton, VitanaIndexChip } from '../../shell/utility/buttons';
import { UtilityBar } from '../../shell/utility/UtilityBar';
import { CaptureCard } from './CaptureCard';
import { DiaryEntryList } from './DiaryEntryList';
import { FeedbackReportList } from './FeedbackReportList';
import { PhotoDiaryUploader } from './PhotoDiaryUploader';
import { TextDiaryEditor } from './TextDiaryEditor';
import { DiaryCard } from './components';
import { useDiaryText } from './text';
import type { ReportType } from './data/tickets';

export type DiaryTab = 'health' | 'bugs';
type PlusOption = 'text' | 'camera';

const PLUS_OPTIONS: ReadonlyArray<{ id: PlusOption; icon: string; labelKey: string }> = [
  { id: 'text', icon: 'Type', labelKey: 'diary.text' },
  { id: 'camera', icon: 'Camera', labelKey: 'diary.photo' },
];

/** `?tab=bugs` → bugs; anything else → health (web initial state). */
export function tabFromParam(value: unknown): DiaryTab {
  return value === 'bugs' ? 'bugs' : 'health';
}

export function DailyDiaryScreen(): ReactElement {
  const { t } = useDiaryText();
  const { colors } = useUITheme();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<DiaryTab>(() => tabFromParam(params.tab));
  const [plus, setPlus] = useState<PlusOption | null>(null);
  const [bugSubMode, setBugSubMode] = useState<ReportType>('bug_report');
  const [feedbackRefreshKey, setFeedbackRefreshKey] = useState(0);

  useEffect(() => {
    if (params.tab === 'health' || params.tab === 'bugs') setActiveTab(params.tab);
  }, [params.tab]);

  const modes: ModeOption[] = [
    { value: 'health', label: t('diary.healthTab'), icon: '🩺' },
    { value: 'bugs', label: t('diary.bugTab'), icon: '🐛' },
  ];

  return (
    <KeyboardAvoidingView style={[styles.fill, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView testID="screen-daily-diary" contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text variant="title" accessibilityRole="header">
            {t('diary.title')}
          </Text>
          <Text muted>{t('diary.description')}</Text>
        </View>

        <View style={styles.bar}>
          <UtilityBar
            afterGiftVoucher={
              <>
                <VitanaIndexChip />
                <AutopilotChip />
              </>
            }
          >
            <SearchButton placeholder={t('diary.searchPlaceholder')} />
            <MobileModePill
              modes={modes}
              activeMode={activeTab}
              title={t('diaryNative.selectMode')}
              onModeChange={(v) => {
                setActiveTab(tabFromParam(v));
                setPlus(null);
              }}
            />
            <CalendarButton />
          </UtilityBar>
        </View>

        {activeTab === 'health' ? (
          <View style={styles.section} testID="diary-health">
            <CaptureCard mode="health" />
            <View style={styles.plusRow}>
              {PLUS_OPTIONS.map((opt) => {
                const on = plus === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    testID={`diary-plus-${opt.id}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => setPlus(on ? null : opt.id)}
                    style={[styles.plus, { backgroundColor: on ? colors.primary : colors.muted }]}
                  >
                    <DiaryIcon name={opt.icon} size={14} color={on ? colors.primaryForeground : colors.mutedForeground} />
                    <Text size="xs" weight="500" color={on ? colors.primaryForeground : colors.mutedForeground}>
                      {t(opt.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {plus ? (
              <DiaryCard testID={`diary-plus-panel-${plus}`}>
                <View style={styles.panelHeader}>
                  <Text size="sm" weight="500" muted>
                    {plus === 'text' ? t('diary.textEntry') : t('diary.photoEntry')}
                  </Text>
                  <Pressable testID="diary-plus-close" accessibilityRole="button" accessibilityLabel={t('diaryNative.close')} hitSlop={8} onPress={() => setPlus(null)} style={styles.close}>
                    <DiaryIcon name="X" size={16} color={colors.mutedForeground} />
                  </Pressable>
                </View>
                {plus === 'text' ? <TextDiaryEditor onSaveComplete={() => setPlus(null)} /> : <PhotoDiaryUploader onUploadComplete={() => setPlus(null)} />}
              </DiaryCard>
            ) : null}
            <DiaryEntryList />
          </View>
        ) : (
          <View style={styles.section} testID="diary-bugs">
            <CaptureCard mode={bugSubMode} onModeChange={setBugSubMode} onSubmitted={() => setFeedbackRefreshKey((k) => k + 1)} />
            <FeedbackReportList refreshKey={feedbackRefreshKey} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120, gap: 16 },
  header: { gap: 4 },
  bar: { alignSelf: 'stretch' },
  section: { gap: 16 },
  plusRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 4 },
  plus: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { padding: 4, borderRadius: 999 },
});
