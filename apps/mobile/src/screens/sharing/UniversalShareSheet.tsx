/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — the universal share sheet, native twin of
 * the web `UniversalShareDialog` and `ShareCampaignModal`: a content preview, the personal share
 * buttons (WhatsApp, Viber, e-mail, SMS, copy link, system share — each opens the member's own
 * app, no account setup), a custom message, and the social auto-post channels with "Blast now"
 * (an active quick-share campaign) and "Create campaign". Not ported in this lane, listed in the
 * PR body: the Vitana Messenger row (it needs the messaging picker).
 */
import { useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Text, Textarea, notify, notifyError, useUITheme } from '../../ports/ui';
import { getChatDevice } from '../../ports/chat-device';
import { getSupabase } from '../../auth/client';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { Chip, ChipRow, Field, SheetActions, SheetScroll } from './components';
import { currentUserId, useChannels } from './data/hooks';
import { getShareUrl, isChannelConnected, personalShareUrl, shareTextOf, SOCIAL_CHANNELS, type CampaignRow, type PersonalChannel, type ShareableContent } from './rules';
import { shareOrigin } from './origin';

/** The personal share buttons: each opens the member's own app with the text and the link filled in. */
export function PersonalShareButtons({ shareUrl, shareText, title, onShared }: { shareUrl: string; shareText: string; title: string; onShared?: () => void }): ReactElement {
  const { t } = useI18n();
  const device = getChatDevice();

  const open = async (channel: PersonalChannel) => {
    const url = personalShareUrl(channel, shareText, shareUrl, title);
    try {
      await device.openUrl(url);
    } catch {
      if (channel === 'viber') {
        device.copyText(`${shareText}\n${shareUrl}`);
        notify('toasts.sharing.viberNotDetectedLinkCopiedClipboard');
        return;
      }
      notifyError('toasts.sharing.shareFailed', 'toasts.sharing.pleaseTryAgain');
    }
  };
  const copy = () => {
    device.copyText(shareUrl);
    notify('toasts.sharing.linkCopied');
  };
  const more = async () => {
    const result = await device.share({ message: `${shareText}\n${shareUrl}` });
    if (result === 'shared') onShared?.();
  };

  const buttons: Array<{ id: string; label: string; onPress: () => void }> = [
    { id: 'whatsapp', label: t('screens.sharing.whatsapp'), onPress: () => void open('whatsapp') },
    { id: 'viber', label: t('sharingNative.share.viber'), onPress: () => void open('viber') },
    { id: 'email', label: t('sharingNative.share.email'), onPress: () => void open('email') },
    { id: 'sms', label: t('sharingNative.share.sms'), onPress: () => void open('sms') },
    { id: 'copy', label: t('sharingNative.share.copy'), onPress: copy },
    { id: 'more', label: t('sharingNative.share.more'), onPress: () => void more() },
  ];
  return (
    <View style={styles.grid}>
      {buttons.map((b) => (
        <Button key={b.id} size="sm" variant="outline" onPress={b.onPress} testID={`share-${b.id}`}>
          {b.label}
        </Button>
      ))}
    </View>
  );
}

export function UniversalShareSheet({ open, onClose, content }: { open: boolean; onClose: () => void; content: ShareableContent }): ReactElement | null {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { channels } = useChannels();
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const shareUrl = content.url || getShareUrl(content.type, content.id, { utm_source: 'share', utm_medium: 'personal', slug: content.slug, origin: shareOrigin() });
  const shareText = shareTextOf(content);

  const toggle = (key: string) => {
    if (!isChannelConnected(channels, key)) {
      notify('toasts.sharing.connectAccount');
      return;
    }
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  };

  const blast = async () => {
    if (selected.length === 0) {
      notifyError('toasts.sharing.selectDistributionChannels', 'toasts.sharing.pleaseSelectAtLeastOneChannel3');
      return;
    }
    setBusy(true);
    try {
      const userId = await currentUserId();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (getSupabase() as any)
        .from('campaigns')
        .insert({
          name: `Quick Share - ${content.title}`,
          user_id: userId,
          status: 'active',
          description: message || `Sharing ${content.type}: ${content.title}`,
          target_channels: Object.fromEntries(selected.map((k) => [k, true])),
          distribution_config: { frequency: 'once', smart_scheduling_enabled: false },
          metadata: { content_type: content.type, content_id: content.id, content_title: content.title },
        })
        .select()
        .single();
      if (error) throw error;
      notify('toasts.sharing.blastSuccessful');
      onClose();
    } catch {
      notifyError('toasts.sharing.shareFailed2', 'toasts.sharing.failedShareContentPleaseTryAgain');
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t('screens.sharing.shareType', { type: content.type })} testID="share-sheet">
      <SheetScroll>
        <Text muted>{t('screens.sharing.sharePersonallyDistributeAcrossYourConnected')}</Text>
        <View style={[styles.preview, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text weight="700">{content.title}</Text>
          {content.description ? (
            <Text size="sm" muted numberOfLines={2}>
              {content.description}
            </Text>
          ) : null}
        </View>
        <Field label={t('screens.sharing.quickSharePersonal2')} hint={t('screens.sharing.opensYourPersonalAppsShareDirectly2')}>
          <PersonalShareButtons shareUrl={shareUrl} shareText={message || shareText} title={content.title} onShared={onClose} />
        </Field>
        <Field label={t('screens.sharing.customMessageOptional')}>
          <Textarea value={message} onChangeText={setMessage} rows={2} placeholder={t('screens.sharing.addCustomMessageYourShare')} accessibilityLabel={t('screens.sharing.customMessageOptional')} testID="share-message" />
        </Field>
        <Field label={t('screens.sharing.socialMediaAutopost')} hint={t('screens.sharing.selectConnectedAccountsShareAutomatically')}>
          <ChipRow>
            {SOCIAL_CHANNELS.map((c) => {
              const connected = isChannelConnected(channels, c.key);
              return (
                <Chip
                  key={c.key}
                  role="checkbox"
                  label={connected ? c.name : `${c.name} · ${t('screens.sharing.notConnected')}`}
                  selected={selected.includes(c.key)}
                  onPress={() => toggle(c.key)}
                  testID={`share-channel-${c.key}`}
                />
              );
            })}
          </ChipRow>
        </Field>
      </SheetScroll>
      <SheetActions>
        <Button variant="outline" onPress={() => { onClose(); navigateToWebPath('/sharing/campaigns'); }} testID="share-create-campaign">
          {t('screens.sharing.createCampaign')}
        </Button>
        <Button onPress={() => void blast()} disabled={busy} testID="share-blast">
          {t('screens.sharing.blastNow')}
        </Button>
      </SheetActions>
    </BottomSheet>
  );
}

/** `ShareCampaignModal`: the campaign's public link through the personal share buttons. */
export function ShareCampaignSheet({ open, onClose, campaign }: { open: boolean; onClose: () => void; campaign: Pick<CampaignRow, 'id' | 'name' | 'description'> }): ReactElement | null {
  const { t } = useI18n();
  if (!open) return null;
  const url = getShareUrl('campaign', campaign.id, { origin: shareOrigin() });
  const description = campaign.description ?? '';
  const text = t('sharingNative.share.campaignText', { name: campaign.name }) + (description ? `\n${description.slice(0, 150)}${description.length > 150 ? '…' : ''}` : '');
  return (
    <BottomSheet open={open} onClose={onClose} title={t('screens.sharing.shareThisCampaign')} testID="share-campaign-sheet">
      <Text muted>{t('screens.sharing.sendPersonalInviteNoExtraSetup')}</Text>
      <Field label={t('screens.sharing.quickShare')} hint={t('screens.sharing.opensYourPersonalAppsShareDirectly')}>
        <PersonalShareButtons shareUrl={url} shareText={text} title={campaign.name} onShared={onClose} />
      </Field>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preview: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
});
