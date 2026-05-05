import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import type { ExternalContact } from "@/types/audience";
import { t } from '@/lib/i18n-toast';

interface ManualContactEntryProps {
  contacts: ExternalContact[];
  onContactsChange: (contacts: ExternalContact[]) => void;
  maxContacts?: number;
}

export function ManualContactEntry({ 
  contacts, 
  onContactsChange, 
  maxContacts = 10 
}: ManualContactEntryProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addNewContact = () => {
    if (contacts.length >= maxContacts) return;
    onContactsChange([...contacts, { name: '', email: '', phone: '', whatsapp_number: '' }]);
    setEditingIndex(contacts.length);
  };

  const updateContact = (index: number, field: keyof ExternalContact, value: string) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    onContactsChange(updated);
  };

  const removeContact = (index: number) => {
    const updated = contacts.filter((_, i) => i !== index);
    onContactsChange(updated);
    if (editingIndex === index) setEditingIndex(null);
  };

  const isContactValid = (contact: ExternalContact): boolean => {
    return !!(contact.name && (contact.email || contact.phone || contact.whatsapp_number));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{t('screens.sharing.manualEntry')}</h3>
          <p className="text-sm text-muted-foreground">
            Add up to {maxContacts} contacts manually
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={addNewContact}
          disabled={contacts.length >= maxContacts}
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('screens.sharing.addContact')}
        </Button>
      </div>

      {contacts.length === 0 ? (
        <Card className="p-6 text-center border-dashed">
          <p className="text-sm text-muted-foreground">
            {t('screens.sharing.noContactsAddedYetClickAdd')}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact, idx) => (
            <Card key={idx} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium">Contact {idx + 1}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => removeContact(idx)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor={`name-${idx}`} className="text-xs">
                    {t('screens.sharing.name')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`name-${idx}`}
                    placeholder={t('screens.sharing.johnDoe')}
                    value={contact.name}
                    onChange={(e) => updateContact(idx, 'name', e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor={`email-${idx}`} className="text-xs">
                      {t('screens.sharing.email')}
                    </Label>
                    <Input
                      id={`email-${idx}`}
                      type="email"
                      placeholder={t('screens.sharing.johnExampleCom')}
                      value={contact.email || ''}
                      onChange={(e) => updateContact(idx, 'email', e.target.value)}
                      className="h-9"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`phone-${idx}`} className="text-xs">
                      {t('screens.sharing.phone')}
                    </Label>
                    <Input
                      id={`phone-${idx}`}
                      type="tel"
                      placeholder="+1234567890"
                      value={contact.phone || ''}
                      onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                      className="h-9"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`whatsapp-${idx}`} className="text-xs">
                      {t('screens.sharing.whatsapp')}
                    </Label>
                    <Input
                      id={`whatsapp-${idx}`}
                      type="tel"
                      placeholder="+1234567890"
                      value={contact.whatsapp_number || ''}
                      onChange={(e) => updateContact(idx, 'whatsapp_number', e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>

                {!isContactValid(contact) && contact.name && (
                  <p className="text-xs text-destructive">
                    ⚠️ Please provide at least one contact method (email, phone, or WhatsApp)
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {contacts.length} / {maxContacts} contacts added
        {contacts.length > 0 && ` • ${contacts.filter(isContactValid).length} valid`}
      </p>
    </div>
  );
}
