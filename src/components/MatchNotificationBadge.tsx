import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { notify } from '@/lib/i18n-toast';

export function MatchNotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchUnreadCount();

    // Subscribe to new match notifications
    const channel = supabase
      .channel('match-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_notifications'
        },
        (payload) => {
          const notification = payload.new as any;
          if (notification.user_id === supabase.auth.getUser()) {
            setUnreadCount(prev => prev + 1);
            notify('toasts.common.newMatch', 'toasts.common.youVeMatchedWithSomeoneCheck');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const fetchUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('match_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      setUnreadCount(data?.length || 0);
    } catch (error) {
      console.error('Error fetching unread match count:', error);
    }
  };

  if (unreadCount === 0) return null;

  return (
    <div className="relative inline-block">
      <Heart className="w-5 h-5 text-primary" />
      <Badge 
        variant="destructive" 
        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
      >
        {unreadCount > 9 ? '9+' : unreadCount}
      </Badge>
    </div>
  );
}
