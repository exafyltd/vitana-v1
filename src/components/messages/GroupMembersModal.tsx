import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, UserPlus, UserMinus, Crown, Shield, User, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface Participant {
  id: string;
  user_id: string;
  role: string;
  profile?: {
    display_name?: string;
    full_name?: string;
    avatar_url?: string;
    email?: string;
  };
}

interface SearchUser {
  user_id: string;
  display_name: string;
  full_name?: string;
  avatar_url?: string;
  email: string;
}

interface GroupMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadId: string;
  context: 'global' | 'tenant';
  currentUserRole?: string;
}

export default function GroupMembersModal({
  open,
  onOpenChange,
  threadId,
  context,
  currentUserRole = 'member'
}: GroupMembersModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const canManageMembers = currentUserRole === 'admin' || currentUserRole === 'moderator';

  useEffect(() => {
    if (open && threadId) {
      fetchParticipants();
    }
  }, [open, threadId, context]);

  const fetchParticipants = async () => {
    setIsLoading(true);
    try {
      const participantsTable = context === 'global' ? 'global_thread_participants' : 'thread_participants';
      
      let query;
      if (context === 'global') {
        query = supabase
          .from(participantsTable)
          .select(`
            id,
            user_id,
            role,
            is_active
          `)
          .eq('thread_id', threadId)
          .eq('is_active', true);
      } else {
        query = supabase
          .from(participantsTable)
          .select(`
            id,
            user_id,
            role,
            is_active
          `)
          .eq('thread_id', threadId)
          .eq('is_active', true);
      }

      const { data: participantsData, error } = await query;
      if (error) throw error;

      // Fetch profile data separately for each participant
      const participantsWithProfiles = await Promise.all(
        (participantsData || []).map(async (participant) => {
          try {
            const profileTable = context === 'global' ? 'global_community_profiles' : 'profiles';
            const { data: profileData, error: profileError } = await supabase
              .from(profileTable)
              .select('display_name, full_name, avatar_url, email')
              .eq('user_id', participant.user_id)
              .single();

            return {
              ...participant,
              profile: profileError ? null : profileData
            };
          } catch (error) {
            return {
              ...participant,
              profile: null
            };
          }
        })
      );

      setParticipants(participantsWithProfiles);
    } catch (error) {
      console.error('Error fetching participants:', error);
      notifyError('toasts.messages.failedLoadMembers', 'toasts.messages.pleaseTryAgain');
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchFunction = context === 'global' 
        ? supabase.rpc('search_global_directory', { search_term: term })
        : supabase.rpc('search_tenant_directory', { 
            search_term: term, 
            tenant_id_param: user?.user_metadata?.active_tenant_id 
          });

      const { data, error } = await searchFunction;
      
      if (error) throw error;
      
      // Filter out existing participants
      const existingUserIds = participants.map(p => p.user_id);
      const filteredResults = (data || []).filter(
        (u: SearchUser) => !existingUserIds.includes(u.user_id)
      );
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addMember = async (newUser: SearchUser) => {
    if (!canManageMembers) return;

    try {
      const participantsTable = context === 'global' ? 'global_thread_participants' : 'thread_participants';
      
      const { error } = await supabase
        .from(participantsTable)
        .insert({
          thread_id: threadId,
          user_id: newUser.user_id,
          role: 'member'
        });

      if (error) throw error;

      // Send system message
      const messageData = context === 'global'
        ? {
            thread_id: threadId,
            sender_id: user?.id,
            body: `${user?.email} added ${newUser.display_name || newUser.full_name}`,
            message_type: 'system',
            content_data: { 
              system_type: 'member_added',
              added_by: user?.id,
              added_user: newUser.user_id,
              added_user_name: newUser.display_name || newUser.full_name
            }
          }
        : {
            thread_id: threadId,
            tenant_id: user?.user_metadata?.active_tenant_id,
            sender_id: user?.id,
            recipient_id: null,
            body: `${user?.email} added ${newUser.display_name || newUser.full_name}`,
            message_type: 'system',
            content_data: { 
              system_type: 'member_added',
              added_by: user?.id,
              added_user: newUser.user_id,
              added_user_name: newUser.display_name || newUser.full_name
            }
          };

      await supabase
        .from(context === 'global' ? 'global_messages' : 'messages')
        .insert(messageData);

      notify('toasts.messages.memberAdded');

      setSearchTerm("");
      setSearchResults([]);
      fetchParticipants();

    } catch (error) {
      console.error('Error adding member:', error);
      notifyError('toasts.messages.failedAddMember', 'toasts.messages.pleaseTryAgain');
    }
  };

  const removeMember = async (participantId: string, userId: string, userName: string) => {
    if (!canManageMembers || userId === user?.id) return;

    try {
      const participantsTable = context === 'global' ? 'global_thread_participants' : 'thread_participants';
      
      const { error } = await supabase
        .from(participantsTable)
        .update({ is_active: false })
        .eq('id', participantId);

      if (error) throw error;

      // Send system message
      const messageData = context === 'global'
        ? {
            thread_id: threadId,
            sender_id: user?.id,
            body: `${user?.email} removed ${userName}`,
            message_type: 'system',
            content_data: { 
              system_type: 'member_removed',
              removed_by: user?.id,
              removed_user: userId,
              removed_user_name: userName
            }
          }
        : {
            thread_id: threadId,
            tenant_id: user?.user_metadata?.active_tenant_id,
            sender_id: user?.id,
            recipient_id: null,
            body: `${user?.email} removed ${userName}`,
            message_type: 'system',
            content_data: { 
              system_type: 'member_removed',
              removed_by: user?.id,
              removed_user: userId,
              removed_user_name: userName
            }
          };

      await supabase
        .from(context === 'global' ? 'global_messages' : 'messages')
        .insert(messageData);

      notify('toasts.messages.memberRemoved');

      fetchParticipants();

    } catch (error) {
      console.error('Error removing member:', error);
      notifyError('toasts.messages.failedRemoveMember', 'toasts.messages.pleaseTryAgain');
    }
  };

  const leaveGroup = async () => {
    try {
      const participantsTable = context === 'global' ? 'global_thread_participants' : 'thread_participants';
      const currentParticipant = participants.find(p => p.user_id === user?.id);
      
      if (!currentParticipant) return;

      const { error } = await supabase
        .from(participantsTable)
        .update({ is_active: false })
        .eq('id', currentParticipant.id);

      if (error) throw error;

      // Send system message
      const userName = currentParticipant.profile?.display_name || currentParticipant.profile?.full_name || user?.email;
      const messageData = context === 'global'
        ? {
            thread_id: threadId,
            sender_id: user?.id,
            body: `${userName} left the group`,
            message_type: 'system',
            content_data: { 
              system_type: 'member_left',
              left_user: user?.id,
              left_user_name: userName
            }
          }
        : {
            thread_id: threadId,
            tenant_id: user?.user_metadata?.active_tenant_id,
            sender_id: user?.id,
            recipient_id: null,
            body: `${userName} left the group`,
            message_type: 'system',
            content_data: { 
              system_type: 'member_left',
              left_user: user?.id,
              left_user_name: userName
            }
          };

      await supabase
        .from(context === 'global' ? 'global_messages' : 'messages')
        .insert(messageData);

      notify('toasts.messages.leftGroup', 'toasts.messages.youHaveLeftGroupYouCan');

      onOpenChange(false);

    } catch (error) {
      console.error('Error leaving group:', error);
      notifyError('toasts.messages.failedLeaveGroup', 'toasts.messages.pleaseTryAgain');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4 text-amber-500" />;
      case 'moderator':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, any> = {
      admin: 'default',
      moderator: 'secondary',
      member: 'outline'
    };
    
    return (
      <Badge variant={variants[role] || 'outline'} className="text-xs">
        {role}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t('screens.messages.groupMembersLength', { length: participants.length })}</span>
            {currentUserRole !== 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={leaveGroup}
                className="text-destructive hover:text-destructive"
              >
                {t('screens.messages.leaveGroup')}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Add Members Search */}
          {canManageMembers && (
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  placeholder="Search users to add..."
                  className="pl-10"
                />
              </div>
              
              {searchResults.length > 0 && (
                <ScrollArea className="h-24 mt-2 border rounded-md">
                  <div className="p-2">
                    {searchResults.map((searchUser) => (
                      <div
                        key={searchUser.user_id}
                        className="flex items-center gap-2 p-1 hover:bg-muted rounded-md cursor-pointer"
                        onClick={() => addMember(searchUser)}
                      >
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={searchUser.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {searchUser.display_name?.[0] || searchUser.full_name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">
                            {searchUser.display_name || searchUser.full_name}
                          </p>
                        </div>
                        <UserPlus className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Current Members */}
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Loading members...
                </div>
              ) : (
                participants.map((participant) => {
                  const profile = participant.profile;
                  const displayName = profile?.display_name || profile?.full_name || profile?.email || 'Unknown';
                  const isCurrentUser = participant.user_id === user?.id;

                  return (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {displayName[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {displayName}
                            {isCurrentUser && (
                              <span className="text-muted-foreground text-sm ml-1">{t('screens.messages.you')}</span>
                            )}
                          </p>
                          {getRoleIcon(participant.role)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {getRoleBadge(participant.role)}
                          {profile?.email && (
                            <span className="text-xs text-muted-foreground truncate">
                              {profile.email}
                            </span>
                          )}
                        </div>
                      </div>

                      {canManageMembers && !isCurrentUser && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => removeMember(participant.id, participant.user_id, displayName)}
                              className="text-destructive focus:text-destructive"
                            >
                              <UserMinus className="w-4 h-4 mr-2" />
                              Remove from group
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}