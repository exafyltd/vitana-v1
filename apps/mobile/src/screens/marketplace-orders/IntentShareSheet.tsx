/**
 * VTID-05511 — twin of `src/components/intents/IntentShareSheet.tsx`, the
 * bottom drawer the intent card's share button opens:
 *  - direct invite: recipients typed as Vitana IDs (split on space / comma,
 *    `@` stripped, lower-cased, `^[a-z][a-z0-9]{3,15}$`), an optional note
 *    (280), the "N valid recipients" line with the over-cap warning (20), and
 *    Send → POST `/intents/:id/share` (`shareIntent`), with the web's toasts
 *    for the gateway's error codes and the created / already-shared counts;
 *  - the public link `${PUBLIC_ORIGIN}/p/<id>?ref=<my vitana id>` (read-only)
 *    and its copy button, plus the "tracks who clicked" hint;
 *  - share elsewhere: WhatsApp (`wa.me`), e-mail (`mailto:`) and "More" (the
 *    system share sheet, the web's `navigator.share` path).
 * PUBLIC_ORIGIN is the web's `VITE_PUBLIC_ORIGIN || GATEWAY_BASE`; natively
 * `webBaseUrl` (unset in every non-production profile) or the gateway origin.
 * The native app has no clipboard module (no expo-clipboard in its
 * dependencies, and a new dependency is outside this lane's paths), so the
 * copy button hands the link to the system share sheet, whose "Copy" action
 * copies it; the "copied" check and toast follow a completed share.
 */
import { useMemo, useState, type ReactElement } from 'react';
import { Linking, Share, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Button, Spinner, Text, TextInput, notify, notifyError, useUITheme } from '../../ports/ui';
import { CommerceIcon, Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, Textarea } from '../../ports/marketplace-orders';
import { config, endpoints } from '../../ports/env';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { db } from './data/client';
import { shareIntent } from './data/intents';

const VITANA_ID_BARE_REGEX = /^[a-z][a-z0-9]{3,15}$/;
const K = 'discoverCommerceNative.marketplaceOrders.share';

export function publicOrigin(): string {
  if (config.webBaseUrl) return config.webBaseUrl.replace(/\/+$/, '');
  try {
    return endpoints(config).gatewayOrigin.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

/** The recipients line of the web sheet. */
export function parseRecipients(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((s) => s.trim().replace(/^@/, '').toLowerCase())
    .filter((s) => s && VITANA_ID_BARE_REGEX.test(s));
}

function useMyVitanaId(): string | undefined {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ['my-vitana-id', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<string | null> => {
      const { data } = await db().from('profiles').select('vitana_id').eq('user_id', user?.id).maybeSingle();
      return (data as { vitana_id?: string } | null)?.vitana_id ?? null;
    },
  });
  return q.data ?? undefined;
}

export function IntentShareSheet({
  open,
  onOpenChange,
  intentId,
  intentTitle,
  intentScopeExcerpt,
  maxRecipients = 20,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intentId: string;
  intentTitle?: string | null;
  intentScopeExcerpt?: string | null;
  maxRecipients?: number;
}): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { session } = useAuth();
  const vitanaId = useMyVitanaId();
  const [recipientText, setRecipientText] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicLink = useMemo(() => `${publicOrigin()}/p/${intentId}${vitanaId ? `?ref=${encodeURIComponent(vitanaId)}` : ''}`, [intentId, vitanaId]);
  const recipients = useMemo(() => parseRecipients(recipientText), [recipientText]);
  const exceeded = recipients.length > maxRecipients;

  const send = async () => {
    if (!session?.access_token) return;
    if (recipients.length === 0) {
      notifyError('toasts.intents.addAtLeastOneVitanaid');
      return;
    }
    if (exceeded) {
      notifyError(`${K}.tooManyTitle`, `${K}.tooManyBody`, { count: recipients.length, max: maxRecipients });
      return;
    }
    setSubmitting(true);
    try {
      const data = await shareIntent(intentId, recipients, note);
      if (!data.ok) {
        const title =
          data.error === 'BATCH_TOO_LARGE' ? `${K}.errorBatch` : data.error === 'SHARE_QUOTA_EXCEEDED' ? `${K}.errorQuota` : data.error === 'CANNOT_SHARE_PRIVATE_POST' ? `${K}.errorPrivate` : `${K}.errorFailed`;
        notifyError(title, `${K}.errorBody`, { message: data.message || data.error || t(`${K}.tryAgain`) });
        return;
      }
      const created = data.matches_created ?? 0;
      const skipped = data.recipients_already_shared ?? 0;
      notify(created === 0 ? `${K}.alreadyShared` : created === 1 ? `${K}.sharedOne` : `${K}.sharedMany`, skipped > 0 ? `${K}.skipped` : `${K}.theyWillSee`, { count: created, skipped });
      setRecipientText('');
      setNote('');
      onOpenChange(false);
    } catch {
      notifyError('toasts.intents.networkError');
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    try {
      const r = await Share.share({ message: publicLink, url: publicLink });
      if (r.action === Share.sharedAction) {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        notify('toasts.intents.linkCopied');
      }
    } catch {
      notifyError('toasts.intents.couldNotCopy');
    }
  };

  const nativeShare = async () => {
    try {
      const r = await Share.share({ title: intentTitle || t(`${K}.defaultTitle`), message: `${intentScopeExcerpt || t(`${K}.defaultText`)}\n${publicLink}`, url: publicLink });
      if (r.action === Share.sharedAction) onOpenChange(false);
    } catch {
      /* cancelled or unavailable: nothing, like the web */
    }
  };

  const whatsapp = () => void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(`${intentTitle ? `${intentTitle}\n` : ''}${publicLink}`)}`).catch(() => undefined);
  const email = () =>
    void Linking.openURL(`mailto:?subject=${encodeURIComponent(intentTitle || t(`${K}.fromVitana`))}&body=${encodeURIComponent(`${intentScopeExcerpt || ''}\n\n${publicLink}`)}`).catch(() => undefined);

  const label = (s: string) => (
    <Text size="xs" muted style={styles.caps}>
      {s}
    </Text>
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent testID="mo-intent-share">
        <DrawerHeader>
          <View style={styles.row}>
            <CommerceIcon name="Share2" size={20} color={colors.foreground} />
            <DrawerTitle>{t('screens.intents.shareThisPost')}</DrawerTitle>
          </View>
          <DrawerDescription>{t('screens.intents.sendDirectInviteFriendsCopyLink')}</DrawerDescription>
        </DrawerHeader>
        <View style={styles.body}>
          <View style={styles.section}>
            {label(t('screens.intents.directInviteVitanaFriends'))}
            <Textarea
              testID="mo-share-recipients"
              value={recipientText}
              onChangeText={setRecipientText}
              placeholder={t('screens.intents.dragan1Maria3Daniel4PasteTypeUp')}
              accessibilityLabel={t('screens.intents.recipientVitana_ids')}
              autoCapitalize="none"
            />
            <TextInput testID="mo-share-note" value={note} onChangeText={setNote} placeholder={t('screens.intents.addShortNoteOptional')} maxLength={280} />
            <View style={styles.between}>
              <Text size="xs" muted style={styles.flex} testID="mo-share-count">
                {t('screens.intents.lengthValidValue1', { length: recipients.length, value1: recipients.length === 1 ? 'recipient' : 'recipients' })}
                {exceeded ? (
                  <Text size="xs" color={colors.destructive}>
                    {`  ${t('screens.intents.overMaxrecipientsCap', { maxRecipients })}`}
                  </Text>
                ) : null}
              </Text>
              <Button size="sm" testID="mo-share-send" onPress={() => void send()} disabled={submitting || recipients.length === 0 || exceeded}>
                {submitting ? <Spinner /> : null}
                {t('screens.intents.send')}
              </Button>
            </View>
          </View>

          <View style={styles.section}>
            {label(t('screens.intents.publicLink'))}
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextInput testID="mo-share-link" value={publicLink} editable={false} />
              </View>
              <Button variant="outline" size="icon" testID="mo-share-copy" accessibilityLabel={t('screens.intents.copyLink')} onPress={() => void copyLink()}>
                <CommerceIcon name={copied ? 'Check' : 'Copy'} size={16} color={colors.foreground} />
              </Button>
            </View>
            <Text size="xs" muted>
              {t('screens.intents.tracksWhoClickedFromYourShare')}
            </Text>
          </View>

          <View style={styles.section}>
            {label(t('screens.intents.shareElsewhere'))}
            <View style={styles.grid}>
              <Button variant="outline" style={styles.tile} testID="mo-share-whatsapp" onPress={whatsapp}>
                <CommerceIcon name="MessageCircle" size={16} color={colors.foreground} />
                <Text size="xs">{t('screens.intents.whatsapp')}</Text>
              </Button>
              <Button variant="outline" style={styles.tile} testID="mo-share-email" onPress={email}>
                <CommerceIcon name="Mail" size={16} color={colors.foreground} />
                <Text size="xs">{t('screens.intents.email')}</Text>
              </Button>
              <Button variant="outline" style={styles.tile} testID="mo-share-more" onPress={() => void nativeShare()}>
                <CommerceIcon name="Share2" size={16} color={colors.foreground} />
                <Text size="xs">{t('screens.intents.more')}</Text>
              </Button>
            </View>
          </View>
        </View>
        <DrawerFooter>
          <Button variant="ghost" testID="mo-share-close" onPress={() => onOpenChange(false)}>
            {t('screens.intents.close')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingBottom: 16, gap: 20 },
  section: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  flex: { flex: 1 },
  caps: { textTransform: 'uppercase', letterSpacing: 1 },
  grid: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, height: 'auto', paddingVertical: 12, flexDirection: 'column', gap: 4 },
});
