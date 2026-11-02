/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the inbox's
 * Contacts pill (web VTID-04440, Messages.tsx:1351-1394), native twin of
 * `src/components/contacts/ContactsTabContent.tsx` with its parts:
 *  - "Add contact" and "Find Friends" (`ImportContactsButton` →
 *    `ContactSyncModal`, ./FindFriendsSheet) side by side; the empty state
 *    offers Find Friends first, then "Add your first contact";
 *  - "Add contact" (`AddContactDialog`: member search through the directory
 *    RPCs for the member's mode, or manual name / phone / e-mail),
 *  - the contact search (name, phone, e-mail) once there are contacts,
 *  - "On VITANA (n)" rows with Message (→ `onStartConversation`) and
 *    "Invite to VITANA (n)" rows with Invite (`InviteContactButton`: WhatsApp /
 *    SMS / e-mail / share with the member's invite link, then marked invited),
 *    both with Delete behind a confirmation (`ContactListItem`),
 *  - "Remove contacts imported from my phone" when any came from the phone,
 *  - the empty state and the "no contacts matching" state, a spinner while
 *    the first read runs.
 * Data: `./data/contacts` (class-B hooks re-implemented natively). RTL-safe
 * (logical start/end; numbers and addresses stay LTR). React 19: `ReactElement`.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, BottomSheet, Button, Card, PressableRow, Spinner, Text, notify, notifyError, useUITheme } from '../../ports/ui';
import {
  InboxButtonIcon,
  InboxIcon,
  Input,
  Label,
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogDescription,
  ResponsiveConfirmDialogFooter,
  ResponsiveConfirmDialogHeader,
  ResponsiveConfirmDialogTitle,
  copyToClipboard,
  openExternalUrl,
  shareText,
} from '../../ports/inbox';
import { getSupabase } from '../../auth/client';
import { useAuth } from '../../auth/AuthProvider';
import { useTenant } from '../../identity/TenantProvider';
import { useRole } from '../../identity/useRole';
import { useInboxText } from './text';
import { FindFriendsButton } from './FindFriendsSheet';
import { searchDirectory, type DirectoryUser } from './data/directory';
import {
  availableChannels,
  contactDisplay,
  fetchMyInviteLink,
  inviteUrl,
  markContactInvited,
  removeDeviceContacts,
  useContacts,
  type Contact,
  type InviteChannel,
  type InviteTarget,
  type NewContact,
} from './data/contacts';

const CHANNEL_ICON: Record<InviteChannel, string> = { whatsapp: 'MessageCircle', sms: 'MessageSquare', email: 'Mail', share: 'Share2' };
const ADD_SEARCH_DEBOUNCE_MS = 300;

export function ContactsTab({ onStartConversation }: { onStartConversation: (userId: string) => void }): ReactElement {
  const { colors } = useUITheme();
  const { t } = useInboxText();
  const { contacts, platformContacts, nonPlatformContacts, isLoading, addContact, deleteContact, searchContacts, refetch } = useContacts();
  const [showAdd, setShowAdd] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Contact | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [inviteFor, setInviteFor] = useState<InviteTarget | null>(null);
  const toTarget = (c: Contact): InviteTarget => ({ id: c.id, name: c.contact_name, phone: c.contact_phone, phoneE164: c.metadata?.phones_e164?.[0] ?? null, email: c.contact_email });
  const renderInvite = (target: InviteTarget | null, onClose: () => void, onInvited: (id: string) => void) => (
    <InviteSheet
      target={target}
      onClose={onClose}
      onInvited={(id) => {
        onInvited(id);
        void refetch();
      }}
    />
  );

  const hasPhoneContacts = contacts.some((c) => c.source === 'android');
  const matched = query ? searchContacts(query) : null;
  const onPlatform = matched ? matched.filter((c) => c.is_on_platform) : platformContacts;
  const toInvite = matched ? matched.filter((c) => !c.is_on_platform) : nonPlatformContacts;

  const removePhoneContacts = async () => {
    try {
      await removeDeviceContacts();
      notify('mailhub.findFriends.remove.done');
      await refetch();
    } catch {
      notifyError('mailhub.findFriends.errors.unknown.title');
    }
  };

  if (isLoading && contacts.length === 0) {
    return (
      <View testID="contacts-loading" style={styles.loading}>
        <Spinner accessibilityLabel={t('loading.default')} />
      </View>
    );
  }

  return (
    <View testID="contacts-tab" style={styles.tab}>
      <View style={styles.actions}>
        <Button testID="contacts-add" onPress={() => setShowAdd(true)} style={styles.action}>
          <InboxButtonIcon name="Plus" />
          {t('screens.contacts.addContact')}
        </Button>
        <View style={styles.action}>
          <FindFriendsButton onImportComplete={() => void refetch()} renderInvite={renderInvite} />
        </View>
      </View>

      {contacts.length > 0 ? (
        searchOpen ? (
          <View style={[styles.searchBox, { borderColor: colors.input }]}>
            <InboxIcon name="Search" size={16} color={colors.mutedForeground} />
            <Input testID="contacts-search-input" autoFocus value={query} onChangeText={setQuery} placeholder={t('screens.contacts.searchContactsByNamePhone')} style={styles.searchInput} />
            <Button
              size="xs"
              variant="ghost"
              testID="contacts-search-close"
              accessibilityLabel={t('inboxNative.searchClose')}
              onPress={() => {
                setQuery('');
                setSearchOpen(false);
              }}
            >
              <InboxIcon name="X" size={12} />
            </Button>
          </View>
        ) : (
          <PressableRow testID="contacts-search" onPress={() => setSearchOpen(true)} style={[styles.searchPill, { backgroundColor: colors.muted }]}>
            <InboxIcon name="Search" size={16} color={colors.mutedForeground} />
            <Text size="sm">{t('actionBar.search')}</Text>
          </PressableRow>
        )
      ) : null}

      {contacts.length === 0 ? (
        <View testID="contacts-empty" style={styles.empty}>
          <InboxIcon name="Users" size={48} color={colors.mutedForeground} />
          <Text size="lg" weight="600" style={styles.center}>
            {t('screens.contacts.noContactsYet')}
          </Text>
          <Text muted style={styles.center}>
            {t('screens.contacts.addContactsEasilyFindMessageThem')}
          </Text>
          <FindFriendsButton size="lg" testID="find-friends-button-empty" onImportComplete={() => void refetch()} renderInvite={renderInvite} />
          <Button variant="ghost" testID="contacts-add-first" onPress={() => setShowAdd(true)}>
            <InboxButtonIcon name="Plus" />
            {t('screens.contacts.addYourFirstContact')}
          </Button>
        </View>
      ) : (
        <View style={styles.sections}>
          {onPlatform.length > 0 ? (
            <View testID="contacts-on-platform" style={styles.section}>
              <Text size="sm" weight="600" muted style={styles.sectionTitle}>
                {t('screens.contacts.vitanaLength', { length: onPlatform.length }).toUpperCase()}
              </Text>
              {onPlatform.map((c) => (
                <ContactRow key={c.id} contact={c} onMessage={onStartConversation} onDelete={() => setPendingDelete(c)} />
              ))}
            </View>
          ) : null}
          {toInvite.length > 0 ? (
            <View testID="contacts-to-invite" style={styles.section}>
              <Text size="sm" weight="600" muted style={styles.sectionTitle}>
                {t('screens.contacts.inviteVitanaLength', { length: toInvite.length }).toUpperCase()}
              </Text>
              {toInvite.map((c) => (
                <ContactRow key={c.id} contact={c} onInvite={() => setInviteFor(toTarget(c))} onDelete={() => setPendingDelete(c)} />
              ))}
            </View>
          ) : null}
          {hasPhoneContacts && !query ? (
            <View style={styles.removeRow}>
              <Button variant="ghost" size="sm" testID="remove-phone-contacts" onPress={() => setRemoveOpen(true)}>
                <InboxButtonIcon name="Trash2" size={14} />
                {t('mailhub.findFriends.remove.button')}
              </Button>
            </View>
          ) : null}
          {query && onPlatform.length === 0 && toInvite.length === 0 ? (
            <Text muted style={[styles.center, styles.noMatch]} testID="contacts-no-match">
              {t('screens.contacts.noContactsFoundMatchingSearchquery', { searchQuery: query })}
            </Text>
          ) : null}
        </View>
      )}

      <ResponsiveConfirmDialog open={!!pendingDelete} onOpenChange={(o) => (o ? undefined : setPendingDelete(null))}>
        <ResponsiveConfirmDialogContent testID="contacts-delete-dialog">
          <ResponsiveConfirmDialogHeader>
            <ResponsiveConfirmDialogTitle>{t('screens.contacts.deleteContact')}</ResponsiveConfirmDialogTitle>
            <ResponsiveConfirmDialogDescription>
              {t('screens.contacts.youSureYouWantDeleteDisplayname', { displayName: pendingDelete ? contactDisplay(pendingDelete).name : '' })}
            </ResponsiveConfirmDialogDescription>
          </ResponsiveConfirmDialogHeader>
          <ResponsiveConfirmDialogFooter>
            <ResponsiveConfirmDialogCancel>{t('screens.contacts.cancel')}</ResponsiveConfirmDialogCancel>
            <ResponsiveConfirmDialogAction testID="contacts-delete-confirm" variant="destructive" onPress={() => (pendingDelete ? void deleteContact(pendingDelete.id) : undefined)}>
              {t('screens.contacts.delete')}
            </ResponsiveConfirmDialogAction>
          </ResponsiveConfirmDialogFooter>
        </ResponsiveConfirmDialogContent>
      </ResponsiveConfirmDialog>

      <ResponsiveConfirmDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <ResponsiveConfirmDialogContent testID="contacts-remove-dialog">
          <ResponsiveConfirmDialogHeader>
            <ResponsiveConfirmDialogTitle>{t('mailhub.findFriends.remove.confirmTitle')}</ResponsiveConfirmDialogTitle>
            <ResponsiveConfirmDialogDescription>{t('mailhub.findFriends.remove.confirmBody')}</ResponsiveConfirmDialogDescription>
          </ResponsiveConfirmDialogHeader>
          <ResponsiveConfirmDialogFooter>
            <ResponsiveConfirmDialogCancel>{t('screens.contacts.cancel')}</ResponsiveConfirmDialogCancel>
            <ResponsiveConfirmDialogAction testID="contacts-remove-confirm" variant="destructive" onPress={() => void removePhoneContacts()}>
              {t('mailhub.findFriends.remove.confirm')}
            </ResponsiveConfirmDialogAction>
          </ResponsiveConfirmDialogFooter>
        </ResponsiveConfirmDialogContent>
      </ResponsiveConfirmDialog>

      <InviteSheet target={inviteFor} onClose={() => setInviteFor(null)} onInvited={() => void refetch()} />
      <AddContactSheet open={showAdd} onClose={() => setShowAdd(false)} onAdd={addContact} />
    </View>
  );
}

function ContactRow({ contact, onMessage, onInvite, onDelete }: { contact: Contact; onMessage?: (userId: string) => void; onInvite?: () => void; onDelete: () => void }): ReactElement {
  const { colors } = useUITheme();
  const { t, fmtDate } = useInboxText();
  const { name, avatarUrl, info } = contactDisplay(contact);
  return (
    <Card testID={`contact-${contact.id}`} style={styles.row}>
      <Avatar uri={avatarUrl} fallback={name?.[0]?.toUpperCase() || '?'} size={40} />
      <View style={styles.rowBody}>
        <View style={styles.rowName}>
          <Text size="sm" weight="500" numberOfLines={1} style={styles.shrink}>
            {name}
          </Text>
          {contact.is_on_platform ? (
            <View accessibilityLabel={t('screens.contacts.vitana')} style={[styles.badge, { backgroundColor: colors.secondary }]}>
              <InboxIcon name="CheckCircle2" size={12} color={colors.secondaryForeground} />
            </View>
          ) : null}
        </View>
        {info ? (
          <Text size="sm" muted numberOfLines={1} style={styles.ltr}>
            {info}
          </Text>
        ) : null}
        {contact.invite_sent_at && !contact.is_on_platform ? (
          <Text size="xs" muted>
            {t('screens.contacts.invitedValue0', { value0: fmtDate(contact.invite_sent_at) })}
          </Text>
        ) : null}
      </View>
      <View style={styles.rowActions}>
        {onMessage && contact.is_on_platform && contact.contact_user_id ? (
          <Button size="sm" testID={`contact-${contact.id}-message`} accessibilityLabel={t('screens.contacts.message')} onPress={() => onMessage(contact.contact_user_id as string)}>
            <InboxButtonIcon name="MessageSquare" />
          </Button>
        ) : null}
        {onInvite ? (
          <Button
            size="sm"
            variant={contact.invite_sent_at ? 'ghost' : 'outline'}
            testID={`invite-contact-${contact.id}`}
            accessibilityLabel={t(contact.invite_sent_at ? 'mailhub.findFriends.results.invited' : 'mailhub.findFriends.results.invite')}
            onPress={onInvite}
          >
            <InboxButtonIcon name="Send" />
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" testID={`contact-${contact.id}-delete`} accessibilityLabel={t('screens.contacts.delete')} onPress={onDelete}>
          <InboxIcon name="Trash2" size={16} color={colors.destructive} />
        </Button>
      </View>
    </Card>
  );
}

/** `InviteContactButton`'s channel menu: the member's own app opens with their invite link in the text. */
function InviteSheet({ target, onClose, onInvited }: { target: InviteTarget | null; onClose: () => void; onInvited: (id: string) => void }): ReactElement {
  const { t } = useInboxText();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const invite = async (channel: InviteChannel) => {
    if (!user?.id || !target || busy) return;
    setBusy(true);
    try {
      let link: string;
      try {
        link = await fetchMyInviteLink(user.id);
      } catch {
        notifyError('mailhub.findFriends.invite.linkFailed');
        return;
      }
      const firstName = target.name.split(' ')[0] || target.name;
      const message = t('mailhub.findFriends.invite.message', { name: firstName, link });
      let opened = true;
      if (channel === 'share') {
        try {
          opened = await shareText(message);
        } catch {
          copyToClipboard(message);
        }
      } else {
        const url = inviteUrl(channel, target, message);
        if (url) await openExternalUrl(url);
        else opened = false;
      }
      if (!opened) return;
      await markContactInvited(user.id, target.id).catch(() => undefined);
      onInvited(target.id);
      notify('mailhub.findFriends.invite.opened');
      onClose();
    } catch {
      notifyError('mailhub.findFriends.errors.unknown.title');
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet testID="contacts-invite-sheet" open={!!target} onClose={onClose} title={t('screens.contacts.sendInviteVia')}>
      {target
        ? availableChannels(target).map((channel) => (
            <PressableRow key={channel} testID={`invite-channel-${channel}`} disabled={busy} onPress={() => void invite(channel)} style={styles.channel}>
              <InboxIcon name={CHANNEL_ICON[channel]} size={16} />
              <Text>{t(`mailhub.findFriends.invite.${channel}`)}</Text>
            </PressableRow>
          ))
        : null}
    </BottomSheet>
  );
}

/** `AddContactDialog`: pick a member from the directory search, or add a name / phone / e-mail by hand. */
function AddContactSheet({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (c: NewContact) => Promise<unknown> }): ReactElement {
  const { colors } = useUITheme();
  const { t } = useInboxText();
  const { dbRole } = useRole();
  const { activeTenantId } = useTenant();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DirectoryUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<DirectoryUser | null>(null);
  const [manual, setManual] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const seq = useRef(0);

  const reset = useCallback(() => {
    setQuery('');
    setResults([]);
    setSelected(null);
    setManual(false);
    setName('');
    setPhone('');
    setEmail('');
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (!query || manual || selected || query.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    const id = setTimeout(() => {
      const mine = ++seq.current;
      setSearching(true);
      searchDirectory(getSupabase(), query, dbRole === 'community' ? 'global' : 'tenant', activeTenantId)
        .then((rows) => (mine === seq.current ? setResults(rows) : undefined))
        .catch(() => (mine === seq.current ? setResults([]) : undefined))
        .finally(() => (mine === seq.current ? setSearching(false) : undefined));
    }, ADD_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query, manual, selected, dbRole, activeTenantId]);

  const nameOf = (u: DirectoryUser) => u.display_name || u.full_name || '';
  const canSubmit = useMemo(() => (selected ? true : manual && !!name.trim()), [selected, manual, name]);

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      if (selected) await onAdd({ contact_name: nameOf(selected) || 'Unknown', contact_user_id: selected.user_id });
      else await onAdd({ contact_name: name.trim(), contact_phone: phone.trim() || undefined, contact_email: email.trim() || undefined });
      reset();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet testID="contacts-add-sheet" open={open} onClose={onClose} title={t('screens.contacts.addContact')}>
      <View style={styles.form}>
        <Text size="sm" muted>
          {t('screens.contacts.searchForVitanaUsersAddManually')}
        </Text>
        {!manual ? (
          <>
            <View style={styles.field}>
              <Label>{t('screens.contacts.searchVitanaUsers')}</Label>
              <View style={[styles.searchBox, { borderColor: colors.input }]}>
                <InboxIcon name="Search" size={16} color={colors.mutedForeground} />
                <Input testID="contacts-add-search" value={query} editable={!selected} onChangeText={setQuery} placeholder={t('screens.contacts.typeNameEmailPhone')} style={styles.searchInput} />
                {searching ? <Spinner accessibilityLabel={t('loading.default')} /> : null}
              </View>
              {results.length > 0 && !selected ? (
                <View testID="contacts-add-results" style={[styles.results, { borderColor: colors.border, backgroundColor: colors.popover }]}>
                  {results.map((r) => (
                    <PressableRow
                      key={r.user_id}
                      testID={`contacts-add-result-${r.user_id}`}
                      onPress={() => {
                        setSelected(r);
                        setQuery(nameOf(r));
                        setResults([]);
                      }}
                      style={styles.result}
                    >
                      <Avatar uri={r.avatar_url ?? undefined} fallback={nameOf(r)[0] || '?'} size={32} />
                      <Text weight="500">{nameOf(r)}</Text>
                    </PressableRow>
                  ))}
                </View>
              ) : null}
              {selected ? (
                <View testID="contacts-add-selected" style={[styles.selected, { backgroundColor: colors.muted }]}>
                  <Avatar uri={selected.avatar_url ?? undefined} fallback={nameOf(selected)[0] || '?'} size={40} />
                  <Text weight="500" style={styles.shrink}>
                    {nameOf(selected)}
                  </Text>
                  <Button
                    size="sm"
                    variant="ghost"
                    accessibilityLabel={t('inboxNative.removeRecipient', { name: nameOf(selected) })}
                    onPress={() => {
                      setSelected(null);
                      setQuery('');
                    }}
                  >
                    <InboxIcon name="X" size={16} />
                  </Button>
                </View>
              ) : null}
            </View>
            {!selected ? (
              <Button variant="link" size="sm" testID="contacts-add-manual" onPress={() => setManual(true)}>
                {t('screens.contacts.canTFindThemAddManually')}
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <View style={styles.field}>
              <Label>{`${t('screens.contacts.name')} *`}</Label>
              <Input testID="contacts-add-name" autoFocus value={name} onChangeText={setName} placeholder={t('screens.contacts.johnDoe')} />
            </View>
            <View style={styles.field}>
              <Label>{t('screens.contacts.phoneNumber')}</Label>
              <Input testID="contacts-add-phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholder="+1 234 567 8900" style={styles.ltr} />
            </View>
            <View style={styles.field}>
              <Label>{t('screens.contacts.emailAddress')}</Label>
              <Input testID="contacts-add-email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} placeholder={t('screens.contacts.johnExampleCom')} style={styles.ltr} />
            </View>
            <Button variant="link" size="sm" testID="contacts-add-search-instead" onPress={() => setManual(false)}>
              {t('screens.contacts.searchUsersInstead')}
            </Button>
          </>
        )}
        <View style={styles.footer}>
          <Button variant="outline" disabled={submitting} onPress={onClose} style={styles.footerButton}>
            {t('screens.contacts.cancel')}
          </Button>
          <Button testID="contacts-add-submit" disabled={!canSubmit || submitting} onPress={() => void submit()} style={styles.footerButton}>
            {submitting ? t('screens.contacts.adding') : t('screens.contacts.addContact')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  tab: { gap: 12 },
  loading: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, minHeight: 40 },
  center: { textAlign: 'center' },
  searchPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, height: 36, paddingHorizontal: 10, borderRadius: 18 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10 },
  searchInput: { flex: 1, borderWidth: 0, paddingHorizontal: 0 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  sections: { gap: 24, paddingBottom: 16 },
  section: { gap: 8 },
  sectionTitle: { paddingHorizontal: 4, letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  rowName: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shrink: { flexShrink: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  ltr: { writingDirection: 'ltr' },
  removeRow: { alignItems: 'center', paddingTop: 8 },
  noMatch: { paddingVertical: 48 },
  channel: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 4 },
  form: { gap: 16, paddingBottom: 16 },
  field: { gap: 8 },
  results: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  selected: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8 },
  footer: { flexDirection: 'row', gap: 8 },
  footerButton: { flex: 1 },
});
