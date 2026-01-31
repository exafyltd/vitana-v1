import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, User, Users, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useRole } from "@/hooks/useRole";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { debounce } from "@/utils/performanceOptimization";

interface User {
  user_id: string;
  display_name: string;
  full_name?: string;
  avatar_url?: string;
  email: string;
  bio?: string;
}

interface NewConversationPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated?: (threadId: string, recipientId: string) => void;
  onGroupCreated?: (threadId: string) => void;
  context?: 'global' | 'tenant';
}

export default function NewConversationPopup({
  open,
  onOpenChange,
  onConversationCreated,
  onGroupCreated,
  context,
}: NewConversationPopupProps) {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const { activeTenantId } = useTenant();
  const { toast } = useToast();
  const { translate } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");

  // Determine context: use prop if provided, otherwise fall back to role-based logic
  const effectiveContext = context || (currentRole === 'community' ? 'global' : 'tenant');

  // Auto-switch to group mode when multiple recipients are selected
  useEffect(() => {
    if (selectedRecipients.length > 1 && !isGroupMode) {
      setIsGroupMode(true);
      if (!groupName) {
        const names = selectedRecipients.map(r => r.display_name || r.full_name).filter(Boolean);
        setGroupName(names.slice(0, 3).join(', ') + (names.length > 3 ? '...' : ''));
      }
    } else if (selectedRecipients.length <= 1 && isGroupMode) {
      setIsGroupMode(false);
      setGroupName('');
    }
  }, [selectedRecipients, isGroupMode, groupName]);

  const searchUsers = async () => {
    if (!searchQuery.trim() || !user) return;
    
    setIsSearching(true);
    try {
      const isGlobalContext = effectiveContext === 'global';
      
      if (isGlobalContext) {
        // Use secure RPC function for global directory search
        const { data, error } = await supabase.rpc('search_global_directory', {
          search_term: searchQuery.trim()
        });

        if (error) throw error;
        setSearchResults(data || []);
      } else {
        // Use secure RPC function for tenant directory search
        if (!activeTenantId) {
          toast({
            title: translate('inbox.toast.error'),
            description: translate('inbox.toast.noTenantContext'),
            variant: "destructive"
          });
          return;
        }

        const { data, error } = await supabase.rpc('search_tenant_directory', {
          search_term: searchQuery.trim(),
          tenant_id_param: activeTenantId
        });

        if (error) throw error;
        setSearchResults(data || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: translate('inbox.toast.error'),
        description: translate('inbox.toast.searchFailed'),
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search function
  const debouncedSearchUsers = useMemo(
    () => debounce(searchUsers, 300),
    [searchQuery, user, effectiveContext, activeTenantId]
  );

  // Auto-search when query changes
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      debouncedSearchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, debouncedSearchUsers]);

  const addRecipient = (recipient: User) => {
    if (!selectedRecipients.find(r => r.user_id === recipient.user_id)) {
      setSelectedRecipients([...selectedRecipients, recipient]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeRecipient = (userId: string) => {
    setSelectedRecipients(selectedRecipients.filter(r => r.user_id !== userId));
  };

  const startConversation = async () => {
    if (!user) return;
    
    if (isGroupMode) {
      // Create group chat
      if (!groupName.trim() || selectedRecipients.length === 0) {
        toast({
          title: translate('inbox.toast.error'),
          description: translate('inbox.toast.groupRecipientsRequired'),
          variant: "destructive"
        });
        return;
      }
      return createGroup();
    } else {
      // Create direct message
      if (selectedRecipients.length !== 1) {
        toast({
          title: translate('inbox.toast.error'),
          description: translate('inbox.toast.singleRecipientRequired'),
          variant: "destructive"
        });
        return;
      }
      return createDirectMessage(selectedRecipients[0].user_id);
    }
  };

  const createDirectMessage = async (recipientId: string) => {
    console.log('🔄 Starting conversation creation...', {
      user: user?.id,
      recipientId,
      effectiveContext,
      currentRole,
      activeTenantId
    });

    if (!user) {
      console.error('❌ No authenticated user found');
      toast({
        title: translate('inbox.toast.error'), 
        description: translate('inbox.toast.authRequired'),
        variant: "destructive"
      });
      return;
    }
    
    setIsCreating(true);
    try {
      const isGlobalContext = effectiveContext === 'global';
      console.log('📍 Context determined:', { isGlobalContext, effectiveContext });
      
      if (isGlobalContext) {
        console.log('🌐 Creating global conversation...');
        
        // Check if user is community user first
        const { data: isCommunityData, error: communityError } = await supabase.rpc('is_community_user');
        console.log('👥 Community user check:', { isCommunityData, communityError });
        
        if (communityError) {
          console.error('❌ Community user check failed:', communityError);
          throw new Error(`Community user verification failed: ${communityError.message}`);
        }
        
        if (!isCommunityData) {
          console.error('❌ User is not a community user');
          throw new Error('Only community users can create global conversations');
        }

        // Use the function directly since it's not in the generated types yet
        console.log('🔍 Calling create_or_get_global_dm...');
        const { data, error } = await supabase.rpc('create_or_get_global_dm' as any, {
          p_other_user: recipientId
        });

        console.log('📦 RPC Response:', { data, error });

        if (error) {
          console.error('❌ RPC Error:', error);
          throw new Error(`Failed to create conversation: ${error.message}`);
        }
        
        console.log('📋 Raw data received:', data);
        
        if (!data || !Array.isArray(data) || data.length === 0) {
          console.error('❌ Invalid response format:', data);
          throw new Error('Invalid response from server - no data returned');
        }
        
        const threadId = data[0]?.thread_id;
        console.log('🔗 Extracted thread ID:', threadId);
        
        if (!threadId) {
          console.error('❌ No thread ID in response:', data[0]);
          throw new Error('Failed to create or get thread - no thread ID returned');
        }
        
        console.log('✅ Conversation created successfully!', { threadId, recipientId });
        onConversationCreated?.(threadId, recipientId);
      } else {
        console.log('🏢 Creating tenant conversation...');
        
        // Use secure RPC to create tenant thread
        if (!activeTenantId) {
          console.error('❌ No active tenant found');
          throw new Error('No active tenant found');
        }

        const { data: threadId, error } = await supabase.rpc('create_tenant_direct_thread', {
          p_recipient_id: recipientId,
          p_tenant_id: activeTenantId
        });

        console.log('📦 Tenant RPC Response:', { threadId, error });

        if (error) {
          console.error('❌ Tenant RPC Error:', error);
          throw error;
        }
        
        console.log('✅ Tenant conversation created!', { threadId, recipientId });
        onConversationCreated?.(threadId, recipientId);
      }

      toast({
        title: translate('inbox.toast.success'),
        description: translate('inbox.toast.conversationStarted')
      });
      resetForm();
    } catch (error: any) {
      console.error('💥 Full error details:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        fullError: error
      });
      
      let errorMessage = 'Failed to start conversation';
      
      if (error?.message?.includes('Access denied')) {
        errorMessage = translate('inbox.toast.accessDenied');
      } else if (error?.message?.includes('community')) {
        errorMessage = translate('inbox.toast.communityOnly');
      } else if (error?.message?.includes('Authentication')) {
        errorMessage = translate('inbox.toast.pleaseLogin');
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: translate('inbox.toast.error'),
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const createGroup = async () => {
    if (!user || !groupName.trim() || selectedRecipients.length === 0) return;
    
    setIsCreating(true);
    try {
      const memberIds = selectedRecipients.map(r => r.user_id);
      
      // Create the group thread
      const threadData = effectiveContext === 'global' 
        ? { created_by: user.id, type: 'group', name: groupName }
        : { 
            tenant_id: activeTenantId,
            created_by: user.id, 
            type: 'group', 
            name: groupName 
          };

      const { data: thread, error: threadError } = await supabase
        .from(effectiveContext === 'global' ? 'global_message_threads' : 'message_threads')
        .insert(threadData)
        .select()
        .single();

      if (threadError) throw threadError;

      const participantsTable = effectiveContext === 'global' ? 'global_thread_participants' : 'thread_participants';
      
      // Add participants
      const participants = [
        { thread_id: thread.id, user_id: user.id, role: 'admin' },
        ...memberIds.map(userId => ({
          thread_id: thread.id,
          user_id: userId,
          role: 'member'
        }))
      ];

      const { error: participantsError } = await supabase
        .from(participantsTable)
        .insert(participants);

      if (participantsError) throw participantsError;

      // Send system message
      const messageData = effectiveContext === 'global'
        ? {
            thread_id: thread.id,
            sender_id: user.id,
            body: `${user.email} created the group`,
            message_type: 'system',
            content_data: { 
              system_type: 'group_created',
              group_name: groupName,
              created_by: user.id
            }
          }
        : {
            thread_id: thread.id,
            tenant_id: activeTenantId,
            sender_id: user.id,
            recipient_id: null,
            body: `${user.email} created the group`,
            message_type: 'system',
            content_data: { 
              system_type: 'group_created',
              group_name: groupName,
              created_by: user.id
            }
          };

      await supabase
        .from(effectiveContext === 'global' ? 'global_messages' : 'messages')
        .insert(messageData);

      toast({
        title: translate('inbox.toast.success'),
        description: translate('inbox.toast.groupCreated').replace('{name}', groupName)
      });
      onGroupCreated?.(thread.id);
      resetForm();
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: translate('inbox.toast.error'),
        description: translate('inbox.toast.groupFailed'),
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    onOpenChange(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedRecipients([]);
    setIsGroupMode(false);
    setGroupName('');
  };

  return (
    <Dialog open={open} onOpenChange={resetForm}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isGroupMode ? <Users className="w-5 h-5" /> : <User className="w-5 h-5" />}
            {isGroupMode ? translate('inbox.newConversation.titleGroup') : translate('inbox.newConversation.title')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Group Name (only in group mode) */}
          {isGroupMode && (
            <div className="space-y-2">
              <Label htmlFor="groupName">{translate('inbox.newConversation.groupName')}</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder={translate('inbox.newConversation.groupNamePlaceholder')}
              />
            </div>
          )}

          {/* Selected Recipients */}
          {selectedRecipients.length > 0 && (
            <div className="space-y-2">
              <Label>
                {isGroupMode ? `${translate('inbox.newConversation.members')} (${selectedRecipients.length})` : translate('inbox.newConversation.recipient')}
              </Label>
              <div className="flex flex-wrap gap-2">
                {selectedRecipients.map((recipient) => (
                  <Badge
                    key={recipient.user_id}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    <Avatar className="w-4 h-4">
                      <AvatarImage src={recipient.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {recipient.display_name?.[0] || recipient.full_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">
                      {recipient.display_name || recipient.full_name}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeRecipient(recipient.user_id)}
                      className="w-4 h-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="search">
              {isGroupMode ? translate('inbox.newConversation.addMore') : translate('inbox.newConversation.searchPeople')}
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              {isSearching && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 text-muted-foreground animate-spin" />
              )}
              <Input
                id="search"
                placeholder={translate('inbox.newConversation.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                className="pl-10 pr-10"
              />
            </div>
            {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
              <p className="text-sm text-muted-foreground">
                {translate('inbox.newConversation.searchMinChars')}
              </p>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <Label>{translate('inbox.newConversation.searchResults')}</Label>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {searchResults.map((profile) => (
                  <div
                    key={profile.user_id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={profile.avatar_url} />
                        <AvatarFallback>
                          {profile.display_name?.[0] || profile.full_name?.[0] || <User className="w-4 h-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {profile.display_name || profile.full_name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-40">
                          {profile.email}
                        </p>
                        {profile.bio && (
                          <p className="text-sm text-muted-foreground truncate max-w-40">
                            {profile.bio}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => addRecipient(profile)}
                      disabled={selectedRecipients.find(r => r.user_id === profile.user_id) !== undefined}
                      size="sm"
                      variant={selectedRecipients.find(r => r.user_id === profile.user_id) ? "secondary" : "default"}
                    >
                      {selectedRecipients.find(r => r.user_id === profile.user_id) ? translate('inbox.newConversation.added') : translate('inbox.newConversation.add')}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchQuery && searchResults.length === 0 && !isSearching && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {translate('inbox.newConversation.noResults')}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={resetForm}
              disabled={isCreating}
            >
              {translate('inbox.newConversation.cancel')}
            </Button>
            <Button
              onClick={startConversation}
              disabled={isCreating || selectedRecipients.length === 0 || (isGroupMode && !groupName.trim())}
            >
              {isCreating ? translate('inbox.newConversation.creating') : isGroupMode ? translate('inbox.newConversation.createGroup') : translate('inbox.newConversation.startChat')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}