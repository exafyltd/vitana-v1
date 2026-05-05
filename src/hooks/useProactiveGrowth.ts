import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/context/ProfileProvider';
import { useAuth } from '@/context/AuthProvider';
import { notify, notifyError } from '@/lib/i18n-toast';

export interface GrowthAction {
  id: string;
  type: 'invite_contacts' | 'share_social' | 'import_contacts' | 'connect_channels';
  title: string;
  description: string;
  benefit: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
  cta: string;
  metadata?: Record<string, any>;
}

export function useProactiveGrowth() {
  const [actions, setActions] = useState<GrowthAction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { profile } = useProfile();
  const { user } = useAuth();

  const analyzeGrowthOpportunities = useCallback(async () => {
    if (!user?.id) return;

    try {
      const growthActions: GrowthAction[] = [];

      // Check contacts count
      const { count: contactsCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Check connected social platforms
      const connectedPlatforms = [
        profile.linkedin_url,
        profile.instagram_url,
        profile.facebook_url,
        profile.x_url,
        profile.youtube_url,
        profile.tiktok_url
      ].filter(Boolean).length;

      // Mock recent shares for now (would use activity tracking in production)
      const recentShares = 0;

      // Suggest importing contacts if count is low
      if ((contactsCount || 0) < 5) {
        growthActions.push({
          id: 'import_contacts',
          type: 'import_contacts',
          title: 'Import Your Contacts',
          description: 'Connect with people you know and grow together',
          benefit: '🚀 Users with 10+ contacts are 5x more engaged and get 3x more value from Vitana',
          icon: 'Users',
          priority: 'high',
          cta: 'Import Contacts',
          metadata: { currentCount: contactsCount || 0, targetCount: 10 }
        });
      }

      // Suggest inviting contacts if some exist but not many
      if ((contactsCount || 0) >= 5 && (contactsCount || 0) < 20) {
        growthActions.push({
          id: 'invite_contacts',
          type: 'invite_contacts',
          title: 'Invite Friends to Join',
          description: 'Send personalized invites to your contacts',
          benefit: '💎 For every friend who joins, you both earn 100 points + unlock exclusive community features',
          icon: 'Send',
          priority: 'high',
          cta: 'Send Invites',
          metadata: { contactsCount }
        });
      }

      // Suggest connecting social platforms
      if (connectedPlatforms < 2) {
        growthActions.push({
          id: 'connect_channels',
          type: 'connect_channels',
          title: 'Connect Social Media',
          description: 'Link your social accounts for easy sharing',
          benefit: '📱 Share content 10x faster and reach 100s of people with one click',
          icon: 'Link',
          priority: 'medium',
          cta: 'Connect Accounts',
          metadata: { connectedCount: connectedPlatforms, totalPlatforms: 6 }
        });
      }

      // Suggest social sharing if platforms connected but not sharing
      if (connectedPlatforms >= 2 && (recentShares || 0) < 3) {
        growthActions.push({
          id: 'share_social',
          type: 'share_social',
          title: 'Share Your Vitana Journey',
          description: 'Auto-post your wellness wins to social media',
          benefit: '🌟 Members who share weekly grow their network 8x faster and inspire others to join',
          icon: 'Share2',
          priority: 'medium',
          cta: 'Auto-Share Now',
          metadata: { connectedPlatforms }
        });
      }

      setActions(growthActions);
    } catch (error) {
      console.error('Error analyzing growth opportunities:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile?.linkedin_url, profile?.instagram_url, profile?.facebook_url, profile?.x_url, profile?.youtube_url, profile?.tiktok_url]);

  useEffect(() => {
    analyzeGrowthOpportunities();
  }, [analyzeGrowthOpportunities]);

  const executeAction = useCallback(async (actionId: string) => {
    const action = actions.find(a => a.id === actionId);
    if (!action) return;

    try {
      // Log the action (would track in production)

      // Navigate to appropriate page based on action type (SPA-safe navigation)
      const navigateSPA = (path: string) => {
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      };
      
      switch (action.type) {
        case 'import_contacts':
          navigateSPA('/contacts');
          break;
        case 'invite_contacts':
          navigateSPA('/contacts');
          break;
        case 'connect_channels':
          navigateSPA('/sharing');
          break;
        case 'share_social':
          navigateSPA('/sharing');
          break;
      }

      notify('toasts.hooks.greatChoice');
    } catch (error) {
      console.error('Error executing growth action:', error);
      notifyError('toasts.hooks.error', 'toasts.hooks.failedExecuteAction');
    }
  }, [actions, user?.id, toast]);

  const dismissAction = useCallback((actionId: string) => {
    setActions(prev => prev.filter(a => a.id !== actionId));
  }, []);

  return {
    actions,
    loading,
    executeAction,
    dismissAction,
    refreshActions: analyzeGrowthOpportunities
  };
}
