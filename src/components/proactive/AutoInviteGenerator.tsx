import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Copy, Send, RefreshCw } from "lucide-react";
import { useProfile } from '@/context/ProfileProvider';
import { notify, t } from '@/lib/i18n-toast';

const inviteTemplates = [
  {
    tone: 'friendly',
    template: (name: string) => `Hey! 👋 I've been using Vitana and it's amazing - thought you'd love it too! It's a wellness community where we support each other's health journeys. Join me? 🌟`
  },
  {
    tone: 'inspiring',
    template: (name: string) => `${name}, I've found this incredible wellness platform called Vitana that's transforming how I approach health. The community is so supportive! Would love for you to join me on this journey 💪✨`
  },
  {
    tone: 'casual',
    template: (name: string) => `Yo! Found this cool app called Vitana for wellness stuff. Pretty awesome community. You should check it out 🚀`
  }
];

export function AutoInviteGenerator() {
  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const { profile } = useProfile();

  const generateMessage = () => {
    setGenerating(true);
    
    // Simulate AI generation with template rotation
    const randomTemplate = inviteTemplates[Math.floor(Math.random() * inviteTemplates.length)];
    const generated = randomTemplate.template(profile?.displayName || 'Friend');
    
    setTimeout(() => {
      setMessage(generated);
      setGenerating(false);
      notify('toasts.proactive.messageGenerated', 'toasts.proactive.feelFreeCustomizeItBeforeSending');
    }, 1000);
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(message);
    notify('toasts.proactive.copied', 'toasts.proactive.invitationMessageCopiedClipboard');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {t('screens.proactive.autogenerateInviteMessages')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('screens.proactive.createPersonalizedInvitationsThatInspireYour')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-sm font-medium">
            💡 <strong>{t('screens.proactive.proTip')}</strong> Personal invites get 3x more responses than generic messages. 
            Our AI crafts authentic invitations that reflect your wellness journey!
          </p>
        </div>

        <Textarea
          placeholder={t('screens.proactive.clickGenerateCreatePersonalizedInviteMessage')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          className="resize-none"
        />

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={generateMessage}
            disabled={generating}
            className="gap-2"
          >
            {generating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generating ? 'Generating...' : 'Generate Message'}
          </Button>

          {message && (
            <>
              <Button
                variant="outline"
                onClick={copyMessage}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                {t('screens.proactive.copy')}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  // Navigate to contacts to send (SPA-safe navigation)
                  window.history.pushState({}, '', '/contacts');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {t('screens.proactive.sendContacts')}
              </Button>
            </>
          )}
        </div>

        {/* Educational stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">3x</div>
            <div className="text-xs text-muted-foreground">{t('screens.proactive.higherResponseRate')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">72%</div>
            <div className="text-xs text-muted-foreground">{t('screens.proactive.joinWithin24hrs')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">5+</div>
            <div className="text-xs text-muted-foreground">{t('screens.proactive.avgFriendReferrals')}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
