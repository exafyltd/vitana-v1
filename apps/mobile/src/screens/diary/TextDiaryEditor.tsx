/**
 * VTID-05426 (native-wave2-memory-diary-r2/diary) — twin of the web
 * `src/components/diary/TextDiaryEditor.tsx`: a 6-row text area with the
 * character count at its end corner and "Save entry", saving through the one
 * diary write path (`POST /memory/diary/entries`, source `text`, tags
 * `diary`, `text`). React 19: typed with `ReactElement`.
 */
import { useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, notifyError } from '../../ports/ui';
import { ButtonIcon, Textarea } from '../../ports/diary';
import { saveDiaryEntry, useInvalidateDiary } from './data/entries';
import { notifyDiarySaved } from './components';
import { useDiaryText } from './text';

export function TextDiaryEditor({ onSaveComplete }: { onSaveComplete?: () => void }): ReactElement {
  const x = useDiaryText();
  const { t } = x;
  const invalidate = useInvalidateDiary();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const value = text.trim();
    if (!value) {
      notifyError('toasts.diary.emptyEntry', 'toasts.diary.pleaseWriteSomethingBeforeSaving');
      return;
    }
    setSaving(true);
    try {
      const { index } = await saveDiaryEntry({ text: value, source: 'text', tags: ['diary', 'text'] });
      notifyDiarySaved(x, index, ['toasts.diary.entrySaved', 'toasts.diary.yourDiaryEntryHasSavedSuccessfully'], 'diaryNative.indexSaved.signals');
      setText('');
      invalidate();
      onSaveComplete?.();
    } catch {
      notifyError('toasts.diary.saveFailed', 'toasts.diary.failedSaveYourEntryPleaseTry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root} testID="diary-text-editor">
      <View>
        <Textarea testID="diary-text-input" placeholder={t('screens.diary.typeYourTodaySEntry')} value={text} onChangeText={setText} rows={6} />
        <Text variant="caption" muted style={styles.count}>
          {t('screens.diary.lengthCharacters', { length: x.fmtNumber(text.length) })}
        </Text>
      </View>
      <Button testID="diary-text-save" size="lg" disabled={saving || !text.trim()} onPress={() => void save()}>
        <ButtonIcon name="Save" />
        {saving ? t('screens.diary.saving') : t('screens.diary.saveEntry')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 16 },
  count: { position: 'absolute', bottom: 8, end: 8 },
});
