/**
 * G1 Dictionary Seed - Analytics Event Hooks
 * Frontend-only event stubs for Day 2 implementation
 */

export interface G1AnalyticsPayload {
  tenant: string;
  role: string;
  userId: string;
  screenId: string;
  timestamp: number;
  value?: string;
  actionId?: string;
  intentType?: 'doctors' | 'wellness' | 'groups';
  cardId?: string;
  rtlEnabled?: boolean;
}

export interface G1AnalyticsEvent {
  eventName: string;
  payload: G1AnalyticsPayload;
}

class G1AnalyticsService {
  private basePayload(): Omit<G1AnalyticsPayload, 'screenId'> {
    return {
      tenant: 'vitana-main',
      role: 'user', 
      userId: 'mariia_demo',
      timestamp: Date.now()
    };
  }

  private getScreenId(): string {
    const path = window.location.pathname;
    const screenMapping: Record<string, string> = {
      '/': 'dashboard',
      '/discover': 'discover-intent-router',
      '/health': 'health-overview',
      '/health-tracker/vitana-index': 'vitana-index-detail',
      '/community': 'community-overview',
      '/messages': 'inbox-overview'
    };
    return screenMapping[path] || path.replace('/', '').replace(/\//g, '-') || 'unknown';
  }

  private dispatch(event: G1AnalyticsEvent): void {
    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log('[G1 Analytics]', event.eventName, event.payload);
    }

    // Store in localStorage for development/debugging
    const events = JSON.parse(localStorage.getItem('g1_analytics_events') || '[]');
    events.push(event);
    
    // Keep only last 500 events
    if (events.length > 500) {
      events.splice(0, events.length - 500);
    }
    
    localStorage.setItem('g1_analytics_events', JSON.stringify(events));
  }

  // Autopilot Events
  autopilotActionViewed(actionId: string): void {
    this.dispatch({
      eventName: 'autopilot_action_viewed',
      payload: {
        ...this.basePayload(),
        screenId: this.getScreenId(),
        actionId
      }
    });
  }

  autopilotActionExecuted(actionId: string): void {
    this.dispatch({
      eventName: 'autopilot_action_executed',
      payload: {
        ...this.basePayload(),
        screenId: this.getScreenId(),
        actionId
      }
    });
  }

  // Discover Events
  discoverIntentSelected(intentType: 'doctors' | 'wellness' | 'groups'): void {
    this.dispatch({
      eventName: 'discover_intent_selected',
      payload: {
        ...this.basePayload(),
        screenId: this.getScreenId(),
        value: intentType,
        intentType
      }
    });
  }

  // Vitana Index Events  
  indexCardViewed(cardId: string): void {
    this.dispatch({
      eventName: 'index_card_viewed',
      payload: {
        ...this.basePayload(),
        screenId: this.getScreenId(),
        cardId
      }
    });
  }

  indexCardClicked(cardId: string): void {
    this.dispatch({
      eventName: 'index_card_clicked',
      payload: {
        ...this.basePayload(),
        screenId: this.getScreenId(),
        cardId
      }
    });
  }

  // RTL Events
  rtlToggled(isEnabled: boolean): void {
    this.dispatch({
      eventName: 'rtl_toggled',
      payload: {
        ...this.basePayload(),
        screenId: this.getScreenId(),
        value: isEnabled.toString(),
        rtlEnabled: isEnabled
      }
    });
  }

  // Utility methods for debugging
  getStoredEvents(): G1AnalyticsEvent[] {
    return JSON.parse(localStorage.getItem('g1_analytics_events') || '[]');
  }

  clearStoredEvents(): void {
    localStorage.removeItem('g1_analytics_events');
  }
}

export const g1Analytics = new G1AnalyticsService();
export default g1Analytics;
