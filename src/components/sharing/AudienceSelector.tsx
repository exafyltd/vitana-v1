import { useState, useEffect } from "react";
import { Users, Upload, PenLine, Target, Calendar } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useContacts } from "@/hooks/useContacts";
import { CsvContactUploader } from "./CsvContactUploader";
import { ManualContactEntry } from "./ManualContactEntry";
import { ChannelEligibilityBadges } from "./ChannelEligibilityBadges";
import type { AudienceData, ExternalContact } from "@/types/audience";
import { t } from '@/lib/i18n-toast';

interface AudienceSelectorProps {
  audienceData?: AudienceData;
  onAudienceChange: (data: AudienceData) => void;
  selectedChannels?: string[];
  eventContext?: {
    eventId: string;
    creatorId: string;
    location?: string;
    eventType?: string;
  };
}

export function AudienceSelector({ 
  audienceData, 
  onAudienceChange,
  selectedChannels = [],
  eventContext
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
      {/* Event-Based Audiences (if event context is provided) */}
      {eventContext && (
        <Card className="border-2 border-[hsl(var(--sys-ai-accent))]/20 bg-[hsl(var(--sys-ai-tint))]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[hsl(var(--sys-ai-accent))]" />
              {t('screens.sharing.eventbasedAudiences')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
              <Checkbox
                id="organizer-followers"
                checked={audienceData?.yourFollowers?.enabled || false}
                onCheckedChange={(checked) => {
                  onAudienceChange({
                    ...audienceData,
                    yourFollowers: {
                      enabled: checked as boolean,
                    },
                  });
                }}
              />
              <div className="flex-1">
                <Label htmlFor="organizer-followers" className="font-medium cursor-pointer">
                  {t('screens.sharing.yourFollowers')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('screens.sharing.peopleWhoFollowYouWillNotified')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
              <Checkbox
                id="event-attendees"
                checked={audienceData?.eventAttendees?.enabled || false}
                onCheckedChange={(checked) => {
                  onAudienceChange({
                    ...audienceData,
                    eventAttendees: {
                      enabled: checked as boolean,
                      eventIds: [eventContext.eventId],
                    },
                  });
                }}
              />
              <div className="flex-1">
                <Label htmlFor="event-attendees" className="font-medium cursor-pointer">
                  {t('screens.sharing.pastEventAttendees')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('screens.sharing.peopleWhoAttendedYourPreviousEvents')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div>
        <h3 className="font-semibold mb-2">{t('screens.sharing.selectYourAudience')}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('screens.sharing.chooseOneMoreAudienceSourcesYou')}
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
              <div className="font-medium">{t('screens.sharing.vitanaContacts')}</div>
              <div className="text-sm text-muted-foreground">
                Choose from your saved contacts
              </div>
              {vitanaContactsEnabled && (
                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                  {contacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('screens.sharing.noContactsAvailable')}</p>
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
              <div className="font-medium">{t('screens.sharing.externalContactsCsv')}</div>
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
              <div className="font-medium">{t('screens.sharing.manualEntry')}</div>
              <div className="text-sm text-muted-foreground mb-3">
                {t('screens.sharing.addContactsManuallyUp10')}
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
              <div className="font-medium">{t('screens.sharing.communitySegments')}</div>
              <div className="text-sm text-muted-foreground">{t('screens.sharing.comingSoon')}</div>
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
