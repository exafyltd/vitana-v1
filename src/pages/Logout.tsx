import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { Loader2 } from "lucide-react";
import { t } from '@/lib/i18n-toast';

/**
 * Logout Page - For Appilix Mobile Drawer Integration
 * 
 * This page handles complete sign-out when triggered from the mobile app's
 * native drawer menu. It performs:
 * 1. Supabase session termination
 * 2. React Query cache clearing
 * 3. localStorage cleanup
 * 4. Redirect to /maxina portal
 */
export default function Logout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const performLogout = async () => {
      console.log('[Logout] Starting logout sequence...');
      
      // 1. Sign out from Supabase
      await signOut();
      console.log('[Logout] Supabase sign out complete');
      
      // 2. Clear React Query cache
      const queryClient = (window as any).queryClient;
      if (queryClient) {
        queryClient.clear();
        console.log('[Logout] React Query cache cleared');
      }
      
      // 3. Clear persisted localStorage cache + ORB state + AI consent
      localStorage.removeItem('vitana-query-cache');
      localStorage.removeItem('vitana_ai_consent_given');
      // Clear all ORB session keys to prevent cross-account leakage
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('orb_conversation_id') || key.startsWith('orb_') || key.startsWith('vitana.auth') || key.startsWith('vitana.user'))) {
          localStorage.removeItem(key);
        }
      }
      console.log('[Logout] localStorage cache + AI consent cleared');
      
      // 4. Redirect to Maxina portal
      navigate('/maxina', { replace: true });
    };
    
    performLogout();
  }, [signOut, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{t('screens.logout.signingOut')}</p>
      </div>
    </div>
  );
}
