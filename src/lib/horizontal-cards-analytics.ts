import { g1Analytics, G1AnalyticsPayload } from '@/lib/analytics-events';

/**
 * Privacy-safe analytics for horizontal cards
 * CRITICAL: Only IDs allowed, no PII/PHI (names, emails, messages, biomarkers)
 */

interface HorizontalCardAnalyticsPayload {
  screenId: string;
  cardId: string;
  listId?: string;
  variant: 'standard' | 'visual';
  density?: 'compact' | 'comfy';
  actionType?: 'view' | 'expand' | 'cta_click' | 'load_more';
  timestamp: number;
}

class HorizontalCardAnalytics {
  private sanitizeCardId(rawId: string): string {
    // If ID contains PII markers, hash it
    if (this.containsPII(rawId)) {
      return this.hashId(rawId);
    }
    return rawId;
  }

  private containsPII(value: string): boolean {
    // Check for email, phone, names, etc.
    const piiPatterns = [
      /@/,                    // Email
      /\d{3}-\d{3}-\d{4}/,   // Phone
      /^\d{9,}$/,            // SSN-like
      /\b(mr|mrs|ms|dr)\b/i  // Titles
    ];
    return piiPatterns.some(pattern => pattern.test(value));
  }

  private hashId(value: string): string {
    // Simple hash for development
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash) + value.charCodeAt(i);
      hash = hash & hash;
    }
    return `hashed_${Math.abs(hash).toString(36)}`;
  }

  private storeEvent(eventName: string, eventPayload: Partial<G1AnalyticsPayload>) {
    const event = {
      eventName,
      payload: {
        ...this.getBasePayload(),
        ...eventPayload
      } as G1AnalyticsPayload
    };

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Horizontal Cards Analytics]', eventName, eventPayload);
    }

    // Store in localStorage
    const events = JSON.parse(localStorage.getItem('g1_analytics_events') || '[]');
    events.push(event);
    
    if (events.length > 500) {
      events.splice(0, events.length - 500);
    }
    
    localStorage.setItem('g1_analytics_events', JSON.stringify(events));
  }

  cardView(payload: Omit<HorizontalCardAnalyticsPayload, 'actionType' | 'timestamp'>) {
    this.storeEvent('horizontal_card_view', {
      screenId: payload.screenId,
      cardId: this.sanitizeCardId(payload.cardId),
      value: payload.variant
    });
  }

  cardExpand(payload: Omit<HorizontalCardAnalyticsPayload, 'actionType' | 'timestamp'> & { expanded: boolean }) {
    this.storeEvent('horizontal_card_expand', {
      screenId: payload.screenId,
      cardId: this.sanitizeCardId(payload.cardId),
      value: payload.expanded.toString()
    });
  }

  ctaClick(payload: Omit<HorizontalCardAnalyticsPayload, 'actionType' | 'timestamp'> & { ctaLabel: string; ctaPosition: 'primary' | 'secondary' }) {
    this.storeEvent('horizontal_card_cta', {
      screenId: payload.screenId,
      cardId: this.sanitizeCardId(payload.cardId),
      actionId: `${payload.ctaPosition}_${payload.ctaLabel.toLowerCase().replace(/\s+/g, '_')}`
    });
  }

  listLoadMore(payload: { screenId: string; listId: string; newItemCount: number }) {
    this.storeEvent('horizontal_list_load_more', {
      screenId: payload.screenId,
      value: payload.newItemCount.toString()
    });
  }

  private getBasePayload(): Pick<G1AnalyticsPayload, 'tenant' | 'role' | 'userId' | 'timestamp'> {
    return {
      tenant: 'maxina',
      role: 'community',
      userId: this.getUserId(),
      timestamp: Date.now()
    };
  }

  private getUserId(): string {
    // Return hashed user ID, never actual email/name
    const storedId = localStorage.getItem('vitana_hashed_user_id');
    if (storedId) return storedId;
    
    const newHashedId = `user_${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem('vitana_hashed_user_id', newHashedId);
    return newHashedId;
  }
}

export const horizontalCardAnalytics = new HorizontalCardAnalytics();
