/**
 * VTID-05296 (N-W2 community-hub) — native port of the web intent composer
 * (`src/components/intents/IntentComposer.tsx`, form mode). A bottom sheet with
 * a kind picker, a title and a scope field, and optional budget fields for the
 * commercial kinds, mapping directly to `POST /intents` via `usePostIntent`.
 * The web screen's voice mode and cover-photo picker are out of scope for the
 * native port (no ORB surface / cover library here yet); the form path is the
 * data-backed parity surface the board and Find a Partner share.
 * Ports-layer + `@vitana/ui` only; RTL-safe; strings arrive translated.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TextInput, BottomSheet, notify, notifyError } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { FilterChips } from './components';
import { INTENT_COMPOSER_KINDS, usePostIntent } from './data/intents';
import type { IntentKind } from './data/intents';

export function IntentComposer({
  open,
  onClose,
  defaultKind = 'commercial_buy',
  onPosted,
}: {
  open: boolean;
  onClose: () => void;
  defaultKind?: IntentKind;
  onPosted?: (intentId: string) => void;
}) {
  const { t } = useI18n();
  const [kind, setKind] = useState<IntentKind>(defaultKind);
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');

  const post = usePostIntent((intentId) => {
    notify('communityHubNative.composer.posted');
    reset();
    onPosted?.(intentId);
    onClose();
  });

  const reset = () => {
    setTitle('');
    setScope('');
    setBudgetMin('');
    setBudgetMax('');
  };

  const commercial = kind === 'commercial_buy' || kind === 'commercial_sell';

  const submit = () => {
    if (title.trim().length < 3) {
      notifyError('communityHubNative.composer.titleRequired');
      return;
    }
    if (scope.trim().length < 20) {
      notifyError('communityHubNative.composer.scopeTooShort');
      return;
    }
    const kindPayload: Record<string, unknown> = {};
    if (commercial) {
      if (budgetMin) kindPayload.budget_min = Number(budgetMin);
      if (budgetMax) kindPayload.budget_max = Number(budgetMax);
      kindPayload.currency = 'EUR';
    }
    post.mutate({ intent_kind: kind, title: title.trim(), scope: scope.trim(), kind_payload: kindPayload });
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t('communityHubNative.composer.title')} testID="intent-composer">
      <View style={styles.body}>
        <Text variant="label" muted>
          {t('communityHubNative.composer.kindLabel')}
        </Text>
        <FilterChips
          groupLabel={t('communityHubNative.composer.kindLabel')}
          chips={INTENT_COMPOSER_KINDS.map((k) => ({ key: k, label: t(`communityHubNative.composer.kind.${k}`) }))}
          selected={kind}
          onSelect={(k) => setKind(k as IntentKind)}
          testID="composer-kind"
        />

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('communityHubNative.composer.titlePlaceholder')}
          accessibilityLabel={t('communityHubNative.composer.titleLabel')}
          maxLength={140}
          testID="composer-title"
        />
        <TextInput
          value={scope}
          onChangeText={setScope}
          placeholder={t('communityHubNative.composer.scopePlaceholder')}
          accessibilityLabel={t('communityHubNative.composer.scopeLabel')}
          multiline
          numberOfLines={3}
          maxLength={1500}
          testID="composer-scope"
        />

        {commercial ? (
          <View style={styles.budgetRow}>
            <View style={styles.fill}>
              <TextInput
                value={budgetMin}
                onChangeText={setBudgetMin}
                placeholder={t('communityHubNative.composer.budgetMin')}
                accessibilityLabel={t('communityHubNative.composer.budgetMin')}
                keyboardType="numeric"
                testID="composer-budget-min"
              />
            </View>
            <View style={styles.fill}>
              <TextInput
                value={budgetMax}
                onChangeText={setBudgetMax}
                placeholder={t('communityHubNative.composer.budgetMax')}
                accessibilityLabel={t('communityHubNative.composer.budgetMax')}
                keyboardType="numeric"
                testID="composer-budget-max"
              />
            </View>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Button variant="ghost" size="sm" onPress={onClose} disabled={post.isPending} testID="composer-cancel">
            {t('communityHubNative.composer.cancel')}
          </Button>
          <Button size="sm" onPress={submit} disabled={post.isPending} testID="composer-submit">
            {post.isPending ? t('communityHubNative.composer.posting') : t('communityHubNative.composer.submit')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
  budgetRow: { flexDirection: 'row', gap: 12 },
  fill: { flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
});
