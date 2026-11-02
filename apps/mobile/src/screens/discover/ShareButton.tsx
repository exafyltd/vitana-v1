/**
 * VTID-05510 — twin of src/components/sharing/UniversalShareButton.tsx as the
 * mobile web runs it: `useNativeShare` is available on a phone, so a press
 * opens the system share sheet with `{ title, text, url }` (the web opens its
 * own share dialog only when the native share fails; React Native's
 * `Share.share` rejects only on a programming error and a dismiss resolves,
 * so the sheet is the whole flow natively). Product links are
 * `<web origin>/products/<id>` (src/lib/shareUrl.ts getShareUrl).
 */
import { useState, type ReactElement } from 'react';
import { Platform, Share, type StyleProp, type ViewStyle } from 'react-native';
import { Button, Text, useUITheme } from '../../ports/ui';
import { DiscoverIcon } from '../../ports/discover';
import { useI18n } from '../../i18n/I18nProvider';
import { publicWebOrigin } from './data/client';

export function productShareUrl(id: string): string {
  return `${publicWebOrigin()}/products/${encodeURIComponent(id)}`;
}

export async function shareContent(content: { title: string; text?: string; url: string }): Promise<void> {
  const text = content.text || content.title;
  await Share.share(
    Platform.OS === 'android' ? { title: content.title, message: `${text}\n${content.url}` } : { title: content.title, message: text, url: content.url },
  ).catch(() => undefined);
}

export function ShareButton({
  content,
  variant = 'ghost',
  size = 'sm',
  showLabel = true,
  style,
  testID,
}: {
  content: { title: string; description?: string; url: string };
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [sharing, setSharing] = useState(false);
  const label = t('common.share');
  const onPress = async () => {
    if (sharing) return;
    setSharing(true);
    await shareContent({ title: content.title, text: content.description || content.title, url: content.url });
    setSharing(false);
  };
  return (
    <Button testID={testID ?? 'share-button'} variant={variant} size={size} disabled={sharing} accessibilityLabel={label} onPress={() => void onPress()} style={style}>
      <DiscoverIcon name="Share2" size={16} color={variant === 'default' ? colors.primaryForeground : colors.foreground} />
      {showLabel && size !== 'icon' ? (
        <Text size="sm" weight="500" style={{ marginStart: 8 }}>
          {label}
        </Text>
      ) : null}
    </Button>
  );
}
