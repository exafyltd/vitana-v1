import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Loader2, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useRole } from "@/hooks/useRole";
import { useTenant } from "@/hooks/useTenant";
import { t } from '@/lib/i18n-toast';

interface SearchResult {
  user_id: string;
  display_name?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  email?: string;
}

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: { 
    contact_name: string; 
    contact_phone?: string; 
    contact_email?: string;
    contact_user_id?: string;
  }) => Promise<any>;
  prefilledUserId?: string;
  prefilledName?: string;
  prefilledAvatar?: string;
}

// Debounce helper
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default function AddContactDialog({ 
  open, 
  onOpenChange, 
  onAdd,
  prefilledUserId,
  prefilledName,
}: AddContactDialogProps) {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const { activeTenantId } = useTenant();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [manualMode, setManualMode] = useState(false);
  
  // Manual entry fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Search users
  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const isGlobalContext = currentRole === 'community';
      
      if (isGlobalContext) {
        const { data, error } = await supabase.rpc('search_global_directory', {
          search_term: query.trim()
        });
        if (error) throw error;
        setSearchResults(data || []);
      } else {
        if (!activeTenantId) return;
        const { data, error } = await supabase.rpc('search_tenant_directory', {
          search_term: query.trim(),
          tenant_id_param: activeTenantId
        });
        if (error) throw error;
        setSearchResults(data || []);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce(searchUsers, 300),
    [currentRole, activeTenantId]
  );
  
  useEffect(() => {
    if (searchQuery && !manualMode) {
      debouncedSearch(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, manualMode, debouncedSearch]);
  
  const handleSelectUser = (user: SearchResult) => {
    setSelectedUser(user);
    setSearchQuery(user.display_name || user.full_name || '');
    setSearchResults([]);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (selectedUser) {
        // Add platform user
        await onAdd({
          contact_name: selectedUser.display_name || selectedUser.full_name || 'Unknown',
          contact_email: selectedUser.email,
          contact_user_id: selectedUser.user_id
        });
      } else if (manualMode && name.trim()) {
        // Add manual contact
        await onAdd({
          contact_name: name.trim(),
          contact_phone: phone.trim() || undefined,
          contact_email: email.trim() || undefined
        });
      }
      
      // Reset form
      setSearchQuery("");
      setSelectedUser(null);
      setManualMode(false);
      setName("");
      setPhone("");
      setEmail("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding contact:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const resetForm = () => {
    setSearchQuery("");
    setSelectedUser(null);
    setManualMode(false);
    setName("");
    setPhone("");
    setEmail("");
    setSearchResults([]);
  };
  
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  // Auto-search and pre-select user when prefilledUserId is provided
  useEffect(() => {
    const autoSearchUser = async () => {
      if (open && prefilledUserId && !selectedUser) {
        setIsSearching(true);
        try {
          const isGlobalContext = currentRole === 'community';
          
          if (isGlobalContext) {
            const { data, error } = await supabase
              .from('global_community_profiles')
              .select('user_id, display_name, avatar_url, bio')
              .eq('user_id', prefilledUserId)
              .single();
            
            if (!error && data) {
              const userResult: SearchResult = {
                user_id: data.user_id,
                display_name: data.display_name,
                avatar_url: data.avatar_url,
                bio: data.bio
              };
              setSelectedUser(userResult);
              setSearchQuery(data.display_name || prefilledName || '');
            }
          } else {
            if (!activeTenantId) return;
            const { data, error } = await supabase
              .from('profiles')
              .select('user_id, display_name, full_name, avatar_url, email')
              .eq('user_id', prefilledUserId)
              .single();
            
            if (!error && data) {
              const userResult: SearchResult = {
                user_id: data.user_id,
                display_name: data.display_name,
                full_name: data.full_name,
                avatar_url: data.avatar_url,
                email: data.email
              };
              setSelectedUser(userResult);
              setSearchQuery(data.display_name || data.full_name || prefilledName || '');
            }
          }
        } catch (error) {
          console.error('Error auto-searching user:', error);
          if (prefilledName) {
            setSearchQuery(prefilledName);
          }
        } finally {
          setIsSearching(false);
        }
      }
    };

    autoSearchUser();
  }, [open, prefilledUserId, selectedUser, currentRole, activeTenantId, prefilledName]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('screens.contacts.addContact')}</DialogTitle>
          <DialogDescription>
            Search for VITANA users or add manually
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {!manualMode && (
              <>
                {/* Search Input */}
                <div className="space-y-2">
                  <Label>{t('screens.contacts.searchVitanaUsers')}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={t('screens.contacts.typeNameEmailPhone')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      disabled={!!selectedUser}
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin" />
                    )}
                  </div>
                  
                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && !selectedUser && (
                    <Card className="absolute z-50 w-[calc(100%-2rem)] max-h-60 overflow-auto">
                      {searchResults.map((result) => (
                        <Button
                          key={result.user_id}
                          variant="ghost"
                          className="w-full justify-start p-3 h-auto"
                          type="button"
                          onClick={() => handleSelectUser(result)}
                        >
                          <Avatar className="w-8 h-8 mr-3">
                            <AvatarImage src={result.avatar_url} />
                            <AvatarFallback>{result.display_name?.[0] || result.full_name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <p className="font-medium">{result.display_name || result.full_name}</p>
                            {result.email && (
                              <p className="text-xs text-muted-foreground">{result.email}</p>
                            )}
                          </div>
                        </Button>
                      ))}
                    </Card>
                  )}
                  
                  {/* Selected User Display */}
                  {selectedUser && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={selectedUser.avatar_url} />
                        <AvatarFallback>{selectedUser.display_name?.[0] || selectedUser.full_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{selectedUser.display_name || selectedUser.full_name}</p>
                        {selectedUser.email && (
                          <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => {
                          setSelectedUser(null);
                          setSearchQuery("");
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Toggle Manual Mode */}
                {!selectedUser && (
                  <Button
                    variant="link"
                    size="sm"
                    type="button"
                    onClick={() => setManualMode(true)}
                    className="w-full"
                  >
                    Can't find them? Add manually
                  </Button>
                )}
              </>
            )}
            
            {/* Manual Entry Fields */}
            {manualMode && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder={t('screens.contacts.johnDoe')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('screens.contacts.phoneNumber')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">{t('screens.contacts.emailAddress')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('screens.contacts.johnExampleCom')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                <Button
                  variant="link"
                  size="sm"
                  type="button"
                  onClick={() => setManualMode(false)}
                  className="w-full"
                >
                  Search users instead
                </Button>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={(!selectedUser && (!manualMode || !name.trim())) || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Contact"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
