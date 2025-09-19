import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, User, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useRole } from "@/hooks/useRole";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

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
          toast.error('No tenant context available');
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
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

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
        toast.error('Group name and recipients are required');
        return;
      }
      return createGroup();
    } else {
      // Create direct message
      if (selectedRecipients.length !== 1) {
        toast.error('Select exactly one recipient for direct message');
        return;
      }
      return createDirectMessage(selectedRecipients[0].user_id);
    }
  };

  const createDirectMessage = async (recipientId: string) => {
    if (!user) return;
    
    setIsCreating(true);
    try {
      const isGlobalContext = effectiveContext === 'global';
      
      if (isGlobalContext) {
        // Use the function directly since it's not in the generated types yet
        const { data, error } = await supabase.rpc('create_or_get_global_dm' as any, {
          p_other_user: recipientId
        });

        if (error) throw error;
        
        const threadId = data?.[0]?.thread_id;
        if (!threadId) throw new Error('Failed to create or get thread');
        
        onConversationCreated?.(threadId, recipientId);
      } else {
        // Use secure RPC to create tenant thread
        if (!activeTenantId) {
          throw new Error('No active tenant found');
        }

        const { data: threadId, error } = await supabase.rpc('create_tenant_direct_thread', {
          p_recipient_id: recipientId,
          p_tenant_id: activeTenantId
        });

        if (error) throw error;
        
        onConversationCreated?.(threadId, recipientId);
      }

      toast.success('Conversation started!');
      resetForm();
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start conversation');
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

      toast.success(`Group "${groupName}" created successfully!`);
      onGroupCreated?.(thread.id);
      resetForm();
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
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
            {isGroupMode ? 'Create Group Chat' : 'Start New Conversation'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Group Name (only in group mode) */}
          {isGroupMode && (
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name..."
              />
            </div>
          )}

          {/* Selected Recipients */}
          {selectedRecipients.length > 0 && (
            <div className="space-y-2">
              <Label>
                {isGroupMode ? `Members (${selectedRecipients.length})` : 'Recipient'}
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
              {isGroupMode ? 'Add more people' : 'Search for people'}
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Enter name or email to search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                className="pl-10"
              />
            </div>
            <Button 
              onClick={searchUsers} 
              disabled={!searchQuery.trim() || isSearching}
              variant="outline"
              size="sm"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <Label>Search Results</Label>
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
                      {selectedRecipients.find(r => r.user_id === profile.user_id) ? 'Added' : 'Add'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchQuery && searchResults.length === 0 && !isSearching && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No users found. Try a different search term.
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={resetForm}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={startConversation}
              disabled={isCreating || selectedRecipients.length === 0 || (isGroupMode && !groupName.trim())}
            >
              {isCreating ? 'Creating...' : isGroupMode ? 'Create Group' : 'Start Chat'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}