import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Copy, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError, t } from '@/lib/i18n-toast';

export function GeminiApiKeySetup() {
  const [apiKey, setApiKey] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notify('toasts.admin.copied', 'toasts.admin.textCopiedClipboard');
  };

  const testConnection = async () => {
    if (!apiKey.trim()) {
      notifyError('toasts.admin.apiKeyRequired', 'toasts.admin.pleaseEnterYourGeminiApiKey');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Test the API key by making a simple request
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );

      if (response.ok) {
        setTestResult("success");
        notify('toasts.admin.apiKeyValid', 'toasts.admin.yourGeminiApiKeyWorkingCorrectly');
      } else {
        setTestResult("error");
        notifyError('toasts.admin.invalidApiKey', 'toasts.admin.apiKeyCouldNotVerified');
      }
    } catch (error) {
      setTestResult("error");
      notifyError('toasts.admin.connectionError', 'toasts.admin.failedTestApiKey');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{t('screens.admin.geminiLiveApiConfiguration')}</CardTitle>
        <CardDescription>
          Set up your Google Gemini API key for voice conversations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Get API Key */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              1
            </div>
            <h3 className="font-semibold">{t('screens.admin.getYourApiKey')}</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-8">
            Visit Google AI Studio to generate your Gemini API key
          </p>
          <Button
            variant="outline"
            className="ml-8"
            onClick={() => window.open("https://aistudio.google.com/app/apikey", "_blank")}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Google AI Studio
          </Button>
        </div>

        {/* Step 2: Test API Key */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              2
            </div>
            <h3 className="font-semibold">{t('screens.admin.testYourApiKey')}</h3>
          </div>
          <div className="ml-8 space-y-3">
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder={t('screens.admin.pasteYourApiKeyHereTest')}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1"
              />
              <Button onClick={testConnection} disabled={isTesting || !apiKey.trim()}>
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test"
                )}
              </Button>
            </div>
            {testResult === "success" && (
              <Alert className="bg-emerald-500/10 border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <AlertDescription className="text-emerald-500">
                  API key is valid and working!
                </AlertDescription>
              </Alert>
            )}
            {testResult === "error" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  API key validation failed. Please check your key and try again.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* Step 3: Add to Supabase */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              3
            </div>
            <h3 className="font-semibold">{t('screens.admin.addSupabaseSecrets')}</h3>
          </div>
          <div className="ml-8 space-y-3">
            <p className="text-sm text-muted-foreground">
              For security, store your API key in Supabase Edge Function secrets
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded text-sm">
                  GOOGLE_GEMINI_API_KEY
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard("GOOGLE_GEMINI_API_KEY")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  window.open(
                    "https://supabase.com/dashboard/project/inmkhvwdcuyhnxkgfvsb/settings/functions",
                    "_blank"
                  )
                }
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Supabase Edge Functions Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Step 4: Test Integration */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              4
            </div>
            <h3 className="font-semibold">{t('screens.admin.testIntegration')}</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-8">
            Once you've added the secret, click the "Start Stream" button in the sidebar to test the
            Gemini Live API connection
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{t('screens.admin.important')}</strong> Never commit API keys to your code repository. Always use
            environment variables or secure secret management.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
