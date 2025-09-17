import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";

interface NewConversationPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated?: (threadId: string, recipientId: string) => void;
}

export default function NewConversationPopup({
  open,
  onOpenChange,
  onConversationCreated,
}: NewConversationPopupProps) {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const searchUsers = async () => {
    if (!searchQuery.trim() || !user) return;
    
    setIsSearching(true);
    try {
      const isGlobalContext = currentRole === 'community';
      
      if (isGlobalContext) {
        // Search global community profiles and their corresponding profile emails separately
        const { data: communityProfiles, error: communityError } = await supabase
          .from('global_community_profiles')
          .select('user_id, display_name, avatar_url, bio')
          .or(`display_name.ilike.%${searchQuery}%`)
          .neq('user_id', user.id)
          .eq('is_visible', true)
          .limit(10);

        if (communityError) throw communityError;

        // Also search by email in profiles table for community users
        const { data: profilesByEmail, error: emailError } = await supabase
          .from('profiles')
          .select('user_id, display_name, full_name, avatar_url, bio, email')
          .or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
          .neq('user_id', user.id)
          .limit(10);

        if (emailError) throw emailError;

        // Combine results, prioritizing community profiles but including email matches
        const communityUserIds = new Set((communityProfiles || []).map(p => p.user_id));
        const emailMatches = (profilesByEmail || []).filter(p => communityUserIds.has(p.user_id));
        
        // Merge the data
        const results = (communityProfiles || []).map(cp => {
          const profileMatch = emailMatches.find(em => em.user_id === cp.user_id);
          return {
            ...cp,
            email: profileMatch?.email,
            full_name: profileMatch?.full_name
          };
        });

        // Add any additional email-only matches
        const additionalEmailMatches = (profilesByEmail || [])
          .filter(p => !communityUserIds.has(p.user_id))
          .map(p => ({
            user_id: p.user_id,
            display_name: p.display_name,
            avatar_url: p.avatar_url,
            bio: p.bio,
            email: p.email,
            full_name: p.full_name
          }));

        setSearchResults([...results, ...additionalEmailMatches]);
      } else {
        // Search profiles in the same tenant including email
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, display_name, full_name, avatar_url, bio, email')
          .or(`display_name.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .neq('user_id', user.id)
          .limit(10);

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

  const startConversation = async (recipientId: string) => {
    if (!user) return;
    
    setIsCreating(true);
    try {
      const isGlobalContext = currentRole === 'community';
      
      if (isGlobalContext) {
        // Create global thread
        const { data: threadData, error: threadError } = await supabase
          .from('global_message_threads')
          .insert({
            created_by: user.id,
            type: 'direct',
            name: null,
          })
          .select()
          .single();

        if (threadError) throw threadError;

        // Add participants
        const { error: participantError } = await supabase
          .from('global_thread_participants')
          .insert([
            { thread_id: threadData.id, user_id: user.id, role: 'admin' },
            { thread_id: threadData.id, user_id: recipientId, role: 'member' },
          ]);

        if (participantError) throw participantError;
        
        onConversationCreated?.(threadData.id, recipientId);
      } else {
        // Create tenant thread - need tenant_id
        const { data: membership } = await supabase
          .from('memberships')
          .select('tenant_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (!membership) throw new Error('No active membership found');

        const { data: threadData, error: threadError } = await supabase
          .from('message_threads')
          .insert({
            tenant_id: membership.tenant_id,
            created_by: user.id,
            type: 'direct',
            name: null,
          })
          .select()
          .single();

        if (threadError) throw threadError;

        // Add participants
        const { error: participantError } = await supabase
          .from('thread_participants')
          .insert([
            { thread_id: threadData.id, user_id: user.id, role: 'admin' },
            { thread_id: threadData.id, user_id: recipientId, role: 'member' },
          ]);

        if (participantError) throw participantError;
        
        onConversationCreated?.(threadData.id, recipientId);
      }

      toast.success('Conversation started!');
      onOpenChange(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search for people</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Enter name to search..."
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
                      onClick={() => startConversation(profile.user_id)}
                      disabled={isCreating}
                      size="sm"
                    >
                      {isCreating ? 'Starting...' : 'Message'}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}