/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the group
 * members / rename panel of a legacy group thread, native twin of web
 * `src/components/messages/GroupMembersModal.tsx` (a Dialog over the phone
 * chat): the group name (the creator can rename it), "Group Members (n)" with
 * Leave Group for non-admins, the add-member search for admins/moderators
 * (the directory RPCs only — rule 45 is enforced server-side, see
 * data/members.ts) and the member list with role badges and Remove.
 */
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Badge, Button, notify, notifyError, Text, TextInput, useUITheme } from '../../ports/ui';
import { ChatIcon, Dialog, DialogContent, DialogHeader, DialogTitle, noticeName } from '../../ports/chat';
import { useI18n } from '../../i18n/I18nProvider';
import { addMember, fetchParticipants, leaveGroup, removeMember, renameGroup, searchDirectory, type GroupParticipant, type MemberContext, type SearchUser } from './data/members';

const ROLE_ICON: Record<string, string> = { admin: 'Crown', moderator: 'Shield' };

export function GroupMembersModal({
  open,
  onClose,
  threadId,
  userId,
  tenantId,
  context = 'global',
  currentUserRole = 'member',
  groupName,
  createdBy,
}: {
  open: boolean;
  onClose: () => void;
  threadId: string;
  userId?: string;
  tenantId?: string | null;
  context?: MemberContext;
  currentUserRole?: string;
  groupName?: string | null;
  createdBy?: string | null;
}) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [title, setTitle] = useState(groupName ?? '');
  const [editingName, setEditingName] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const canRename = context === 'global' && !!userId && createdBy === userId;
  const canManage = currentUserRole === 'admin' || currentUserRole === 'moderator';
  const myName = noticeName(participants.find((p) => p.user_id === userId)?.profile);

  useEffect(() => setTitle(groupName ?? ''), [groupName]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setParticipants(await fetchParticipants(threadId));
    } catch {
      notifyError('toasts.messages.failedLoadMembers', 'toasts.messages.pleaseTryAgain');
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    if (open && threadId) void load();
  }, [open, threadId, load]);

  const search = async (next: string) => {
    setTerm(next);
    if (!next.trim()) {
      setResults([]);
      return;
    }
    try {
      const rows = await searchDirectory(next, context, tenantId);
      const existing = new Set(participants.map((p) => p.user_id));
      setResults(rows.filter((u) => !existing.has(u.user_id)));
    } catch {
      setResults([]);
    }
  };

  const onAdd = async (u: SearchUser) => {
    if (!canManage) return;
    try {
      await addMember(threadId, userId, myName, u);
      notify('toasts.messages.memberAdded');
      setTerm('');
      setResults([]);
      void load();
    } catch {
      notifyError('toasts.messages.failedAddMember', 'toasts.messages.pleaseTryAgain');
    }
  };

  const onRemove = async (p: GroupParticipant, name: string) => {
    if (!canManage || p.user_id === userId) return;
    try {
      await removeMember(threadId, userId, myName, p, name);
      setMenuFor(null);
      notify('toasts.messages.memberRemoved');
      void load();
    } catch {
      notifyError('toasts.messages.failedRemoveMember', 'toasts.messages.pleaseTryAgain');
    }
  };

  const onLeave = async () => {
    const mine = participants.find((p) => p.user_id === userId);
    if (!mine) return;
    try {
      await leaveGroup(threadId, userId, mine);
      notify('toasts.messages.leftGroup', 'toasts.messages.youHaveLeftGroupYouCan');
      onClose();
    } catch {
      notifyError('toasts.messages.failedLeaveGroup', 'toasts.messages.pleaseTryAgain');
    }
  };

  const saveName = async () => {
    const next = draft.trim();
    if (next.length < 1 || next.length > 80) {
      notifyError('toasts.messages.failedRenameGroup', 'toasts.messages.groupNameInvalid');
      return;
    }
    if (next === title) {
      setEditingName(false);
      return;
    }
    setSaving(true);
    try {
      await renameGroup(threadId, userId, myName, next);
      setTitle(next);
      setEditingName(false);
      notify('toasts.messages.groupRenamed');
    } catch {
      notifyError('toasts.messages.failedRenameGroup', 'toasts.messages.pleaseTryAgain');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => (next ? undefined : onClose())}>
      <DialogContent testID="group-members-modal">
        {title || canRename ? (
          <View style={styles.titleRow}>
            {editingName ? (
              <>
                <View style={styles.fill}>
                  <TextInput value={draft} onChangeText={setDraft} maxLength={80} editable={!saving} accessibilityLabel={t('screens.messages.groupNameLabel')} testID="group-name-input" />
                </View>
                <Button size="icon" variant="ghost" onPress={() => void saveName()} disabled={saving} accessibilityLabel={t('screens.messages.groupNameSave')} testID="group-name-save">
                  <ChatIcon name="Check" />
                </Button>
                <Button size="icon" variant="ghost" onPress={() => setEditingName(false)} disabled={saving} accessibilityLabel={t('screens.messages.groupNameCancel')}>
                  <ChatIcon name="X" />
                </Button>
              </>
            ) : (
              <>
                <Text style={[styles.fill, styles.title]} numberOfLines={1} testID="group-title">
                  {title}
                </Text>
                {canRename ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    onPress={() => {
                      setDraft(title);
                      setEditingName(true);
                    }}
                    accessibilityLabel={t('screens.messages.renameGroup')}
                    testID="group-rename"
                  >
                    <ChatIcon name="Pencil" />
                  </Button>
                ) : null}
              </>
            )}
          </View>
        ) : null}
        <DialogHeader>
          <View style={styles.headerRow}>
            <DialogTitle>{t('screens.messages.groupMembersLength', { length: participants.length })}</DialogTitle>
            {currentUserRole !== 'admin' ? (
              <Button variant="outline" size="sm" onPress={() => void onLeave()} testID="group-leave">
                {t('screens.messages.leaveGroup')}
              </Button>
            ) : null}
          </View>
        </DialogHeader>
        {canManage ? (
          <View style={styles.search}>
            <TextInput value={term} onChangeText={(v) => void search(v)} placeholder={t('screens.messages.searchUsersAdd')} accessibilityLabel={t('screens.messages.searchUsersAdd')} testID="group-member-search" />
            {results.length > 0 ? (
              <View style={[styles.results, { borderColor: colors.border }]} testID="group-member-results">
                {results.map((u) => (
                  <Pressable key={u.user_id} onPress={() => void onAdd(u)} accessibilityRole="button" style={styles.resultRow} testID={`group-member-result-${u.user_id}`}>
                    <Avatar uri={u.avatar_url} fallback={(u.display_name?.[0] || u.full_name?.[0] || '?').toUpperCase()} size={24} />
                    <Text style={styles.fill} numberOfLines={1}>
                      {u.display_name || u.full_name}
                    </Text>
                    <ChatIcon name="UserPlus" color={colors.mutedForeground} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
        <ScrollView style={styles.list} testID="group-member-list">
          {loading ? (
            <Text muted style={styles.center}>
              {t('screens.messages.loadingMembers')}
            </Text>
          ) : (
            participants.map((p) => {
              const name = noticeName(p.profile) || 'Unknown';
              const me = p.user_id === userId;
              return (
                <View key={p.id} style={styles.memberRow} testID={`group-member-${p.user_id}`}>
                  <Avatar uri={p.profile?.avatar_url} fallback={(name[0] ?? '?').toUpperCase()} size={40} />
                  <View style={styles.fill}>
                    <View style={styles.nameRow}>
                      <Text style={styles.bold} numberOfLines={1}>
                        {name}
                        {me ? ` ${t('screens.messages.you')}` : ''}
                      </Text>
                      <ChatIcon name={ROLE_ICON[p.role] ?? 'User'} color={p.role === 'admin' ? colors.statusWarning : p.role === 'moderator' ? colors.statusInfo : colors.mutedForeground} />
                    </View>
                    <Badge variant={p.role === 'admin' ? 'default' : p.role === 'moderator' ? 'secondary' : 'outline'}>{p.role}</Badge>
                  </View>
                  {canManage && !me ? (
                    menuFor === p.id ? (
                      <Button variant="ghost" size="sm" onPress={() => void onRemove(p, name)} testID={`group-member-remove-${p.user_id}`}>
                        <ChatIcon name="UserMinus" color={colors.destructive} />
                        <Text style={{ color: colors.destructive }}>{t('screens.messages.removeFromGroup')}</Text>
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" onPress={() => setMenuFor(p.id)} accessibilityLabel={t('screens.messages.removeFromGroup')} testID={`group-member-menu-${p.user_id}`}>
                        <ChatIcon name="MoreHorizontal" />
                      </Button>
                    )
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      </DialogContent>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingEnd: 32 },
  title: { fontSize: 18, fontWeight: '600' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  search: { gap: 8 },
  results: { borderWidth: 1, borderRadius: 8, padding: 8, maxHeight: 120 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 4 },
  list: { maxHeight: 256 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bold: { fontWeight: '500' },
  center: { textAlign: 'center', paddingVertical: 16 },
});
