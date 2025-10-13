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
    setStatus('success');
    setMessage('Please run the SQL script to generate events');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-8">
      <div className="max-w-3xl w-full bg-card rounded-lg shadow-lg p-8 space-y-6">
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 mx-auto text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Generate 40 Summer Events</h1>
          <p className="text-muted-foreground">
            Run the SQL script below in your Supabase SQL Editor to instantly create all 40 Maxina Summer 2026 events.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Instructions:</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Click the "Open SQL Editor" button below</li>
            <li>Copy the SQL from <code className="bg-muted px-2 py-1 rounded text-xs">supabase/seed-maxina-events.sql</code></li>
            <li>Paste it into the SQL editor</li>
            <li>Click "Run" to insert all 40 events instantly</li>
            <li>Return here and click "View Events" below</li>
          </ol>
        </div>

        <div className="flex gap-4 justify-center">
          <a
            href="https://supabase.com/dashboard/project/inmkhvwdcuyhnxkgfvsb/sql/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Open SQL Editor →
          </a>
          <button
            onClick={() => navigate('/admin/community/events')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-medium"
          >
            View Events
          </button>
        </div>
      </div>
    </div>
  );
}
