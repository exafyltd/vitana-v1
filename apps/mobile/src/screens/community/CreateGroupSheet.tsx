/**
 * VTID-05296 (N-W2 community-hub) — native port of the web create-group dialog
 * (`src/components/CreateGroupPopup.tsx`) form essentials: name, description,
 * category and public/private, mapping to the `useCreateGroup` insert. The
 * web dialog's extra fields (tags, location, rules) are not persisted by the
 * web insert either, so the native sheet keeps the four fields that actually
 * reach the row. Ports-layer + `@vitana/ui` only; RTL-safe; translated strings.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TextInput, BottomSheet, notify, notifyError } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { FilterChips } from './components';
import { useCreateGroup } from './data/groups';

const CATEGORY_KEYS = ['fitness', 'nutrition', 'mental-health', 'support', 'learning', 'social'] as const;
const PRIVACY_KEYS = ['public', 'private'] as const;

export function CreateGroupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('');
  const [privacy, setPrivacy] = useState<string>('public');

  const create = useCreateGroup((groupId) => {
    notify('communityHubNative.createGroup.created');
    reset();
    onClose();
    navigateToWebPath(`/comm/groups/${groupId}`);
  });

  const reset = () => {
    setName('');
    setDescription('');
    setCategory('');
    setPrivacy('public');
  };

  const submit = () => {
    if (!name.trim()) {
      notifyError('communityHubNative.createGroup.nameRequired');
      return;
    }
    create.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      category: category || undefined,
      is_public: privacy === 'public',
    });
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t('communityHubNative.createGroup.title')} testID="create-group">
      <View style={styles.body}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('communityHubNative.createGroup.namePlaceholder')}
          accessibilityLabel={t('communityHubNative.createGroup.nameLabel')}
          testID="create-group-name"
        />
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={t('communityHubNative.createGroup.descriptionPlaceholder')}
          accessibilityLabel={t('communityHubNative.createGroup.descriptionLabel')}
          multiline
          numberOfLines={3}
          testID="create-group-description"
        />

        <Text variant="label" muted>
          {t('communityHubNative.createGroup.categoryLabel')}
        </Text>
        <FilterChips
          groupLabel={t('communityHubNative.createGroup.categoryLabel')}
          chips={CATEGORY_KEYS.map((k) => ({ key: k, label: t(`communityHubNative.createGroup.category.${k}`) }))}
          selected={category}
          onSelect={setCategory}
          testID="create-group-category"
        />

        <Text variant="label" muted>
          {t('communityHubNative.createGroup.privacyLabel')}
        </Text>
        <FilterChips
          groupLabel={t('communityHubNative.createGroup.privacyLabel')}
          chips={PRIVACY_KEYS.map((k) => ({ key: k, label: t(`communityHubNative.createGroup.privacy.${k}`) }))}
          selected={privacy}
          onSelect={setPrivacy}
          testID="create-group-privacy"
        />

        <View style={styles.footer}>
          <Button variant="ghost" size="sm" onPress={onClose} disabled={create.isPending} testID="create-group-cancel">
            {t('communityHubNative.createGroup.cancel')}
          </Button>
          <Button size="sm" onPress={submit} disabled={create.isPending} testID="create-group-submit">
            {create.isPending ? t('communityHubNative.createGroup.creating') : t('communityHubNative.createGroup.submit')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
});
