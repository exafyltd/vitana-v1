/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — the Instagram share card, native twin of
 * the web `InstagramShareModal`. The web draws the card to a canvas with `html2canvas`; native
 * renders the card as a view and captures it with `captureRef` (the share-capture port, design
 * R1-C), then gives the image file to the system share sheet — where Instagram, Messages and
 * "Save image" all live, so the web's separate download button is not needed. With no capture
 * engine registered the sheet shares the link only (see `src/ports/share-capture.ts`).
 */
import { useRef, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Text, notify, notifyError, useUITheme } from '../../ports/ui';
import { getChatDevice } from '../../ports/chat-device';
import { getShareCapture } from '../../ports/share-capture';
import { useI18n } from '../../i18n/I18nProvider';
import { Chip, ChipRow, SheetActions, SheetScroll } from './components';
import { formatDayTime } from './format';

export interface ShareCardEvent {
  id: string;
  title: string;
  start_time?: string;
  location?: string;
  description?: string;
}

type CardFormat = 'story' | 'square';

export function ShareCardSheet({ open, onClose, event, shareUrl }: { open: boolean; onClose: () => void; event: ShareCardEvent; shareUrl: string }): ReactElement | null {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const cardRef = useRef<View>(null);
  const [format, setFormat] = useState<CardFormat>('story');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!open) return null;

  const message = `${t('sharingNative.card.shareText', { title: event.title })}\n${shareUrl}`;

  const share = async () => {
    const device = getChatDevice();
    const engine = getShareCapture();
    setBusy(true);
    try {
      if (engine) {
        const uri = await engine.captureRef(cardRef.current, { format: 'png', quality: 1, result: 'tmpfile' });
        const result = await device.share({ message, url: uri });
        if (result === 'shared') {
          notify('toasts.sharing.sharedSuccessfully');
          onClose();
        }
      } else {
        const result = await device.share({ message });
        if (result === 'shared') notify('toasts.sharing.linkSharedDownloadImageIncludeIt');
      }
    } catch {
      notifyError('toasts.sharing.sharingFailedTryDownloadingInstead');
    } finally {
      setBusy(false);
    }
  };

  const openInstagram = async () => {
    const device = getChatDevice();
    device.copyText(shareUrl);
    notify('toasts.sharing.linkCopiedPasteItYourInstagram');
    try {
      await device.openUrl('instagram://app');
    } catch {
      await device.openUrl('https://instagram.com').catch(() => undefined);
    }
  };

  const copyLink = () => {
    getChatDevice().copyText(shareUrl);
    setCopied(true);
    notify('toasts.sharing.linkCopiedForLinkSticker');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t('screens.sharing.shareInstagram')} testID="share-card-sheet">
      <SheetScroll>
        <ChipRow label={t('screens.sharing.shareInstagram')}>
          <Chip role="radio" label={t('screens.sharing.story916')} selected={format === 'story'} onPress={() => setFormat('story')} testID="share-card-format-story" />
          <Chip role="radio" label={t('screens.sharing.feed11')} selected={format === 'square'} onPress={() => setFormat('square')} testID="share-card-format-square" />
        </ChipRow>
        <View
          ref={cardRef}
          collapsable={false}
          testID="share-card-capture"
          style={[styles.card, { aspectRatio: format === 'story' ? 9 / 16 : 1, backgroundColor: colors.primary }]}
        >
          <Text size="2xl" weight="700" style={{ color: colors.primaryForeground }}>
            {event.title}
          </Text>
          {event.start_time ? <Text style={{ color: colors.primaryForeground }}>{formatDayTime(event.start_time, locale)}</Text> : null}
          {event.location ? <Text style={{ color: colors.primaryForeground }}>{event.location}</Text> : null}
        </View>
        <Text variant="caption" muted>
          {t('screens.sharing.tapShareInstagramOpenYourShare')}
        </Text>
      </SheetScroll>
      <SheetActions>
        <Button variant="outline" onPress={copyLink} testID="share-card-copy">
          {copied ? t('screens.sharing.linkCopied') : t('screens.sharing.copyLinkForLinkSticker')}
        </Button>
        <Button variant="outline" onPress={() => void openInstagram()} testID="share-card-instagram">
          {t('screens.sharing.openInstagramApp')}
        </Button>
        <Button onPress={() => void share()} disabled={busy} testID="share-card-share">
          {busy ? t('screens.sharing.preparing') : t('screens.sharing.shareInstagram')}
        </Button>
      </SheetActions>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: 270, alignSelf: 'center', borderRadius: 16, padding: 20, justifyContent: 'center', gap: 8 },
});
