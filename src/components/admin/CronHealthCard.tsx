import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, CheckCircle, PlayCircle, ExternalLink } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError } from '@/lib/i18n-toast';

export default function CronHealthCard() {
  const [triggering, setTriggering] = useState(false);
  const { toast } = useToast();

  const handleManualTrigger = async () => {
    setTriggering(true);
    try {
      const { error } = await supabase.functions.invoke('send-appointment-reminder', {
        body: { 
          triggered_by: 'admin_manual',
          timestamp: new Date().toISOString() 
        }
      });

      if (error) throw error;

      notify('toasts.admin.manualTriggerSuccessful', 'toasts.admin.appointmentReminderFunctionHasExecuted');
    } catch (error) {
      console.error('Error triggering function:', error);
      notifyError('toasts.admin.triggerFailed', 'toasts.admin.failedExecuteReminderFunction');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Cron Job Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            Running
          </Badge>
        </div>

        {/* Schedule Info */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Schedule:</span>
            <span className="font-medium">Every hour</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Function:</span>
            <span className="font-mono text-xs">send-appointment-reminder</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleManualTrigger}
            disabled={triggering}
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            {triggering ? 'Triggering...' : 'Manual Trigger'}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="w-full"
            onClick={() => window.open('https://supabase.com/dashboard/project/inmkhvwdcuyhnxkgfvsb/functions/send-appointment-reminder/logs', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Edge Function Logs
          </Button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-muted-foreground border-t pt-2">
          This cron job sends appointment reminders 24 hours and 1 hour before appointments.
        </p>
      </CardContent>
    </Card>
  );
}
