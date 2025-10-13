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
        
        const { data, error } = await supabase.functions.invoke('generate-maxina-summer-events');
        
        if (error) throw error;
        
        console.log('[InitEvents] Generation complete:', data);
        setStatus('success');
        setMessage(`Successfully generated ${data?.generatedCount || 0} events!`);
        
        toast({
          title: "Events Generated",
          description: `${data?.generatedCount || 0} Maxina Summer 2026 events created`,
        });

        // Redirect after 2 seconds
        setTimeout(() => {
          navigate('/admin/community/events');
        }, 2000);
        
      } catch (err: any) {
        console.error('[InitEvents] Error:', err);
        setStatus('error');
        setMessage(err.message || 'Failed to generate events');
        
        toast({
          title: "Generation Failed",
          description: err.message || 'Failed to generate events',
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
            <p className="text-lg font-medium text-destructive">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}
