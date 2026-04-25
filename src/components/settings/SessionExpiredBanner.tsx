import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SocialConnectionsFetchError } from "@/hooks/useGoogleConnect";

interface Props {
  error: unknown;
}

export function SessionExpiredBanner({ error }: Props) {
  if (!(error instanceof SocialConnectionsFetchError) || error.status !== 401) {
    return null;
  }

  const handleRefresh = async () => {
    try {
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !data.session) {
        window.location.href = "/maxina?tab=signin&next=" + encodeURIComponent(window.location.pathname);
        return;
      }
      window.location.reload();
    } catch {
      window.location.href = "/maxina?tab=signin&next=" + encodeURIComponent(window.location.pathname);
    }
  };

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Your session expired</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <span>Sign in again to see your connected apps. Your existing connections are safe — they'll reappear once you're signed back in.</span>
        <div>
          <Button size="sm" variant="secondary" onClick={handleRefresh}>
            Refresh session
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
