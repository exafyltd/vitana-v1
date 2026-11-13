/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — native twin of the mobile-web Invite friends
 * screen (`src/pages/InviteFriends.tsx`, VTID-05058): the member's personal invite link (copy / share)
 * above the same contacts list as Messages → Contacts. Share opens the system share sheet with the
 * invite text (the web uses `navigator.share`, falling back to WhatsApp).
 */
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, notify, notifyError, useUITheme } from '../../ports/ui';
import { getChatDevice } from '../../ports/chat-device';
import { ContactsTab, fetchMyInviteLink } from '../../ports/sharing';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { Page, Panel } from './components';

export function InviteScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { user } = useAuth();
  const [link, setLink] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    fetchMyInviteLink(user.id)
      .then((url) => {
        if (!cancelled) setLink(url);
      })
      .catch(() => {
        if (!cancelled) setLinkError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const message = link ? t('mailhub.findFriends.invite.messageGeneric', { link }) : '';

  const copy = useCallback(() => {
    if (!link) return;
    try {
      getChatDevice().copyText(link);
      setCopied(true);
      notify('toasts.common.inviteLinkCopied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notifyError('toasts.common.couldnTCopyPleaseCopyLink');
    }
  }, [link]);

  const share = useCallback(async () => {
    if (!message) return;
    try {
      await getChatDevice().share({ message });
    } catch {
      // The member closed the share sheet.
    }
  }, [message]);

  return (
    <Page title={t('screens.invitefriends.inviteFriends')} description={t('mailhub.findFriends.page.description')} testID="invite-screen">
      <Panel testID="invite-link-card">
        <Text variant="caption" muted>
          {t('screens.common.yourInviteLink')}
        </Text>
        <View style={[styles.linkBox, { borderColor: colors.border, backgroundColor: colors.muted }]}>
          {link ? (
            <Text size="sm" selectable style={styles.ltr}>
              {link}
            </Text>
          ) : linkError ? (
            <Text size="sm" testID="invite-link-error" style={{ color: colors.destructive }}>
              {t('mailhub.findFriends.invite.linkFailed')}
            </Text>
          ) : (
            <Text size="sm" muted>
              {t('screens.common.generatingYourInviteLink')}
            </Text>
          )}
        </View>
        <View style={styles.buttons}>
          <Button variant="outline" onPress={copy} disabled={!link} testID="invite-copy" style={styles.button}>
            {t(copied ? 'screens.common.copied' : 'screens.common.copyInviteLink')}
          </Button>
          <Button onPress={() => void share()} disabled={!link} testID="invite-share" style={styles.button}>
            {t('mailhub.findFriends.invite.share')}
          </Button>
        </View>
      </Panel>
      <ContactsTab onStartConversation={(userId) => navigateToWebPath(`/inbox/u/${userId}`)} />
    </Page>
  );
}

const styles = StyleSheet.create({
  linkBox: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 48, justifyContent: 'center' },
  ltr: { writingDirection: 'ltr' },
  buttons: { flexDirection: 'row', gap: 8 },
  button: { flex: 1 },
});
