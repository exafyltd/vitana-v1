/**
 * Analytics service for Card ID system
 * Handles impression and interaction tracking for card components
 */

import { track as trackProductEvent } from './product-analytics/client';

export interface AnalyticsPayload {
  template_id: string;
  version: string;
  system_card_id?: string;
  screen_route: string;
  slot_id?: string;
  tenant_id?: string;
  user_role?: string;
  experiment_id?: string;
  item_id?: string;
  sku?: string;
  impression_id?: string;
  click_id?: string;
  session_id?: string;
  timestamp: number;
}

export interface AnalyticsEvent {
  event_name: string;
  payload: AnalyticsPayload;
}

class AnalyticsService {
  private sessionId: string;
  private userId?: string;
  private tenantId?: string;
  private userRole?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeUserContext();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateImpressionId(): string {
    return `imp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateClickId(): string {
    return `click-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeUserContext(): void {
    // Initialize from localStorage, auth context, or environment
    this.tenantId = 'vitana-main'; // Default tenant
    this.userRole = 'user'; // Default role
  }

  private getScreenRoute(): string {
    return window.location.pathname;
  }

  private createBasePayload(
    templateId: string,
    version: string,
    systemCardId?: string,
    experimentId?: string
  ): AnalyticsPayload {
    return {
      template_id: templateId,
      version,
      system_card_id: systemCardId,
      screen_route: this.getScreenRoute(),
      tenant_id: this.tenantId,
      user_role: this.userRole,
      experiment_id: experimentId,
      session_id: this.sessionId,
      timestamp: Date.now(),
    };
  }

  trackImpression(
    templateId: string,
    version: string,
    systemCardId?: string,
    experimentId?: string,
    slotId?: string
  ): string {
    const impressionId = this.generateImpressionId();
    
    const payload: AnalyticsPayload = {
      ...this.createBasePayload(templateId, version, systemCardId, experimentId),
      slot_id: slotId,
      impression_id: impressionId,
    };

    const event: AnalyticsEvent = {
      event_name: 'card_impression',
      payload,
    };

    this.dispatch(event);
    return impressionId;
  }

  trackClick(
    templateId: string,
    version: string,
    action: string,
    systemCardId?: string,
    experimentId?: string,
    itemId?: string,
    sku?: string
  ): string {
    const clickId = this.generateClickId();
    
    const payload: AnalyticsPayload = {
      ...this.createBasePayload(templateId, version, systemCardId, experimentId),
      item_id: itemId,
      sku,
      click_id: clickId,
    };

    const event: AnalyticsEvent = {
      event_name: 'card_click',
      payload,
    };

    this.dispatch(event);
    return clickId;
  }

  trackCTAExecute(
    templateId: string,
    version: string,
    action: string,
    systemCardId?: string,
    experimentId?: string,
    itemId?: string,
    sku?: string
  ): string {
    const clickId = this.generateClickId();
    
    const payload: AnalyticsPayload = {
      ...this.createBasePayload(templateId, version, systemCardId, experimentId),
      item_id: itemId,
      sku,
      click_id: clickId,
    };

    const event: AnalyticsEvent = {
      event_name: 'cta_execute',
      payload,
    };

    this.dispatch(event);
    return clickId;
  }

  private dispatch(event: AnalyticsEvent): void {
    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', event.event_name, event.payload);
    }

    // Send to analytics service (implement based on your analytics provider)
    this.sendToAnalyticsProvider(event);
  }

  private sendToAnalyticsProvider(event: AnalyticsEvent): void {
    // BOOTSTRAP-PRODUCT-ANALYTICS: forward card events to the gateway
    // pipeline that backs /admin/insights/*. The legacy event names map to
    // the product analytics taxonomy; the original payload fields ride
    // along in properties.
    const EVENT_NAME_MAP: Record<string, string> = {
      card_impression: 'card_impression',
      card_click: 'card_clicked',
      cta_execute: 'cta_clicked',
    };
    trackProductEvent(EVENT_NAME_MAP[event.event_name] ?? event.event_name, {
      event_type: 'journey',
      feature_key: 'cards',
      properties: {
        template_id: event.payload.template_id,
        version: event.payload.version,
        system_card_id: event.payload.system_card_id,
        slot_id: event.payload.slot_id,
        item_id: event.payload.item_id,
        sku: event.payload.sku,
        screen_route: event.payload.screen_route,
        experiment_id: event.payload.experiment_id,
      },
    });

    // Keep the localStorage ring buffer — getStoredEvents() is still used
    // for local debugging.
    const events = JSON.parse(localStorage.getItem('vitana_analytics_events') || '[]');
    events.push(event);

    // Keep only last 1000 events
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }

    localStorage.setItem('vitana_analytics_events', JSON.stringify(events));
  }

  // Method to retrieve stored events for debugging/testing
  getStoredEvents(): AnalyticsEvent[] {
    return JSON.parse(localStorage.getItem('vitana_analytics_events') || '[]');
  }

  // Clear stored events
  clearStoredEvents(): void {
    localStorage.removeItem('vitana_analytics_events');
  }

  // Track share events for profiles
  trackShare(
    eventName: 'share_opened' | 'share_completed',
    channel: 'sheet' | 'copy_link' | 'x' | 'linkedin' | 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'whatsapp' | 'email' | 'web_share' | 'universal',
    contentId: string,
    contentType: string
  ): void {
    const event: AnalyticsEvent = {
      event_name: eventName,
      payload: {
        ...this.createBasePayload(`${contentType}_share`, '1.0', contentId),
        item_id: contentId,
      }
    };
    
    this.dispatch(event);
  }
}

export const analytics = new AnalyticsService();
export default analytics;
