import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Users, Trash2 } from "lucide-react";
import {
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogDescription,
  ResponsiveConfirmDialogFooter,
  ResponsiveConfirmDialogHeader,
  ResponsiveConfirmDialogTitle,
  ResponsiveConfirmDialogTrigger,
} from "@/components/ui/responsive-confirm-dialog";
import { removeDeviceContacts } from "@/lib/connected-apps-client";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { useContacts } from "@/hooks/useContacts";
import AddContactDialog from "./AddContactDialog";
import ContactListItem from "./ContactListItem";
import ImportContactsButton from "./ImportContactsButton";
import { notify, notifyError, t } from '@/lib/i18n-toast';

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
    searchContacts,
    refetch,
  } = useContacts();

  const [showAddContact, setShowAddContact] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const hasPhoneContacts = contacts.some((c) => c.source === "android");

  // VTID-05058: remove everything imported from the phone (gateway DELETE).
  const handleRemovePhoneContacts = useCallback(async () => {
    try {
      await removeDeviceContacts();
      notify('mailhub.findFriends.remove.done');
      await refetch();
    } catch (err) {
      console.error("Error removing phone contacts:", err);
      notifyError('mailhub.findFriends.errors.unknown.title');
    }
  }, [refetch]);

  const handleDeleteContact = useCallback(async (contactId: string) => {
    await deleteContact(contactId);
  }, [deleteContact]);

  // The invite itself opens in the member's own app (InviteContactButton);
  // afterwards the list shows the contact as invited.
  const handleInvited = useCallback(() => {
    void refetch();
  }, [refetch]);

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
      {/* VTID-04440: two equal columns so both fit a 390px phone. */}
      <div className="mb-4 me-3 grid grid-cols-2 gap-2 [&>*]:min-w-0 [&_button]:w-full [&_button]:min-h-10">
        <Button onClick={() => setShowAddContact(true)} className="truncate">
          <Plus className="w-4 h-4 me-2 shrink-0" />
          <span className="truncate">{t('screens.contacts.addContact')}</span>
        </Button>
        <div><ImportContactsButton onImportComplete={() => void refetch()} /></div>
      </div>

      {/* Search Bar */}
      {contacts.length > 0 && (
        <div className="mb-4 me-3">
          <ExpandableSearchButton
            onSearch={handleSearch}
            placeholder={t('screens.contacts.searchContactsByNamePhone')}
          />
        </div>
      )}

      {/* Contact Lists */}
      {/* VTID-05058: Radix's viewport is display:table, so a long name widened
          the rows past the screen and cut off Message / Invite; and Radix
          defaults to LTR, so rows did not flip in Arabic. */}
      <ScrollArea
        className="flex-1 [&_[data-radix-scroll-area-viewport]>div]:!block"
        dir={typeof document !== "undefined" && document.documentElement.dir === "rtl" ? "rtl" : "ltr"}
      >
        {contacts.length === 0 ? (
          // Empty State
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">{t('screens.contacts.noContactsYet')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('screens.contacts.addContactsEasilyFindMessageThem')}
            </p>
            <div className="flex flex-col items-center gap-2">
              <ImportContactsButton size="lg" onImportComplete={() => void refetch()} />
              <Button variant="ghost" onClick={() => setShowAddContact(true)}>
                <Plus className="w-4 h-4 me-2" />
                {t('screens.contacts.addYourFirstContact')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pb-4">
            {/* Section 1: On VITANA */}
            {filteredPlatformContacts.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 px-1 text-sm text-muted-foreground uppercase tracking-wide">{t('screens.contacts.vitanaLength', { length: filteredPlatformContacts.length })}
                </h3>
                <div className="space-y-2 me-3">
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
                <h3 className="font-semibold mb-3 px-1 text-sm text-muted-foreground uppercase tracking-wide">{t('screens.contacts.inviteVitanaLength', { length: filteredNonPlatformContacts.length })}
                </h3>
                <div className="space-y-2 me-3">
                  {filteredNonPlatformContacts.map((contact) => (
                    <ContactListItem
                      key={contact.id}
                      contact={contact}
                      variant="invite"
                      onInvite={handleInvited}
                      onDelete={handleDeleteContact}
                    />
                  ))}
                </div>
              </div>
            )}

            {hasPhoneContacts && !searchQuery && (
              <div className="pt-2 me-3 flex justify-center">
                <ResponsiveConfirmDialog>
                  <ResponsiveConfirmDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground min-h-10" data-testid="remove-phone-contacts">
                      <Trash2 className="w-3.5 h-3.5 me-1.5" aria-hidden />
                      {t('mailhub.findFriends.remove.button')}
                    </Button>
                  </ResponsiveConfirmDialogTrigger>
                  <ResponsiveConfirmDialogContent>
                    <ResponsiveConfirmDialogHeader>
                      <ResponsiveConfirmDialogTitle>{t('mailhub.findFriends.remove.confirmTitle')}</ResponsiveConfirmDialogTitle>
                      <ResponsiveConfirmDialogDescription>{t('mailhub.findFriends.remove.confirmBody')}</ResponsiveConfirmDialogDescription>
                    </ResponsiveConfirmDialogHeader>
                    <ResponsiveConfirmDialogFooter>
                      <ResponsiveConfirmDialogCancel>{t('screens.contacts.cancel')}</ResponsiveConfirmDialogCancel>
                      <ResponsiveConfirmDialogAction
                        onClick={() => void handleRemovePhoneContacts()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t('mailhub.findFriends.remove.confirm')}
                      </ResponsiveConfirmDialogAction>
                    </ResponsiveConfirmDialogFooter>
                  </ResponsiveConfirmDialogContent>
                </ResponsiveConfirmDialog>
              </div>
            )}

            {/* No Results */}
            {searchQuery && 
             filteredPlatformContacts.length === 0 && 
             filteredNonPlatformContacts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t('screens.contacts.noContactsFoundMatchingSearchquery', { searchQuery })}
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
