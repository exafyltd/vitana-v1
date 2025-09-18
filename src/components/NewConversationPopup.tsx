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
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

interface NewConversationPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated?: (threadId: string, recipientId: string) => void;
  context?: 'global' | 'tenant';
}

export default function NewConversationPopup({
  open,
  onOpenChange,
  onConversationCreated,
  context,
}: NewConversationPopupProps) {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const { activeTenantId } = useTenant();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Determine context: use prop if provided, otherwise fall back to role-based logic
  const effectiveContext = context || (currentRole === 'community' ? 'global' : 'tenant');

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

  const startConversation = async (recipientId: string) => {
    if (!user) return;
    
    setIsCreating(true);
    try {
      const isGlobalContext = effectiveContext === 'global';
      
      if (isGlobalContext) {
        // Use secure RPC to create global thread
        const { data: threadId, error } = await supabase.rpc('create_global_direct_thread', {
          p_recipient_id: recipientId
        });

        if (error) throw error;
        
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