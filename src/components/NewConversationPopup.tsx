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
  const [selected, setSelected] = useState<string[]>([]);

  // Determine context: use prop if provided, otherwise fall back to role-based logic
  const effectiveContext = context || (currentRole === 'community' ? 'global' : 'tenant');

  const toggleSelection = (userId: string) => {
    setSelected(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

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

  const startConversation = async () => {
    if (!user || selected.length !== 1) return;
    
    const recipientId = selected[0];
    setIsCreating(true);
    
    try {
      const isGlobalContext = effectiveContext === 'global';
      
      if (isGlobalContext) {
        // Use atomic RPC function for global DMs  
        const { data, error } = await supabase.rpc('create_or_get_global_dm' as any, {
          p_other_user: recipientId
        }) as { data: { thread_id: string }[] | null, error: any };

        if (error) {
          throw new Error(`Failed to create conversation: ${error.message}`);
        }
        
        const threadId = data?.[0]?.thread_id;
        if (!threadId) {
          throw new Error('No thread ID returned from server');
        }
        
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

        if (error) {
          throw new Error(`Failed to create conversation: ${error.message}`);
        }
        
        onConversationCreated?.(threadId, recipientId);
      }

      toast.success('Conversation started!');
      onOpenChange(false);
      setSearchQuery('');
      setSearchResults([]);
      setSelected([]);
    } catch (error) {
      console.error('Error creating conversation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(errorMessage);
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
                      onClick={() => toggleSelection(profile.user_id)}
                      disabled={isCreating || profile.user_id === user?.id}
                      size="sm"
                      variant={selected.includes(profile.user_id) ? "default" : "outline"}
                    >
                      {profile.user_id === user?.id 
                        ? 'You' 
                        : selected.includes(profile.user_id) 
                          ? 'Remove' 
                          : 'Add'
                      }
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selected.length > 0 && (
            <div className="space-y-2">
              <Label>Selected ({selected.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selected.map(userId => {
                  const user = searchResults.find(p => p.user_id === userId);
                  return user ? (
                    <div key={userId} className="flex items-center gap-2 bg-muted px-2 py-1 rounded-md text-sm">
                      <span>{user.display_name || user.full_name || 'Unknown'}</span>
                      <button 
                        onClick={() => toggleSelection(userId)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
              <Button 
                onClick={startConversation}
                disabled={selected.length !== 1 || isCreating}
                className="w-full"
              >
                {isCreating ? 'Starting...' : selected.length === 1 ? 'Start Chat' : 'Select one person to start chat'}
              </Button>
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