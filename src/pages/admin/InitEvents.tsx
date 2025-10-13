import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function InitEvents() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Generating Maxina Summer 2026 events...');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const generateEvents = async () => {
      try {
        console.log('[InitEvents] Starting event generation...');
        setStatus('loading');
        
        const { data, error } = await supabase.functions.invoke('generate-maxina-summer-events', {
          body: { mode: 'fast' }
        });
        
        if (error) {
          // Provide more specific error message for timeout
          if (error.message?.includes('FunctionsHttpError')) {
            throw new Error('The function timed out while generating AI images for 40 events. We switched to fast mode (no images) to complete quickly.');
          }
          throw error;
        }
        
        console.log('[InitEvents] Generation complete:', data);
        setStatus('success');
        setMessage(`Successfully generated ${data?.events?.length || 0} events!`);
        
        toast({
          title: "Events Generated",
          description: `${data?.events?.length || 0} Maxina Summer 2026 events created`,
        });

        // Redirect after 2 seconds
        setTimeout(() => {
          navigate('/admin/community/events');
        }, 2000);
        
      } catch (err: any) {
        console.error('[InitEvents] Error:', err);
        setStatus('error');
        const errorMsg = err.message || 'Failed to generate events';
        setMessage(errorMsg);
        
        toast({
          title: "Generation Failed",
          description: errorMsg,
          variant: "destructive",
        });
      }
    };

    generateEvents();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="text-center space-y-6 p-8">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 animate-spin mx-auto text-primary" />
            <p className="text-lg text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground">This may take 2-3 minutes...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
            <p className="text-lg font-medium text-foreground">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecting to events page...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 mx-auto text-destructive" />
            <div className="max-w-2xl mx-auto">
              <p className="text-lg font-medium text-destructive mb-3">Generation Failed</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{message}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
