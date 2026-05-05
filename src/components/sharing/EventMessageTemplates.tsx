import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface EventMessageTemplatesProps {
  templates: {
    email?: { subject: string; body: string };
    sms?: { body: string };
    whatsapp?: { body: string };
  };
  selectedChannels: Record<string, boolean>;
  onTemplateChange?: (channel: string, template: any) => void;
}

export function EventMessageTemplates({
  templates,
  selectedChannels,
  onTemplateChange,
}: EventMessageTemplatesProps) {
  const [emailSubject, setEmailSubject] = useState(templates.email?.subject || "");
  const [emailBody, setEmailBody] = useState(templates.email?.body || "");
  const [smsBody, setSmsBody] = useState(templates.sms?.body || "");
  const [whatsappBody, setWhatsappBody] = useState(templates.whatsapp?.body || "");

  const handleEmailChange = () => {
    onTemplateChange?.('email', { subject: emailSubject, body: emailBody });
  };

  const handleSmsChange = () => {
    onTemplateChange?.('sms', { body: smsBody });
  };

  const handleWhatsAppChange = () => {
    onTemplateChange?.('whatsapp', { body: whatsappBody });
  };

  return (
    <div className="space-y-4">
      {/* Email Template */}
      {selectedChannels.email && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="w-4 h-4" />
              Email Template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="email-subject">{t('screens.sharing.subjectLine')}</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => {
                  setEmailSubject(e.target.value);
                  handleEmailChange();
                }}
                placeholder="e.g., You're invited: Event Name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email-body">{t('screens.sharing.messageBody')}</Label>
              <Textarea
                id="email-body"
                value={emailBody}
                onChange={(e) => {
                  setEmailBody(e.target.value);
                  handleEmailChange();
                }}
                rows={10}
                placeholder="Email content..."
                className="mt-1 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {"{name}"} for recipient name and {"{event_link}"} for the event URL
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SMS Template */}
      {selectedChannels.sms && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="w-4 h-4" />
              SMS Template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="sms-body">{t('screens.sharing.messageBody')}</Label>
              <Textarea
                id="sms-body"
                value={smsBody}
                onChange={(e) => {
                  setSmsBody(e.target.value);
                  handleSmsChange();
                }}
                rows={5}
                placeholder="SMS content..."
                className="mt-1 font-mono text-sm"
                maxLength={160}
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-muted-foreground">
                  Use {"{event_link}"} for the event URL
                </p>
                <Badge variant={smsBody.length > 160 ? "destructive" : "secondary"}>
                  {smsBody.length}/160 chars
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* WhatsApp Template */}
      {selectedChannels.whatsapp && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="w-4 h-4" />
              WhatsApp Template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="whatsapp-body">{t('screens.sharing.messageBody')}</Label>
              <Textarea
                id="whatsapp-body"
                value={whatsappBody}
                onChange={(e) => {
                  setWhatsappBody(e.target.value);
                  handleWhatsAppChange();
                }}
                rows={8}
                placeholder="WhatsApp content..."
                className="mt-1 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use *bold*, _italic_, and {"{event_link}"} for the event URL
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
