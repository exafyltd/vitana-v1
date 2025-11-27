import { useState, useEffect } from "react";
import { Users, Upload, PenLine, Target } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useContacts } from "@/hooks/useContacts";
import { CsvContactUploader } from "./CsvContactUploader";
import { ManualContactEntry } from "./ManualContactEntry";
import { ChannelEligibilityBadges } from "./ChannelEligibilityBadges";
import type { AudienceData, ExternalContact } from "@/types/audience";

interface AudienceSelectorProps {
  audienceData?: AudienceData;
  onAudienceChange: (data: AudienceData) => void;
  selectedChannels?: string[];
}

export function AudienceSelector({ 
  audienceData, 
  onAudienceChange,
  selectedChannels = []
}: AudienceSelectorProps) {
  const { contacts } = useContacts();
  
  const [vitanaContactsEnabled, setVitanaContactsEnabled] = useState(
    audienceData?.vitanaContacts?.enabled || false
  );
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(
    audienceData?.vitanaContacts?.contactIds || []
  );
  
  const [csvEnabled, setCsvEnabled] = useState(audienceData?.csvUpload?.enabled || false);
  const [csvContacts, setCsvContacts] = useState<ExternalContact[]>(
    audienceData?.csvUpload?.data || []
  );
  
  const [manualEnabled, setManualEnabled] = useState(audienceData?.manualContacts?.enabled || false);
  const [manualContacts, setManualContacts] = useState<ExternalContact[]>(
    audienceData?.manualContacts?.data || []
  );

  // Calculate eligibility whenever sources change
  useEffect(() => {
    const allContacts: ExternalContact[] = [];
    
    // Gather all contacts from enabled sources
    if (vitanaContactsEnabled) {
      const selected = contacts.filter(c => selectedContactIds.includes(c.id));
      allContacts.push(...selected.map(c => ({
        name: c.contact_name,
        email: c.contact_email || undefined,
        phone: c.contact_phone || undefined,
        whatsapp_number: c.contact_phone || undefined // Use phone as fallback
      })));
    }
    
    if (csvEnabled) {
      allContacts.push(...csvContacts);
    }
    
    if (manualEnabled) {
      allContacts.push(...manualContacts);
    }
    
    // Calculate unique recipients by email/phone
    const uniqueEmails = new Set(allContacts.map(c => c.email).filter(Boolean));
    const uniquePhones = new Set(allContacts.map(c => c.phone).filter(Boolean));
    const uniqueWhatsApp = new Set(
      allContacts.map(c => c.whatsapp_number || c.phone).filter(Boolean)
    );
    
    const eligibility = {
      email: uniqueEmails.size,
      sms: uniquePhones.size,
      whatsapp: uniqueWhatsApp.size,
      total: new Set([...uniqueEmails, ...uniquePhones]).size
    };
    
    // Update parent with all audience data
    onAudienceChange({
      vitanaContacts: vitanaContactsEnabled ? {
        enabled: true,
        contactIds: selectedContactIds
      } : undefined,
      csvUpload: csvEnabled ? {
        enabled: true,
        data: csvContacts
      } : undefined,
      manualContacts: manualEnabled ? {
        enabled: true,
        data: manualContacts
      } : undefined,
      eligibility
    });
  }, [
    vitanaContactsEnabled,
    selectedContactIds,
    csvEnabled,
    csvContacts,
    manualEnabled,
    manualContacts,
    contacts,
    onAudienceChange
  ]);

  const handleContactToggle = (contactId: string) => {
    setSelectedContactIds(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2">Select Your Audience</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose one or more audience sources. You can combine multiple sources.
        </p>
        
        {/* Vitana Contacts */}
        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-3 p-4 border rounded-lg">
            <Checkbox
              checked={vitanaContactsEnabled}
              onCheckedChange={(checked) => setVitanaContactsEnabled(!!checked)}
              className="mt-0.5"
            />
            <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">Vitana Contacts</div>
              <div className="text-sm text-muted-foreground">
                Choose from your saved contacts
              </div>
              {vitanaContactsEnabled && (
                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                  {contacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No contacts available</p>
                  ) : (
                    contacts.map(contact => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedContactIds.includes(contact.id)}
                          onCheckedChange={() => handleContactToggle(contact.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{contact.contact_name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {contact.contact_email || contact.contact_phone || 'No contact info'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CSV Upload */}
        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-3 p-4 border rounded-lg">
            <Checkbox
              checked={csvEnabled}
              onCheckedChange={(checked) => setCsvEnabled(!!checked)}
              className="mt-0.5"
            />
            <Upload className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">External Contacts (CSV)</div>
              <div className="text-sm text-muted-foreground mb-3">
                Import contacts from a CSV file
              </div>
              {csvEnabled && (
                <CsvContactUploader
                  currentContacts={csvContacts}
                  onContactsImported={setCsvContacts}
                />
              )}
            </div>
          </div>
        </div>

        {/* Manual Entry */}
        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-3 p-4 border rounded-lg">
            <Checkbox
              checked={manualEnabled}
              onCheckedChange={(checked) => setManualEnabled(!!checked)}
              className="mt-0.5"
            />
            <PenLine className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">Manual Entry</div>
              <div className="text-sm text-muted-foreground mb-3">
                Add contacts manually (up to 10)
              </div>
              {manualEnabled && (
                <ManualContactEntry
                  contacts={manualContacts}
                  onContactsChange={setManualContacts}
                />
              )}
            </div>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="space-y-3 opacity-50 pointer-events-none">
          <div className="flex items-center gap-3 p-4 border rounded-lg">
            <Checkbox disabled />
            <Target className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">Community Segments</div>
              <div className="text-sm text-muted-foreground">Coming soon</div>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Eligibility */}
      {(vitanaContactsEnabled || csvEnabled || manualEnabled) && selectedChannels.length > 0 && (
        <div className="pt-6 border-t">
          <ChannelEligibilityBadges
            audienceData={audienceData || {}}
            selectedChannels={selectedChannels}
          />
        </div>
      )}
    </div>
  );
}
