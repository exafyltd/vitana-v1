/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the DM
 * header's "Create group" (ConversationView.tsx:1283 / :1574), native twin of
 * web `src/components/messages/CreateGroupPopup.tsx` with the DM peer as the
 * first member: the avatar placeholder ("Group pictures are coming soon"),
 * group name, the members (removable), "Add members" searching the directory
 * (`search_global_directory` / `search_tenant_directory`, the same RPCs and
 * server-side exclusions as the members modal), Cancel / Create group with the
 * web's checks and toasts (name required, members required, duplicate within
 * a minute, created, failed). On success the new group thread opens.
 * The web popup is shared with the inbox list; this is the conversation's own
 * twin (screens/chat), the inbox list keeps its own.
 */
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, notify, notifyError, Text, TextInput, useUITheme } from '../../ports/ui';
import { ChatIcon, Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ports/chat';
import { useI18n } from '../../i18n/I18nProvider';
import { searchDirectory, type MemberContext, type SearchUser } from './data/members';
import { createGlobalGroupThread, fetchMyNoticeName, isDuplicateGroup } from './data/createGroup';

type Member = { user_id: string; display_name: string; avatar_url?: string | null };

export function CreateGroupSheet({
  open,
  onClose,
  context,
  userId,
  tenantId,
  initialMembers,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  context: MemberContext;
  userId?: string;
  tenantId?: string | null;
  initialMembers: Member[];
  onCreated?: (threadId: string) => void;
}) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [name, setName] = useState('');
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) setMembers(initialMembers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const search = async (value: string) => {
    setTerm(value);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    try {
      setResults(await searchDirectory(value, context, tenantId));
    } catch {
      setResults([]);
    }
  };

  const add = (u: SearchUser) => {
    if (!members.find((m) => m.user_id === u.user_id)) setMembers([...members, { user_id: u.user_id, display_name: u.display_name || u.full_name || '', avatar_url: u.avatar_url }]);
    setTerm('');
    setResults([]);
  };

  const create = async () => {
    if (!name.trim()) {
      notifyError('inbox.createGroup.groupNameRequired', 'inbox.createGroup.groupNameRequiredDesc');
      return;
    }
    if (members.length === 0) {
      notifyError('inbox.createGroup.addMembersRequired', 'inbox.createGroup.addMembersRequiredDesc');
      return;
    }
    if (context !== 'global' || !userId) {
      notifyError('inbox.createGroup.failed', 'inbox.createGroup.failedDesc');
      return;
    }
    setCreating(true);
    try {
      const ids = members.map((m) => m.user_id);
      if (await isDuplicateGroup(ids, userId)) {
        notifyError('inbox.createGroup.groupExists', 'inbox.createGroup.groupExistsDesc');
        return;
      }
      const threadId = await createGlobalGroupThread({ userId, userName: await fetchMyNoticeName(userId), name, memberIds: ids });
      notify('inbox.createGroup.created', 'inbox.createGroup.createdDesc', { name });
      onCreated?.(threadId);
      onClose();
      setName('');
      setMembers(initialMembers);
      setTerm('');
      setResults([]);
    } catch {
      notifyError('inbox.createGroup.failed', 'inbox.createGroup.failedDesc');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => (next ? undefined : onClose())}>
      <DialogContent testID="create-group-sheet">
        <DialogHeader>
          <DialogTitle>{t('inbox.createGroup.title')}</DialogTitle>
        </DialogHeader>
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <Pressable onPress={() => notify('inbox.createGroup.avatarSoon')} accessibilityRole="button" accessibilityLabel={t('inbox.createGroup.avatarSoon')} style={[styles.avatar, { backgroundColor: colors.muted }]} testID="create-group-avatar">
              <ChatIcon name="Users" size={24} color={colors.mutedForeground} />
            </Pressable>
            <Text style={styles.bold}>{t('inbox.createGroup.groupName')}</Text>
            <TextInput value={name} onChangeText={setName} placeholder={t('inbox.newConversation.groupNamePlaceholder')} testID="create-group-name" />
            <Text style={styles.bold}>
              {t('inbox.newConversation.members')} ({members.length})
            </Text>
            <View style={styles.wrap}>
              {members.map((m) => (
                <View key={m.user_id} style={[styles.member, { backgroundColor: colors.secondary }]} testID={`create-group-member-${m.user_id}`}>
                  <Avatar uri={m.avatar_url} fallback={(m.display_name[0] || 'U').toUpperCase()} size={20} />
                  <Text style={styles.small}>{m.display_name}</Text>
                  <Pressable onPress={() => setMembers(members.filter((x) => x.user_id !== m.user_id))} accessibilityRole="button" accessibilityLabel={t('chatNative.composer.removeFile', { name: m.display_name })} style={styles.x} testID={`create-group-remove-${m.user_id}`}>
                    <ChatIcon name="X" size={12} />
                  </Pressable>
                </View>
              ))}
            </View>
            <Text style={styles.bold}>{t('inbox.createGroup.addMembers')}</Text>
            <TextInput value={term} onChangeText={(v) => void search(v)} placeholder={t('inbox.createGroup.searchPlaceholder')} testID="create-group-search" />
            {results.map((u) => (
              <Pressable key={u.user_id} onPress={() => add(u)} accessibilityRole="button" style={styles.result} testID={`create-group-result-${u.user_id}`}>
                <Avatar uri={u.avatar_url} fallback={((u.display_name || u.full_name || 'U')[0] || 'U').toUpperCase()} size={32} />
                <Text>{u.display_name || u.full_name}</Text>
              </Pressable>
            ))}
            <View style={styles.row}>
              <Button variant="outline" onPress={onClose} disabled={creating} style={styles.flex}>
                {t('inbox.newConversation.cancel')}
              </Button>
              <Button onPress={() => void create()} disabled={creating || !name.trim() || members.length === 0} style={styles.flex} testID="create-group-submit">
                {creating ? t('inbox.newConversation.creating') : t('inbox.newConversation.createGroup')}
              </Button>
            </View>
          </View>
        </ScrollView>
      </DialogContent>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 520 },
  form: { gap: 8 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  bold: { fontWeight: '600' },
  small: { fontSize: 13 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingStart: 4, paddingEnd: 2, paddingVertical: 2 },
  x: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  result: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  flex: { flex: 1 },
});
