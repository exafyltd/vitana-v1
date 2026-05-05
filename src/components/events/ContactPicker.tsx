import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, Users, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { t } from '@/lib/i18n-toast';

interface Contact {
  user_id: string;
  display_name: string;
  avatar_url: string;
  email?: string;
}

interface ContactPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (contacts: Contact[]) => void;
  selectedIds?: string[];
  title?: string;
  description?: string;
}

export function ContactPicker({
  isOpen,
  onClose,
  onSelect,
  selectedIds = [],
  title = "Select Contacts",
  description = "Choose people to invite to your event",
}: ContactPickerProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set(selectedIds));
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  const loadContacts = async () => {
    try {
      setLoading(true);

      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) return;

      // Load from user_follows (people user follows)
      const { data: followsData, error: followsError } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", currentUser.id);

      if (followsError) throw followsError;

      const followingIds = followsData?.map((f) => f.following_id) || [];

      // Get profiles for following
      let profilesData: Contact[] = [];
      if (followingIds.length > 0) {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, email")
          .in("user_id", followingIds);

        if (!error && data) {
          profilesData = data as Contact[];
        }
      }

      // Load from global_community_profiles (community members)
      const { data: communityData, error: communityError } = await supabase
        .from("global_community_profiles")
        .select("user_id, display_name, avatar_url")
        .eq("is_visible", true)
        .limit(50);

      if (communityError) throw communityError;

      // Combine and deduplicate
      const allContacts = [...profilesData, ...(communityData || [])];

      const uniqueContacts = Array.from(
        new Map(allContacts.map((c) => [c.user_id, c as Contact])).values()
      );

      setContacts(uniqueContacts);
    } catch (error) {
      console.error("Error loading contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleContact = (userId: string) => {
    setSelectedContacts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    const selected = contacts.filter((c) => selectedContacts.has(c.user_id));
    onSelect(selected);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {title}
          </DialogTitle>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('screens.events.searchByNameEmail')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selected Count */}
          {selectedContacts.size > 0 && (
            <Badge variant="secondary">
              {selectedContacts.size} selected
            </Badge>
          )}

          {/* Contact List */}
          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? "No contacts found" : "No contacts available"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.user_id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => toggleContact(contact.user_id)}
                  >
                    <Checkbox
                      checked={selectedContacts.has(contact.user_id)}
                      onCheckedChange={() => toggleContact(contact.user_id)}
                    />
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={contact.avatar_url} />
                      <AvatarFallback>
                        {contact.display_name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{contact.display_name || "Unknown"}</p>
                      {contact.email && (
                        <p className="text-sm text-muted-foreground">{contact.email}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              {t('screens.events.cancel')}
            </Button>
            <Button onClick={handleConfirm} disabled={selectedContacts.size === 0}>
              Invite {selectedContacts.size} {selectedContacts.size === 1 ? "Person" : "People"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
