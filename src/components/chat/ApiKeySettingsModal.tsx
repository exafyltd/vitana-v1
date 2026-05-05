import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from "lucide-react";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface ApiKeySettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiKeySettingsModal({ open, onOpenChange }: ApiKeySettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!apiKey.trim()) {
      notifyError('toasts.chat.error', 'toasts.chat.pleaseEnterApiKey');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Encrypt the API key using the database function
      const { data: encryptedKey, error: encryptError } = await supabase.rpc(
        'encrypt_api_key',
        { api_key_text: apiKey.trim() }
      );

      if (encryptError) {
        // If encryption fails, it's likely the Vault key isn't set up
        throw new Error(
          "API key encryption not configured. Please contact support to set up secure key storage."
        );
      }

      const { error } = await supabase
        .from("user_api_keys")
        .upsert([{
          user_id: user.id,
          service_name: "google_cloud",
          api_key: "", // Deprecated - encrypted_key is now used
          encrypted_key: encryptedKey as string,
          updated_at: new Date().toISOString(),
        }], {
          onConflict: "user_id,service_name"
        });

      if (error) throw error;

      notify('toasts.chat.success', 'toasts.chat.apiKeySavedSecurelyWithEncryption');
      
      onOpenChange(false);
      setApiKey("");
    } catch (error) {
      console.error("Error saving API key:", error);
      notifyError('toasts.chat.error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('screens.chat.googleCloudApiKey')}</DialogTitle>
          <DialogDescription>
            Enter your Google Cloud API key to enable voice AI features (Speech-to-Text and Text-to-Speech).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">{t('screens.chat.apiKey')}</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder={t('screens.chat.enterYourGoogleCloudApiKey')}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isSaving}
            />
            <p className="text-sm text-muted-foreground">
              Your API key is stored securely and only used for AI voice features.
            </p>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium">{t('screens.chat.getYourGoogleCloudApiKey')}</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t('screens.chat.googleCloudConsole')}</a></li>
              <li>{t('screens.chat.enableCloudSpeechtotextApiCloudTexttospeech')}</li>
              <li>{t('screens.chat.createApiKeyCredentials')}</li>
              <li>{t('screens.chat.pasteItHere')}</li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save API Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
