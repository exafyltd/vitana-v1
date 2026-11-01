/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — native twin of the web
 * `AddMemoryDialog.tsx` text mode, as a bottom sheet: optional category
 * chips, the memory text, Cancel / Save. Saves through the one diary write
 * path (`POST /memory/diary/entries`, tags `[category || "general", "diary"]`)
 * exactly like the web dialog. The web voice and photo modes need the native
 * capture deps (expo-image-picker / an expo audio recorder) the `diary` lane
 * adds (plan decision 3); until they are in the app, the sheet offers text.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Text, notify, notifyError } from '../../../ports/ui';
import { Textarea } from '../../../ports/memory';
import { ChipRow } from '../components';
import { GARDEN_CATEGORIES, gardenCategoryKey, useKnowledgeBase } from '../data/garden';
import { useMemoryText } from '../text';

export function AddMemorySheet({ open, onClose, defaultCategory }: { open: boolean; onClose: () => void; defaultCategory?: string }) {
  const { t } = useMemoryText();
  const { createKnowledge, isCreating } = useKnowledgeBase();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(defaultCategory ?? '');

  useEffect(() => {
    if (open) setCategory(defaultCategory ?? '');
  }, [open, defaultCategory]);

  const submit = async () => {
    if (!content.trim()) {
      notifyError('toasts.memory.emptyMemory', 'toasts.memory.pleaseAddSomeContentYourMemory');
      return;
    }
    try {
      await createKnowledge({ content, tags: [category || 'general', 'diary'] });
      setContent('');
      setCategory('');
      onClose();
      notify('toasts.memory.memorySaved', 'toasts.memory.yourMemoryHasAddedYourKnowledge');
    } catch {
      // createKnowledge's onError already raised the toast; the sheet stays open with the text.
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t('screens.memory.addMemory')} testID="memory-add-sheet">
      <View style={styles.body}>
        <Text variant="label">{t('screens.memory.categoryOptional')}</Text>
        <ChipRow
          label={t('screens.memory.categoryOptional')}
          chips={GARDEN_CATEGORIES.map((c) => ({ key: c.id, label: t(`screens.memory.garden.categories.${gardenCategoryKey(c.id)}.title`) }))}
          isActive={(k) => k === category}
          onPress={(k) => setCategory(k === category ? '' : k)}
          testID="memory-add-category"
        />
        <Text variant="label">{t('screens.memory.memoryContent')}</Text>
        <Textarea
          value={content}
          onChangeText={setContent}
          placeholder={t('screens.memory.writeYourMemoryReflectionInsightHere')}
          accessibilityLabel={t('screens.memory.memoryContent')}
          rows={8}
          testID="memory-add-content"
        />
        <View style={styles.footer}>
          <Button variant="outline" onPress={onClose} disabled={isCreating} testID="memory-add-cancel">
            {t('screens.memory.cancel')}
          </Button>
          <Button onPress={() => void submit()} disabled={isCreating || !content.trim()} testID="memory-add-save">
            {isCreating ? t('screens.memory.saving') : t('memoryNative.addMemory.save')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 8 },
});
