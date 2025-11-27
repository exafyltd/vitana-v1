import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useContacts } from "@/hooks/useContacts";
import { Users, Upload, Filter, CheckCircle2, AlertCircle, Mail, Phone, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudienceSelectorProps {
  selectedChannels: Record<string, boolean>;
  onAudienceChange: (audienceData: {
    type: 'contacts' | 'segments' | 'csv';
    data: any;
    recipientCount: number;
  }) => void;
}

export function AudienceSelector({ selectedChannels, onAudienceChange }: AudienceSelectorProps) {
  const { contacts, isLoading: contactsLoading } = useContacts();
  const [audienceType, setAudienceType] = useState<'contacts' | 'segments' | 'csv'>('contacts');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRecipientCount, setCsvRecipientCount] = useState(0);

  // Check if any direct messaging channels are selected
  const hasDirectMessaging = ['email', 'sms', 'whatsapp'].some(ch => selectedChannels[ch]);

  // Filter contacts that have the necessary contact info for selected channels
  const eligibleContacts = contacts?.filter(contact => {
    if (selectedChannels.email && contact.contact_email) return true;
    if (selectedChannels.sms && contact.contact_phone) return true;
    if (selectedChannels.whatsapp && contact.contact_phone) return true;
    return false;
  }) || [];

  // Calculate recipient count based on audience type
  const getRecipientCount = () => {
    if (audienceType === 'contacts') {
      return selectedContacts.size;
    } else if (audienceType === 'csv') {
      return csvRecipientCount;
    } else {
      return 0; // Segments - would calculate based on segment criteria
    }
  };

  // Notify parent of audience changes
  useEffect(() => {
    if (audienceType === 'contacts') {
      const selectedContactData = Array.from(selectedContacts).map(id => 
        eligibleContacts.find(c => c.id === id)
      ).filter(Boolean);
      
      onAudienceChange({
        type: 'contacts',
        data: selectedContactData,
        recipientCount: selectedContactData.length,
      });
    } else if (audienceType === 'csv' && csvFile) {
      onAudienceChange({
        type: 'csv',
        data: csvFile,
        recipientCount: csvRecipientCount,
      });
    }
  }, [audienceType, selectedContacts, csvFile, csvRecipientCount]);

  const handleContactToggle = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedContacts(new Set(eligibleContacts.map(c => c.id)));
  };

  const handleDeselectAll = () => {
    setSelectedContacts(new Set());
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
      // Parse CSV to count recipients (simplified - would need full CSV parser)
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        setCsvRecipientCount(Math.max(0, lines.length - 1)); // Subtract header row
      };
      reader.readAsText(file);
    }
  };

  if (!hasDirectMessaging) {
    return null; // Don't show audience selector if no direct messaging channels
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Select Your Audience</Label>
        <Badge variant="outline" className="gap-1">
          <Users className="w-3 h-3" />
          {getRecipientCount()} recipients
        </Badge>
      </div>

      <Alert className="bg-[hsl(var(--pill-hydration-tint))] border-[hsl(var(--pill-hydration-accent))]/20">
        <AlertCircle className="w-4 h-4 text-[hsl(var(--pill-hydration-accent))]" />
        <AlertDescription className="text-sm">
          Direct messaging requires audience selection. Choose from your contacts, segments, or upload a CSV list.
        </AlertDescription>
      </Alert>

      {/* Audience Type Selection */}
      <RadioGroup value={audienceType} onValueChange={(val) => setAudienceType(val as any)}>
        <div className="grid gap-3">
          <Card className={cn(
            "cursor-pointer transition-all border-2",
            audienceType === 'contacts' 
              ? "border-[hsl(var(--pill-nutrition-accent))] bg-[hsl(var(--pill-nutrition-tint))]" 
              : "border-border hover:border-muted-foreground/50"
          )}>
            <CardContent className="p-4" onClick={() => setAudienceType('contacts')}>
              <div className="flex items-start gap-3">
                <RadioGroupItem value="contacts" id="contacts" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4" />
                    <Label htmlFor="contacts" className="font-semibold cursor-pointer">
                      My Vitana Contacts
                    </Label>
                    <Badge variant="secondary" className="text-xs">
                      {eligibleContacts.length} available
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select from your existing contacts with verified contact info
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(
            "cursor-pointer transition-all border-2 opacity-60",
            audienceType === 'segments' 
              ? "border-[hsl(var(--pill-nutrition-accent))] bg-[hsl(var(--pill-nutrition-tint))]" 
              : "border-border hover:border-muted-foreground/50"
          )}>
            <CardContent className="p-4" onClick={() => setAudienceType('segments')}>
              <div className="flex items-start gap-3">
                <RadioGroupItem value="segments" id="segments" className="mt-1" disabled />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Filter className="w-4 h-4" />
                    <Label htmlFor="segments" className="font-semibold cursor-pointer">
                      Community Segments
                    </Label>
                    <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Target event attendees, group members, or custom segments
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(
            "cursor-pointer transition-all border-2",
            audienceType === 'csv' 
              ? "border-[hsl(var(--pill-nutrition-accent))] bg-[hsl(var(--pill-nutrition-tint))]" 
              : "border-border hover:border-muted-foreground/50"
          )}>
            <CardContent className="p-4" onClick={() => setAudienceType('csv')}>
              <div className="flex items-start gap-3">
                <RadioGroupItem value="csv" id="csv" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Upload className="w-4 h-4" />
                    <Label htmlFor="csv" className="font-semibold cursor-pointer">
                      Upload CSV List
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Import a custom recipient list (must include email or phone)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </RadioGroup>

      {/* Contact Selection */}
      {audienceType === 'contacts' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Select Recipients</Label>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                Clear
              </Button>
            </div>
          </div>

          {contactsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading contacts...
            </div>
          ) : eligibleContacts.length === 0 ? (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                No contacts found with the required contact information for selected channels.
                Add contacts with email or phone numbers first.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {eligibleContacts.map((contact) => {
                const isSelected = selectedContacts.has(contact.id);
                const hasConsent = true; // Would check actual consent status
                
                return (
                  <div
                    key={contact.id}
                    className={cn(
                      "flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer transition-colors",
                      isSelected ? "bg-[hsl(var(--pill-nutrition-tint))]" : "hover:bg-muted/50"
                    )}
                    onClick={() => handleContactToggle(contact.id)}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                      isSelected 
                        ? "border-[hsl(var(--pill-nutrition-accent))] bg-[hsl(var(--pill-nutrition-accent))]" 
                        : "border-border"
                    )}>
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{contact.contact_name}</span>
                        {hasConsent && (
                          <Badge variant="outline" className="text-xs gap-1 bg-[hsl(var(--pill-nutrition-tint))]">
                            <CheckCircle2 className="w-3 h-3" />
                            Opted in
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {contact.contact_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {contact.contact_email}
                          </span>
                        )}
                        {contact.contact_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {contact.contact_phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CSV Upload */}
      {audienceType === 'csv' && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Upload CSV File</Label>
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <Input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="max-w-xs mx-auto"
            />
            {csvFile && (
              <div className="mt-3 text-sm">
                <p className="font-medium">{csvFile.name}</p>
                <p className="text-muted-foreground">{csvRecipientCount} recipients found</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              CSV must include columns: name, email (for email campaigns) or phone (for SMS/WhatsApp)
            </p>
          </div>
        </div>
      )}

      {/* Channel Requirements */}
      <Alert className="bg-muted/50">
        <MessageSquare className="w-4 h-4" />
        <AlertDescription className="text-xs">
          <strong>Selected channels require:</strong>
          {selectedChannels.email && " Email addresses"}
          {(selectedChannels.sms || selectedChannels.whatsapp) && " Phone numbers"}
          {". Recipients without required info will be skipped."}
        </AlertDescription>
      </Alert>
    </div>
  );
}
