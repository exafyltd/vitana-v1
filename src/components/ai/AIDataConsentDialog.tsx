import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle, Brain, Mic, BookOpen, Heart, User, Share2, Target } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface AIDataConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConsent: () => void;
}

export function AIDataConsentDialog({ open, onOpenChange, onConsent }: AIDataConsentDialogProps) {
  const { translate } = useTranslation();

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-lg !z-[120]" overlayClassName="!z-[120]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-destructive" />
            {translate('consent.aiData.title', 'AI Data Sharing Disclosure')}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {translate('consent.aiData.subtitle', 'Before using AI features, please review how your data is used.')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-4">
          {/* What data is sent */}
          <div>
            <h4 className="font-semibold text-sm mb-2">
              {translate('consent.aiData.whatIsSent', 'What data may be sent')}
            </h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 flex-shrink-0" />
                <span>{translate('consent.aiData.voiceData', 'Voice recordings and transcripts')}</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 flex-shrink-0" />
                <span>{translate('consent.aiData.diaryData', 'Typed prompts, chat messages, and diary entries')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 flex-shrink-0" />
                <span>{translate('consent.aiData.memoryData', 'Memory Garden entries and wellness goals')}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 flex-shrink-0" />
                <span>{translate('consent.aiData.profileData', 'Profile context (name, preferences)')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 flex-shrink-0" />
                <span>{translate('consent.aiData.socialData', 'Social media profile URLs and bio text (when using import features)')}</span>
              </div>
            </div>
          </div>

          {/* Who receives it */}
          <Alert>
            <Heart className="w-4 h-4" />
            <AlertDescription>
              <span className="font-semibold">
                {translate('consent.aiData.recipientLabel', 'Recipient:')}
              </span>{' '}
              {translate('consent.aiData.recipient', 'Google (Gemini AI models) via the Lovable AI Gateway. Your data is transmitted securely via encrypted connections.')}
            </AlertDescription>
          </Alert>

          {/* Purpose */}
          <div>
            <h4 className="font-semibold text-sm mb-2">
              {translate('consent.aiData.purposeLabel', 'Purpose')}
            </h4>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Target className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{translate('consent.aiData.purpose', 'To generate personalized AI responses, voice synthesis, proactive greetings, health coaching, and profile enrichment suggestions.')}</span>
            </div>
          </div>

          {/* Privacy guarantees */}
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span>{translate('consent.aiData.notStored', 'Data is not permanently stored by the AI provider')}</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span>{translate('consent.aiData.revokeAnytime', 'You can revoke consent anytime in Settings > Privacy')}</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span>{translate('consent.aiData.gdprCompliant', 'Compliant with GDPR and privacy regulations')}</span>
            </div>
          </div>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter className="flex-col gap-3">
          <p className="text-xs text-muted-foreground text-center">
            {translate('consent.aiData.agreementFooter', "By tapping 'I Agree', you give Exafy LTD permission to send the data listed above to the named AI service providers. You can withdraw this permission at any time in Settings > Privacy.")}
          </p>
          <div className="flex gap-2 w-full justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {translate('consent.aiData.notNow', 'Not Now')}
            </Button>
            <Button onClick={onConsent}>
              {translate('consent.aiData.iAgree', 'I Agree')}
            </Button>
          </div>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
