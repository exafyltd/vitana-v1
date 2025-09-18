import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, Users, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";

interface User {
  user_id: string;
  display_name: string;
  full_name?: string;
  avatar_url?: string;
  email: string;
}

interface CreateGroupPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: 'global' | 'tenant';
  onGroupCreated?: (threadId: string) => void;
}

export default function CreateGroupPopup({
  open,
  onOpenChange,
  context,
  onGroupCreated
}: CreateGroupPopupProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groupName, setGroupName] = useState("");
  const [groupAvatar, setGroupAvatar] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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
      setSearchResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = async (value: string) => {
    setSearchTerm(value);
    await searchUsers(value);
  };

  const addMember = (user: User) => {
    if (!selectedMembers.find(m => m.user_id === user.user_id)) {
      setSelectedMembers([...selectedMembers, user]);
    }
    setSearchTerm("");
    setSearchResults([]);
  };

  const removeMember = (userId: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.user_id !== userId));
  };

  const checkForDuplicateGroup = async (memberIds: string[]): Promise<boolean> => {
    try {
      const allMemberIds = [...memberIds, user?.id].filter(Boolean).sort();
      const cutoffTime = new Date(Date.now() - 60 * 1000).toISOString();

      // Check for recent groups with the same members
      const tableName = context === 'global' ? 'global_message_threads' : 'message_threads';
      const participantsTable = context === 'global' ? 'global_thread_participants' : 'thread_participants';

      const { data: recentThreads, error } = await supabase
        .from(tableName)
        .select(`
          id,
          ${participantsTable}!inner(user_id)
        `)
        .eq('type', 'group')
        .gte('created_at', cutoffTime);

      if (error) throw error;

      // Check if any recent thread has exactly the same members
      for (const thread of recentThreads || []) {
        const threadMemberIds = (thread as any)[participantsTable]
          .map((p: any) => p.user_id)
          .sort();

        if (JSON.stringify(threadMemberIds) === JSON.stringify(allMemberIds)) {
          return true; // Duplicate found
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return false;
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: "Group name required",
        description: "Please enter a name for your group.",
        variant: "destructive"
      });
      return;
    }

    if (selectedMembers.length === 0) {
      toast({
        title: "Add members",
        description: "Please add at least one member to the group.",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const memberIds = selectedMembers.map(m => m.user_id);
      
      // Check for duplicate groups
      const isDuplicate = await checkForDuplicateGroup(memberIds);
      if (isDuplicate) {
        toast({
          title: "Group already exists",
          description: "A group with these members was created recently. Please wait before creating another.",
          variant: "destructive"
        });
        return;
      }

      // Create the group thread
      const threadData = context === 'global' 
        ? { created_by: user?.id, type: 'group', name: groupName }
        : { 
            tenant_id: user?.user_metadata?.active_tenant_id,
            created_by: user?.id, 
            type: 'group', 
            name: groupName 
          };

      const { data: thread, error: threadError } = await supabase
        .from(context === 'global' ? 'global_message_threads' : 'message_threads')
        .insert(threadData)
        .select()
        .single();

      if (threadError) throw threadError;

      const participantsTable = context === 'global' ? 'global_thread_participants' : 'thread_participants';
      
      // Add current user as admin
      const participants = [
        { thread_id: thread.id, user_id: user?.id, role: 'admin' },
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

      // Send system message for group creation
      const messageData = context === 'global'
        ? {
            thread_id: thread.id,
            sender_id: user?.id,
            body: `${user?.email} created the group`,
            message_type: 'system',
            content_data: { 
              system_type: 'group_created',
              group_name: groupName,
              created_by: user?.id
            }
          }
        : {
            thread_id: thread.id,
            tenant_id: user?.user_metadata?.active_tenant_id,
            sender_id: user?.id,
            recipient_id: null,
            body: `${user?.email} created the group`,
            message_type: 'system',
            content_data: { 
              system_type: 'group_created',
              group_name: groupName,
              created_by: user?.id
            }
          };

      await supabase
        .from(context === 'global' ? 'global_messages' : 'messages')
        .insert(messageData);

      toast({
        title: "Group created",
        description: `"${groupName}" has been created successfully.`
      });

      onGroupCreated?.(thread.id);
      onOpenChange(false);
      
      // Reset form
      setGroupName("");
      setGroupAvatar("");
      setSelectedMembers([]);
      setSearchTerm("");
      setSearchResults([]);

    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: "Failed to create group",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Create Group
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Group Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-16 h-16">
                <AvatarImage src={groupAvatar} />
                <AvatarFallback className="text-lg">
                  {groupName[0]?.toUpperCase() || <Users className="w-6 h-6" />}
                </AvatarFallback>
              </Avatar>
              <Button
                size="sm"
                variant="outline"
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full p-0"
                onClick={() => {
                  // TODO: Implement avatar upload
                  toast({
                    title: "Coming soon",
                    description: "Avatar upload will be available soon."
                  });
                }}
              >
                <Camera className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex-1">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name..."
                className="mt-1"
              />
            </div>
          </div>

          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div>
              <Label>Members ({selectedMembers.length})</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedMembers.map((member) => (
                  <Badge
                    key={member.user_id}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    <Avatar className="w-4 h-4">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {member.display_name?.[0] || member.full_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">
                      {member.display_name || member.full_name}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeMember(member.user_id)}
                      className="w-4 h-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Member Search */}
          <div>
            <Label htmlFor="search">Add Members</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="search"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search users..."
                className="pl-10"
              />
            </div>
            
            {searchResults.length > 0 && (
              <ScrollArea className="h-32 mt-2 border rounded-md">
                <div className="p-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.user_id}
                      className="flex items-center gap-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => addMember(user)}
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {user.display_name?.[0] || user.full_name?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.display_name || user.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={createGroup}
              disabled={isCreating || !groupName.trim() || selectedMembers.length === 0}
            >
              {isCreating ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}