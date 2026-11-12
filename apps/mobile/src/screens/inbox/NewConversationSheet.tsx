/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the inbox "New"
 * sheet, a 1:1 port of `src/components/NewConversationPopup.tsx` as the kit's
 * bottom sheet (the web Dialog; README prop map). It is also the mobile web's
 * create-group flow: picking a second member switches it to group mode with
 * a prefilled, editable group name (NewConversationPopup.tsx:90-102). The web
 * `CreateGroupPopup` is mounted on phones but nothing on the mobile branch
 * opens it (MobileInboxEmptyState.tsx:19 ignores `onCreateGroup`), so it is
 * not ported (R1.1).
 *
 * Member search: the web RPCs only (`data/directory.ts`; the bot / test-actor
 * exclusion is inherited from them, NEVER rule 45). Start chat: a global DM
 * opens `/inbox/u/<member>`, a Network DM `/inbox/t/<thread>?context=tenant`,
 * a new group `/inbox/t/<thread>` — the conversation-chat lane's routes, by
 * path. `initialRecipientId` (a contact's "Message", Messages.tsx:572-583)
 * preselects that member from `profiles` (NewConversationPopup.tsx:62-88).
 * React 19: typed with `ReactElement`.
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View, type TextInput as RNTextInput } from 'react-native';
import { getSupabase } from '../../auth/client';
import { useAuth } from '../../auth/AuthProvider';
import { useTenant } from '../../identity/TenantProvider';
import { Avatar, Badge, BottomSheet, Button, Text, notify, notifyError, useUITheme } from '../../ports/ui';
import { InboxIcon, Input, Label } from '../../ports/inbox';
import { openWebPath } from '../../ports/links';
import { NoTenantContextError, createGlobalDm, createGlobalGroup, createTenantDm, searchDirectory, type DirectoryUser } from './data/directory';
import { useInboxText } from './text';

export const SEARCH_DEBOUNCE_MS = 300;

/** "Anna, Ben, Cleo..." — the web's prefilled group name. */
export function defaultGroupName(recipients: DirectoryUser[]): string {
  const names = recipients.map((r) => r.display_name || r.full_name).filter(Boolean) as string[];
  return names.slice(0, 3).join(', ') + (names.length > 3 ? '...' : '');
}

function dmErrorKey(message: string | undefined): string | undefined {
  if (!message) return undefined;
  if (message.includes('Access denied')) return 'inbox.toast.accessDenied';
  if (message.includes('community')) return 'inbox.toast.communityOnly';
  if (message.includes('Authentication')) return 'inbox.toast.pleaseLogin';
  return undefined;
}

export function NewConversationSheet({
  open,
  onClose,
  context,
  onGroupCreated,
  initialRecipientId,
  startAsGroup = false,
}: {
  open: boolean;
  onClose: () => void;
  context: 'global' | 'tenant';
  onGroupCreated?: () => void;
  initialRecipientId?: string | null;
  /** VTID-05674: opened from the Gruppen tab — start in group mode (name + members). */
  startAsGroup?: boolean;
}): ReactElement {
  const { colors } = useUITheme();
  const { t, fallbacks } = useInboxText();
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DirectoryUser[]>([]);
  const [selected, setSelected] = useState<DirectoryUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [groupMode, setGroupMode] = useState(false);
  const [groupName, setGroupName] = useState('');
  const groupNameRef = useRef<RNTextInput>(null);
  const searchSeq = useRef(0);

  // Pre-fill the recipient the caller picked (a contact's "Message").
  useEffect(() => {
    if (!open || !initialRecipientId) return undefined;
    let cancelled = false;
    void (async () => {
      const { data } = await getSupabase().from('profiles').select('user_id, display_name, avatar_url').eq('user_id', initialRecipientId).maybeSingle();
      if (cancelled) return;
      const row = data as { display_name?: string | null; avatar_url?: string | null } | null;
      const recipient: DirectoryUser = { user_id: initialRecipientId, display_name: row?.display_name || '', avatar_url: row?.avatar_url || undefined };
      setSelected((prev) => (prev.some((r) => r.user_id === initialRecipientId) ? prev : [recipient]));
    })();
    return () => {
      cancelled = true;
    };
  }, [open, initialRecipientId]);

  // VTID-05674: every open starts in the mode it was opened with, so state from a
  // previous open (or a tab switch) never carries over.
  useEffect(() => {
    if (!open) return;
    setGroupMode(startAsGroup);
    setGroupName('');
  }, [open, startAsGroup]);

  // More than one member → group mode with a prefilled name; back to one → direct.
  // In group mode from the Gruppen tab, the mode is fixed: the name is typed, not prefilled.
  useEffect(() => {
    if (startAsGroup) return;
    if (selected.length > 1 && !groupMode) {
      setGroupMode(true);
      if (!groupName) setGroupName(defaultGroupName(selected));
    } else if (selected.length <= 1 && groupMode) {
      setGroupMode(false);
      setGroupName('');
    }
  }, [selected, groupMode, groupName, startAsGroup]);

  useEffect(() => {
    if (!groupMode) return undefined;
    const id = setTimeout(() => groupNameRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [groupMode]);

  const runSearch = async (term: string) => {
    if (!term.trim() || !user) return;
    const seq = ++searchSeq.current;
    setSearching(true);
    try {
      const rows = await searchDirectory(getSupabase(), term, context, activeTenantId);
      if (seq === searchSeq.current) setResults(rows);
    } catch (e) {
      if (e instanceof NoTenantContextError) notifyError('inbox.toast.error', 'inbox.toast.noTenantContext');
      else notifyError('inbox.toast.error', 'inbox.toast.searchFailed');
    } finally {
      if (seq === searchSeq.current) setSearching(false);
    }
  };

  // Debounced auto-search from 2 characters.
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    const id = setTimeout(() => void runSearch(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runSearch reads the same inputs
  }, [query, context, activeTenantId, user?.id]);

  const reset = () => {
    onClose();
    setQuery('');
    setResults([]);
    setSelected([]);
    setGroupMode(startAsGroup);
    setGroupName('');
  };

  const add = (r: DirectoryUser) => {
    if (!selected.some((s) => s.user_id === r.user_id)) setSelected([...selected, r]);
    setQuery('');
    setResults([]);
  };

  const createDirect = async (recipientId: string) => {
    if (!user) {
      notifyError('inbox.toast.error', 'inbox.toast.authRequired');
      return;
    }
    setCreating(true);
    try {
      const sb = getSupabase();
      if (context === 'global') {
        await createGlobalDm(sb, recipientId);
        openWebPath(`/inbox/u/${encodeURIComponent(recipientId)}`);
      } else {
        const threadId = await createTenantDm(sb, recipientId, activeTenantId);
        openWebPath(`/inbox/t/${encodeURIComponent(threadId)}?context=tenant`);
      }
      notify('inbox.toast.success', 'inbox.toast.conversationStarted');
      reset();
    } catch (e) {
      notifyError('inbox.toast.error', dmErrorKey((e as Error)?.message));
    } finally {
      setCreating(false);
    }
  };

  const createGroup = async () => {
    if (!user || !groupName.trim() || selected.length === 0) return;
    // Tenant groups cannot be created from the client (VTID-04936) — fail before any write.
    if (context !== 'global') {
      notifyError('inbox.toast.error', 'inbox.toast.groupFailed');
      return;
    }
    setCreating(true);
    try {
      const threadId = await createGlobalGroup(getSupabase(), user.id, groupName, selected.map((r) => r.user_id));
      notify('inbox.toast.success', 'inbox.toast.groupCreated', { name: groupName });
      onGroupCreated?.();
      openWebPath(`/inbox/t/${encodeURIComponent(threadId)}`);
      reset();
    } catch {
      notifyError('inbox.toast.error', 'inbox.toast.groupFailed');
    } finally {
      setCreating(false);
    }
  };

  const start = () => {
    if (!user) return;
    if (groupMode) {
      if (!groupName.trim() || selected.length === 0) {
        notifyError('inbox.toast.error', 'inbox.toast.groupRecipientsRequired');
        return;
      }
      void createGroup();
      return;
    }
    if (selected.length !== 1) {
      notifyError('inbox.toast.error', 'inbox.toast.singleRecipientRequired');
      return;
    }
    void createDirect(selected[0].user_id);
  };

  const nameOf = (r: DirectoryUser) => r.display_name || r.full_name || '';
  const trimmed = query.trim();

  return (
    <BottomSheet testID="inbox-new-conversation" open={open} onClose={reset}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        <View style={styles.titleRow}>
          <InboxIcon name={groupMode ? 'Users' : 'User'} size={20} />
          <Text size="lg" weight="600" accessibilityRole="header" testID="inbox-new-title">
            {groupMode ? t('inbox.newConversation.titleGroup') : t('inbox.newConversation.title')}
          </Text>
        </View>

        {groupMode ? (
          <View style={styles.field}>
            <Label>{t('inbox.newConversation.groupName')}</Label>
            <Input
              ref={groupNameRef}
              testID="inbox-new-group-name"
              maxLength={80}
              value={groupName}
              onChangeText={setGroupName}
              placeholder={t('inbox.newConversation.groupNamePlaceholder')}
              selectTextOnFocus
            />
          </View>
        ) : null}

        {selected.length > 0 ? (
          <View style={styles.field}>
            <Label>{groupMode ? `${t('inbox.newConversation.members')} (${selected.length})` : t('inbox.newConversation.recipient')}</Label>
            <View style={styles.chips}>
              {selected.map((r) => (
                <Badge key={r.user_id} variant="secondary" testID={`inbox-new-selected-${r.user_id}`} style={styles.chip}>
                  <Avatar uri={r.avatar_url ?? undefined} fallback={nameOf(r)[0] || '?'} size={16} />
                  <Text size="xs">{nameOf(r)}</Text>
                  <Button
                    size="xs"
                    variant="ghost"
                    testID={`inbox-new-remove-${r.user_id}`}
                    accessibilityLabel={t('inboxNative.removeRecipient', { name: nameOf(r) })}
                    onPress={() => setSelected(selected.filter((s) => s.user_id !== r.user_id))}
                    style={styles.chipRemove}
                  >
                    <InboxIcon name="X" size={12} />
                  </Button>
                </Badge>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.field}>
          <Label>{groupMode ? t('inbox.newConversation.addMore') : t('inbox.newConversation.searchPeople')}</Label>
          <View style={[styles.searchBox, { borderColor: colors.input }]}>
            <InboxIcon name="Search" size={16} color={colors.mutedForeground} />
            <Input
              testID="inbox-new-search"
              placeholder={t('inbox.newConversation.searchPlaceholder')}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => void runSearch(query)}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.searchInput}
            />
            {searching ? <ActivityIndicator testID="inbox-new-searching" size="small" color={colors.mutedForeground} /> : null}
          </View>
          {trimmed.length > 0 && trimmed.length < 2 ? (
            <Text size="sm" muted>
              {t('inbox.newConversation.searchMinChars')}
            </Text>
          ) : null}
        </View>

        {results.length > 0 ? (
          <View style={styles.field} testID="inbox-new-results">
            <Label>{t('inbox.newConversation.searchResults')}</Label>
            {results.map((p) => {
              const added = selected.some((s) => s.user_id === p.user_id);
              return (
                <View key={p.user_id} testID={`inbox-new-result-${p.user_id}`} style={[styles.result, { borderColor: colors.border }]}>
                  <Avatar uri={p.avatar_url ?? undefined} fallback={nameOf(p)[0] || '?'} size={32} />
                  <View style={styles.fill}>
                    <Text weight="500" numberOfLines={1}>
                      {nameOf(p) || fallbacks.unknown}
                    </Text>
                    {p.bio ? (
                      <Text size="sm" muted numberOfLines={1}>
                        {p.bio}
                      </Text>
                    ) : null}
                  </View>
                  <Button size="sm" variant={added ? 'secondary' : 'default'} disabled={added} testID={`inbox-new-add-${p.user_id}`} onPress={() => add(p)}>
                    {added ? t('inbox.newConversation.added') : t('inbox.newConversation.add')}
                  </Button>
                </View>
              );
            })}
          </View>
        ) : null}

        {query && results.length === 0 && !searching ? (
          <Text size="sm" muted style={styles.center} testID="inbox-new-no-results">
            {t('inbox.newConversation.noResults')}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Button variant="outline" testID="inbox-new-cancel" disabled={creating} onPress={reset}>
            {t('inbox.newConversation.cancel')}
          </Button>
          <Button testID="inbox-new-start" disabled={creating || selected.length === 0 || (groupMode && !groupName.trim())} onPress={start}>
            {creating ? t('inbox.newConversation.creating') : groupMode ? t('inbox.newConversation.createGroup') : t('inbox.newConversation.startChat')}
          </Button>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16, paddingBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  field: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingEnd: 4 },
  chipRemove: { width: 16, height: 16, paddingHorizontal: 0, paddingVertical: 0 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  searchInput: { flex: 1, borderWidth: 0, paddingHorizontal: 0 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderRadius: 8 },
  fill: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center', paddingVertical: 16 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 16 },
});
