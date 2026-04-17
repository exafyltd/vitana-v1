import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isAppilix, getNativeFcmToken } from '@/lib/appilix';
import { useAuth } from '@/context/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { initializePushNotifications } from '@/lib/pushNotifications';
import { toast } from 'sonner';

interface DiagnosticItem {
  label: string;
  value: string;
  status: 'ok' | 'warning' | 'error' | 'info';
}

export default function PushDiagnostics() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<DiagnosticItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const results: DiagnosticItem[] = [];

    // 1. Appilix detection
    const inAppilix = isAppilix();
    results.push({
      label: 'Appilix WebView',
      value: inAppilix ? 'Yes' : 'No (browser)',
      status: 'info',
    });

    // 2. Appilix native FCM token
    if (inAppilix) {
      const nativeToken = getNativeFcmToken();
      results.push({
        label: 'Appilix FCM Token',
        value: nativeToken ? `${nativeToken.slice(0, 20)}...` : 'Not available',
        status: nativeToken ? 'ok' : 'warning',
      });
    }

    // 3. Service Worker
    let swStatus = 'Not supported';
    let swOk = false;
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
        if (reg?.active) {
          swStatus = 'Active';
          swOk = true;
        } else if (reg) {
          swStatus = 'Registered (not active)';
        } else {
          swStatus = 'Not registered';
        }
      } catch {
        swStatus = 'Error checking';
      }
    }
    results.push({
      label: 'Service Worker',
      value: swStatus,
      status: swOk ? 'ok' : 'warning',
    });

    // 4. Notification permission
    let permStatus = 'Not supported';
    if ('Notification' in window) {
      permStatus = Notification.permission;
    }
    results.push({
      label: 'Notification Permission',
      value: permStatus,
      status: permStatus === 'granted' ? 'ok' : permStatus === 'denied' ? 'error' : 'warning',
    });

    // 5. FCM token in memory
    const storedToken = localStorage.getItem('vitana_fcm_token');
    results.push({
      label: 'FCM Token (local)',
      value: storedToken ? `${storedToken.slice(0, 20)}...` : 'Not stored',
      status: storedToken ? 'ok' : 'warning',
    });

    // 6. Device tokens in DB
    if (user?.id) {
      try {
        const { data: tokens, error } = await (supabase as any)
          .from('user_device_tokens')
          .select('fcm_token, device_label, updated_at')
          .eq('user_id', user.id);

        if (error) {
          results.push({
            label: 'DB Tokens',
            value: `Error: ${error.message}`,
            status: 'error',
          });
        } else {
          const count = tokens?.length || 0;
          results.push({
            label: 'DB Tokens',
            value: count === 0 ? 'None registered' : `${count} token(s)`,
            status: count > 0 ? 'ok' : 'error',
          });
          if (tokens?.length > 0) {
            const latest = tokens[0];
            results.push({
              label: 'Latest Token Updated',
              value: latest.updated_at ? new Date(latest.updated_at).toLocaleString() : 'Unknown',
              status: 'info',
            });
          }
        }
      } catch {
        results.push({
          label: 'DB Tokens',
          value: 'Query failed',
          status: 'error',
        });
      }

      // 7. Notification preferences
      try {
        const { data: prefs } = await (supabase as any)
          .from('user_notification_preferences')
          .select('push_enabled, dnd_enabled')
          .eq('user_id', user.id)
          .maybeSingle();

        if (prefs) {
          results.push({
            label: 'Push Enabled (prefs)',
            value: prefs.push_enabled === false ? 'OFF' : 'ON',
            status: prefs.push_enabled === false ? 'error' : 'ok',
          });
          results.push({
            label: 'DND Enabled',
            value: prefs.dnd_enabled ? 'ON' : 'OFF',
            status: prefs.dnd_enabled ? 'warning' : 'ok',
          });
        } else {
          results.push({
            label: 'Push Preferences',
            value: 'No row (defaults apply — push ON)',
            status: 'ok',
          });
        }
      } catch {}
    }

    // 8. User ID
    results.push({
      label: 'User ID',
      value: user?.id ? `${user.id.slice(0, 8)}...${user.id.slice(-4)}` : 'Not authenticated',
      status: user?.id ? 'info' : 'error',
    });

    setItems(results);
    setLoading(false);
  };

  useEffect(() => {
    if (expanded && items.length === 0) {
      runDiagnostics();
    }
  }, [expanded]);

  const handleForceRefresh = async () => {
    setRefreshing(true);
    try {
      await initializePushNotifications();
      toast.success('Push notifications re-initialized');
      await runDiagnostics();
    } catch (err: any) {
      toast.error('Re-init failed: ' + (err?.message || 'unknown error'));
    } finally {
      setRefreshing(false);
    }
  };

  const statusColor = (status: DiagnosticItem['status']) => {
    switch (status) {
      case 'ok': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'warning': return 'bg-amber-500/10 text-amber-700 border-amber-200';
      case 'error': return 'bg-red-500/10 text-red-700 border-red-200';
      default: return 'bg-blue-500/10 text-blue-700 border-blue-200';
    }
  };

  return (
    <Card className="rounded-2xl border-border/50 shadow-sm">
      <CardContent className="p-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <span className="text-xs font-medium text-muted-foreground">Push Notification Diagnostics</span>
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>

        {expanded && (
          <div className="mt-3 space-y-2">
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-4">Running diagnostics...</p>
            ) : (
              <>
                {items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${statusColor(item.status)}`}>
                      {item.value}
                    </Badge>
                  </div>
                ))}

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={runDiagnostics}
                    className="text-xs flex-1"
                  >
                    Re-check
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleForceRefresh}
                    disabled={refreshing}
                    className="text-xs flex-1"
                  >
                    {refreshing ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                    Force Re-register
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
