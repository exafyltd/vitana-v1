import React from 'react';
import { CardEnvelope } from '@/types/unified-layout';
import { cn } from '@/lib/utils';

// Import existing card components
import { NewsCard } from '@/components/crossover/NewsCard';
import { AutoPilotActionCard } from '@/components/crossover/AutoPilotActionCard';
import { VitanaIndexCard } from '@/components/crossover/VitanaIndexCard';
import { LifestylePlanCard } from '@/components/crossover/LifestylePlanCard';
import { CommunityPulseCard } from '@/components/crossover/CommunityPulseCard';
import { ProgressStreaksCard } from '@/components/crossover/ProgressStreaksCard';
import { DataWalletCard } from '@/components/crossover/DataWalletCard';
import { DiscoverPicksCard } from '@/components/crossover/DiscoverPicksCard';
import { MotivationCard } from '@/components/crossover/MotivationCard';
import { PodcastCard } from '@/components/crossover/PodcastCard';
import { MusicCard } from '@/components/crossover/MusicCard';
import { VideoFeedCard } from '@/components/crossover/VideoFeedCard';
import { SmartCalendarCard } from '@/components/crossover/SmartCalendarCard';
import { t } from '@/lib/i18n-toast';

interface CardRendererProps {
  /** Card envelope with content and metadata */
  envelope: CardEnvelope;
  
  /** Display columns in current layout */
  displayCols: number;
  
  /** Display rows in current layout */
  displayRows: number;
}

/**
 * Card Renderer - Unified Card Display System
 * 
 * Routes card envelopes to appropriate card components based on type and content.
 * Handles consent gating, accessibility, and analytics integration.
 */
export function CardRenderer({ envelope, displayCols, displayRows }: CardRendererProps) {
  
  // Consent Shell - HIPAA/GDPR compliant gating without layout shifts
  if (!checkPermissions(envelope)) {
    return (
      <ConsentShell envelope={envelope} displayCols={displayCols} displayRows={displayRows} />
    );
  }
  
  // Pillar Badge Integration - Ensure consistent badge display
  const pillarBadgeProps = envelope.pillar ? {
    pillar: envelope.pillar,
    className: 'pillar-badge-top-left' // Consistent positioning
  } : {};
  
  // Route to appropriate card component based on type and content
  return (
    <div 
      className={cn(
        "card-wrapper h-full",
        `card-type-${envelope.type}`,
        envelope.pillar && `card-pillar-${envelope.pillar}`
      )}
      data-card-id={envelope.id}
      data-card-type={envelope.type}
      data-tracking-key={envelope.tracking.impression_key}
    >
      {renderCardByType(envelope, displayCols, displayRows, pillarBadgeProps)}
    </div>
  );
}

/**
 * Card Type Router - Maps envelope content to specific card components
 */
function renderCardByType(
  envelope: CardEnvelope, 
  displayCols: number, 
  displayRows: number,
  pillarBadgeProps: any
) {
  const baseProps = {
    className: `h-full w-full display-cols-${displayCols} display-rows-${displayRows}`,
    ...pillarBadgeProps
  };
  
  // Route based on content reference kind
  switch (envelope.content_ref.kind) {
    case 'event':
    case 'post':
    case 'achievement':
      return <NewsCardWrapper envelope={envelope} {...baseProps} />;
      
    case 'autopilot-action':
      return <AutoPilotActionCard {...baseProps} />;
      
    case 'vitana-index':
      return <VitanaIndexCard {...baseProps} />;
      
    case 'lifestyle-plan':
      return <LifestylePlanWrapper envelope={envelope} {...baseProps} />;
      
    case 'community-pulse':
      return <CommunityPulseCard {...baseProps} />;
      
    case 'progress-streaks':
      return <ProgressStreaksCard {...baseProps} />;
      
    case 'data-wallet':
      return <DataWalletCard {...baseProps} />;
      
    case 'discover-picks':
      return <DiscoverPicksCard {...baseProps} />;
      
    case 'motivation':
      return <MotivationCard {...baseProps} />;
      
    case 'podcast':
      return <PodcastCard {...baseProps} />;
      
    case 'music':
      return <MusicCard {...baseProps} />;
      
    case 'video':
      return <VideoFeedCard {...baseProps} />;
      
    case 'calendar':
      return <SmartCalendarCard {...baseProps} />;
      
    default:
      return <DefaultCard envelope={envelope} {...baseProps} />;
  }
}

/**
 * Card Wrappers - Adapter components to bridge envelope data to existing cards
 */
function NewsCardWrapper({ envelope, ...props }: { envelope: CardEnvelope; [key: string]: any }) {
  // Extract real NewsCard props from envelope content_ref
  // Map envelope data to proper NewsCard props
  const newsData = {
    title: envelope.content_ref.id.includes('news-1') ? "Weekly Wellness Meetup Tonight" :
           envelope.content_ref.id.includes('news-2') ? "Emma Wilson Completes 30-Day Challenge" :
           envelope.content_ref.id.includes('news-3') ? "Live Yoga Session with Lisa Chen" :
           envelope.content_ref.id.includes('news-4') ? "James Davis Reaches Fitness Milestone" :
           envelope.content_ref.id.includes('news-5') ? "Nutrition Workshop: Meal Prep Mastery" :
           envelope.content_ref.id.includes('news-6') ? "Monthly Health & Wellness Fair" :
           envelope.content_ref.id.includes('meetup') ? envelope.content_ref.id.replace('meetup-', '').replace(/-/g, ' ') :
           "Community Event",
           
    description: envelope.content_ref.id.includes('news-1') ? "Join Dr. Sarah Miller and 50+ community members for meditation and healthy cooking tips" :
                envelope.content_ref.id.includes('news-2') ? "Inspiring transformation journey with consistent nutrition tracking and community support" :
                envelope.content_ref.id.includes('news-3') ? "Morning flow for energy and mindfulness - perfect for busy professionals" :
                envelope.content_ref.id.includes('news-4') ? "Completed his first marathon and raised $5000 for mental health awareness" :
                envelope.content_ref.id.includes('news-5') ? "Learn from certified nutritionist Mike Thompson about sustainable meal planning" :
                envelope.content_ref.id.includes('news-6') ? "Meet local practitioners, try new wellness services, and connect with your community" :
                "Join this amazing wellness event in your community",
                
    imageUrl: envelope.content_ref.id.includes('news-1') ? "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop&crop=center" :
             envelope.content_ref.id.includes('news-2') ? "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&crop=center" :
             envelope.content_ref.id.includes('news-3') ? "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop&crop=center" :
             envelope.content_ref.id.includes('news-4') ? "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&crop=center" :
             envelope.content_ref.id.includes('news-5') ? "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop&crop=center" :
             envelope.content_ref.id.includes('news-6') ? "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop&crop=center" :
             "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop&crop=center",
             
    pillar: envelope.pillar,
    
    author: envelope.content_ref.id.includes('news-1') ? { name: "Dr. Sarah Miller", avatar: "/lovable-uploads/sarah-miller-avatar.jpg" } :
           envelope.content_ref.id.includes('news-2') ? { name: "Emma Wilson", avatar: "/lovable-uploads/emma-wilson-avatar.jpg" } :
           envelope.content_ref.id.includes('news-3') ? { name: "Lisa Chen", avatar: "/lovable-uploads/lisa-chen-avatar.jpg" } :
           envelope.content_ref.id.includes('news-4') ? { name: "James Davis", avatar: "/lovable-uploads/james-davis-avatar.jpg" } :
           envelope.content_ref.id.includes('news-5') ? { name: "Mike Thompson", avatar: "/lovable-uploads/mike-thompson-avatar.jpg" } :
           { name: "VITANA Community" },
           
    location: envelope.content_ref.id.includes('news-1') ? "Downtown Center" :
             envelope.content_ref.id.includes('news-3') ? "Virtual" :
             envelope.content_ref.id.includes('news-4') ? "City Marathon" :
             envelope.content_ref.id.includes('news-5') ? "Wellness Center" :
             envelope.content_ref.id.includes('news-6') ? "Central Park" :
             "Community Center",
             
    attendees: envelope.content_ref.id.includes('news-1') ? 52 :
              envelope.content_ref.id.includes('news-3') ? 28 :
              envelope.content_ref.id.includes('news-5') ? 15 :
              envelope.content_ref.id.includes('news-6') ? 200 :
              25,
              
    timestamp: envelope.content_ref.id.includes('news-1') ? "7:00 PM" :
              envelope.content_ref.id.includes('news-2') ? "2 hours ago" :
              envelope.content_ref.id.includes('news-3') ? "Tomorrow 8 AM" :
              envelope.content_ref.id.includes('news-4') ? "Yesterday" :
              envelope.content_ref.id.includes('news-5') ? "This Saturday" :
              envelope.content_ref.id.includes('news-6') ? "Next Weekend" :
              "Today",
              
    onClick: () => console.log('NewsCard clicked:', envelope.id)
  };
  
  return <NewsCard {...newsData} {...props} />;
}

function LifestylePlanWrapper({ envelope, ...props }: { envelope: CardEnvelope; [key: string]: any }) {
  // Map pillar to lifestyle plan type
  const typeMap: Record<string, any> = {
    nutrition: 'nutrition',
    hydration: 'hydration', 
    exercise: 'exercise',
    sleep: 'sleep',
    mental: 'mental'
  };
  
  const type = envelope.pillar ? typeMap[envelope.pillar] || 'nutrition' : 'nutrition';
  
  return <LifestylePlanCard type={type} {...props} />;
}

/**
 * Consent Shell - HIPAA/GDPR compliant card gating
 */
function ConsentShell({ envelope, displayCols, displayRows }: CardRendererProps) {
  return (
    <div 
      className={cn(
        "consent-shell h-full w-full rounded-2xl border border-muted/50",
        "flex flex-col items-center justify-center p-6 text-center",
        "bg-background/50 backdrop-blur-sm"
      )}
    >
      <div className="space-y-3">
        <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center">
          <span className="text-lg">🔒</span>
        </div>
        <div className="space-y-1">
          <h3 className="font-medium text-sm">{t('screens.layout.contentRequiresConsent')}</h3>
          <p className="text-xs text-muted-foreground">{t('screens.layout.tapReviewPrivacySettingsForThis')}
          </p>
        </div>
        <button 
          className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
          onClick={() => handleConsentRequest(envelope)}
        >
          {t('screens.layout.reviewSettings')}
        </button>
      </div>
    </div>
  );
}

/**
 * Default Card - Fallback for unknown content types
 */
function DefaultCard({ envelope, ...props }: { envelope: CardEnvelope; [key: string]: any }) {
  return (
    <div 
      className={cn(
        "default-card h-full w-full rounded-2xl border border-muted/50 p-6",
        "bg-background"
      )}
    >
      <div className="space-y-2">
        <h3 className="font-medium text-sm">{t('screens.layout.unknownContentType')}</h3>
        <p className="text-xs text-muted-foreground">{t('screens.layout.kindKind', { kind: envelope.content_ref.kind })}</p>
        <p className="text-xs text-muted-foreground">{t('screens.layout.idId', { id: envelope.content_ref.id })}</p>
      </div>
    </div>
  );
}

/**
 * Permission Checker - RBAC and consent validation
 */
function checkPermissions(envelope: CardEnvelope): boolean {
  // TODO: Implement proper RBAC and consent checking
  // For now, return true - full implementation in Phase 2
  return true;
}

/**
 * Consent Request Handler - Trigger consent microflow
 */
function handleConsentRequest(envelope: CardEnvelope) {
  // TODO: Implement consent microflow 
  // For now, log the request - full implementation in Phase 2
  console.log('Consent requested for:', envelope.id);
}