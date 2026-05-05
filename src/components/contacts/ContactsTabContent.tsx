import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Users } from "lucide-react";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { useContacts } from "@/hooks/useContacts";
import AddContactDialog from "./AddContactDialog";
import ContactListItem from "./ContactListItem";
import ImportContactsButton from "./ImportContactsButton";
import { t } from '@/lib/i18n-toast';

interface ContactsTabContentProps {
  onStartConversation: (userId: string) => void;
  messageContext: 'global' | 'tenant';
}

export default function ContactsTabContent({ onStartConversation, messageContext }: ContactsTabContentProps) {
  const {
    contacts,
    platformContacts,
    nonPlatformContacts,
    isLoading,
    addContact,
    deleteContact,
    inviteContact,
    searchContacts,
    importFromConversations,
  } = useContacts();

  const [showAddContact, setShowAddContact] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleImportContacts = useCallback(async (importedContacts: Array<{
    contact_name: string;
    contact_phone?: string;
    contact_email?: string;
  }>) => {
    // Bulk add contacts
    for (const contact of importedContacts) {
      await addContact(contact);
    }
  }, [addContact]);

  const handleDeleteContact = useCallback(async (contactId: string) => {
    await deleteContact(contactId);
  }, [deleteContact]);

  const handleInviteContact = useCallback(async (contactId: string) => {
    // Default to SMS for now
    await inviteContact(contactId, 'sms');
  }, [inviteContact]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);


  // Filter contacts based on search
  const filteredPlatformContacts = searchQuery
    ? searchContacts(searchQuery).filter(c => c.is_on_platform)
    : platformContacts;

  const filteredNonPlatformContacts = searchQuery
    ? searchContacts(searchQuery).filter(c => !c.is_on_platform)
    : nonPlatformContacts;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      {/* Header Actions */}
      <div className="mb-4 mr-3 flex gap-2">
        <Button onClick={() => setShowAddContact(true)} className="flex-1">
          <Plus className="w-4 h-4 mr-2" />
          {t('screens.contacts.addContact')}
        </Button>
        <ImportContactsButton onImport={handleImportContacts} />
      </div>

      {/* Search Bar */}
      {contacts.length > 0 && (
        <div className="mb-4 mr-3">
          <ExpandableSearchButton
            onSearch={handleSearch}
            placeholder={t('screens.contacts.searchContactsByNamePhone')}
          />
        </div>
      )}

      {/* Contact Lists */}
      <ScrollArea className="flex-1">
        {contacts.length === 0 ? (
          // Empty State
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">{t('screens.contacts.noContactsYet')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('screens.contacts.addContactsEasilyFindMessageThem')}
            </p>
            <Button onClick={() => setShowAddContact(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('screens.contacts.addYourFirstContact')}
            </Button>
          </div>
        ) : (
          <div className="space-y-6 pb-4">
            {/* Section 1: On VITANA */}
            {filteredPlatformContacts.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 px-1 text-sm text-muted-foreground uppercase tracking-wide">
                  On VITANA ({filteredPlatformContacts.length})
                </h3>
                <div className="space-y-2 mr-3">
                  {filteredPlatformContacts.map((contact) => (
                    <ContactListItem
                      key={contact.id}
                      contact={contact}
                      variant="on-platform"
                      onMessage={(userId) => {
                        onStartConversation(userId);
                      }}
                      onDelete={handleDeleteContact}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: Invite to VITANA */}
            {filteredNonPlatformContacts.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 px-1 text-sm text-muted-foreground uppercase tracking-wide">
                  Invite to VITANA ({filteredNonPlatformContacts.length})
                </h3>
                <div className="space-y-2 mr-3">
                  {filteredNonPlatformContacts.map((contact) => (
                    <ContactListItem
                      key={contact.id}
                      contact={contact}
                      variant="invite"
                      onInvite={handleInviteContact}
                      onDelete={handleDeleteContact}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {searchQuery && 
             filteredPlatformContacts.length === 0 && 
             filteredNonPlatformContacts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No contacts found matching "{searchQuery}"
                </p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Add Contact Dialog */}
      <AddContactDialog
        open={showAddContact}
        onOpenChange={setShowAddContact}
        onAdd={addContact}
      />
    </>
  );
}
