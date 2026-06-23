/**
 * Notification Type Registry — All 70 Vitana Notification Types
 *
 * Central definition of every notification type across the platform.
 * Each type defines icon, label, category, channel, priority, and click route.
 */

export type NotificationCategory =
  | 'match'
  | 'community'
  | 'meetup'
  | 'live_room'
  | 'chat'
  | 'calendar'
  | 'reminder'
  | 'recommendation'
  | 'health'
  | 'signal'
  | 'opportunity'
  | 'diary'
  | 'social'
  | 'offer'
  | 'growth'
  | 'system';

/** Delivery channel: push-only, in-app-only, both, or silent (in-app no badge) */
export type NotificationChannel = 'push' | 'inapp' | 'push_and_inapp' | 'silent';

/** Priority tier: P0=critical, P1=high, P2=medium, P3=low/silent */
export type NotificationPriority = 'p0' | 'p1' | 'p2' | 'p3';

export interface NotificationTypeDef {
  icon: string;
  label: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  priority: NotificationPriority;
  /** Route template — {id} replaced with data.entity_id at click time */
  route?: string;
}

// ── Category → preference column mapping ────────────────────

export const CATEGORY_TO_PREF_COLUMN: Record<NotificationCategory, string> = {
  match: 'match_notifications',
  community: 'community_notifications',
  meetup: 'community_notifications',
  live_room: 'live_room_notifications',
  chat: 'push_enabled',
  calendar: 'push_enabled',
  reminder: 'task_notifications',
  recommendation: 'recommendation_notifications',
  health: 'health_notifications',
  signal: 'health_notifications',
  opportunity: 'recommendation_notifications',
  diary: 'memory_notifications',
  social: 'social_notifications',
  offer: 'recommendation_notifications',
  growth: 'social_notifications',
  system: 'system_notifications',
};

// ── Master Registry (70 types) ──────────────────────────────

export const NOTIFICATION_TYPES: Record<string, NotificationTypeDef> = {

  // ═══════════════════════════════════════════════════════════
  // 1. MATCHMAKING (7)
  // ═══════════════════════════════════════════════════════════
  new_daily_matches: {
    icon: '✨', label: 'New Daily Matches', category: 'match',
    channel: 'push_and_inapp', priority: 'p1', route: '/discover',
  },
  person_match_suggested: {
    icon: '🤝', label: 'Person Match', category: 'match',
    channel: 'push_and_inapp', priority: 'p1', route: '/discover',
  },
  group_match_suggested: {
    icon: '👥', label: 'Group Match', category: 'match',
    channel: 'inapp', priority: 'p2', route: '/discover',
  },
  event_match_suggested: {
    icon: '📅', label: 'Event Match', category: 'match',
    channel: 'push_and_inapp', priority: 'p1', route: '/discover',
  },
  live_room_match_suggested: {
    icon: '🔴', label: 'Live Room Match', category: 'match',
    channel: 'push_and_inapp', priority: 'p1', route: '/discover',
  },
  match_accepted_by_other: {
    icon: '🎉', label: 'Match Accepted', category: 'match',
    channel: 'push_and_inapp', priority: 'p1', route: '/discover',
  },
  your_match_accepted: {
    icon: '🤝', label: 'Your Match Accepted', category: 'match',
    channel: 'push_and_inapp', priority: 'p1', route: '/discover',
  },

  // ═══════════════════════════════════════════════════════════
  // 2. COMMUNITY GROUPS (6)
  // ═══════════════════════════════════════════════════════════
  someone_joined_your_group: {
    icon: '👋', label: 'New Group Member', category: 'community',
    channel: 'inapp', priority: 'p2', route: '/community/groups/{id}',
  },
  group_recommended: {
    icon: '💡', label: 'Group Recommended', category: 'community',
    channel: 'push_and_inapp', priority: 'p2', route: '/community',
  },
  group_activity_update: {
    icon: '📢', label: 'Group Activity', category: 'community',
    channel: 'inapp', priority: 'p2', route: '/community/groups/{id}',
  },
  new_member_in_group: {
    icon: '➕', label: 'New Member', category: 'community',
    channel: 'inapp', priority: 'p3', route: '/community/groups/{id}',
  },
  group_milestone_reached: {
    icon: '🏆', label: 'Group Milestone', category: 'community',
    channel: 'inapp', priority: 'p2',
  },
  group_invitation_received: {
    icon: '📨', label: 'Group Invitation', category: 'community',
    channel: 'push_and_inapp', priority: 'p1', route: '/community',
  },
  post_like: {
    icon: '❤️', label: 'New Like', category: 'community',
    channel: 'push_and_inapp', priority: 'p1', route: '/home',
  },
  post_comment: {
    icon: '💬', label: 'New Comment', category: 'community',
    channel: 'push_and_inapp', priority: 'p1', route: '/home',
  },

  // ═══════════════════════════════════════════════════════════
  // 3. MEETUPS / EVENTS (7)
  // ═══════════════════════════════════════════════════════════
  meetup_recommended: {
    icon: '💡', label: 'Meetup Recommended', category: 'meetup',
    channel: 'push_and_inapp', priority: 'p2', route: '/community/meetups/{id}',
  },
  meetup_starting_soon: {
    icon: '⏰', label: 'Meetup Starting Soon', category: 'meetup',
    channel: 'push_and_inapp', priority: 'p0', route: '/community/meetups/{id}',
  },
  meetup_starting_now: {
    icon: '🔴', label: 'Meetup Starting Now', category: 'meetup',
    channel: 'push', priority: 'p0', route: '/community/meetups/{id}',
  },
  meetup_rsvp_confirmed: {
    icon: '✅', label: 'RSVP Confirmed', category: 'meetup',
    channel: 'inapp', priority: 'p2', route: '/community/meetups/{id}',
  },
  someone_rsvpd_your_meetup: {
    icon: '🙋', label: 'New RSVP', category: 'meetup',
    channel: 'inapp', priority: 'p2', route: '/community/meetups/{id}',
  },
  meetup_cancelled: {
    icon: '❌', label: 'Meetup Cancelled', category: 'meetup',
    channel: 'push_and_inapp', priority: 'p1', route: '/community',
  },
  new_meetup_in_group: {
    icon: '📅', label: 'New Meetup in Group', category: 'meetup',
    channel: 'push_and_inapp', priority: 'p1', route: '/community/meetups/{id}',
  },

  // ═══════════════════════════════════════════════════════════
  // 4. LIVE ROOMS (6)
  // ═══════════════════════════════════════════════════════════
  live_room_starting: {
    icon: '🔴', label: 'Live Room Starting', category: 'live_room',
    channel: 'push_and_inapp', priority: 'p0', route: '/live/{id}',
  },
  someone_joined_live_room: {
    icon: '👋', label: 'Someone Joined Your Room', category: 'live_room',
    channel: 'inapp', priority: 'p2', route: '/live/{id}',
  },
  live_room_ended_summary: {
    icon: '🏁', label: 'Room Summary Available', category: 'live_room',
    channel: 'push_and_inapp', priority: 'p2', route: '/live/{id}',
  },
  live_room_highlight_added: {
    icon: '⭐', label: 'Highlight Added', category: 'live_room',
    channel: 'inapp', priority: 'p3', route: '/live/{id}',
  },
  live_room_invite: {
    icon: '📨', label: 'Live Room Invite', category: 'live_room',
    channel: 'push_and_inapp', priority: 'p1', route: '/live/{id}',
  },
  live_room_recording_ready: {
    icon: '🎬', label: 'Recording Ready', category: 'live_room',
    channel: 'inapp', priority: 'p3', route: '/live/{id}',
  },

  // ═══════════════════════════════════════════════════════════
  // 5. CHAT / CONVERSATION (4)
  // ═══════════════════════════════════════════════════════════
  new_chat_message: {
    icon: '💬', label: 'New Message', category: 'chat',
    channel: 'push_and_inapp', priority: 'p1', route: '/messages',
  },
  orb_proactive_message: {
    icon: '🤖', label: 'Message from ORB', category: 'chat',
    channel: 'push_and_inapp', priority: 'p1',
  },
  conversation_followup_reminder: {
    icon: '💬', label: 'Follow-up Reminder', category: 'chat',
    channel: 'inapp', priority: 'p2',
  },
  orb_suggestion: {
    icon: '💡', label: 'ORB Suggestion', category: 'chat',
    channel: 'push_and_inapp', priority: 'p1',
  },

  // ═══════════════════════════════════════════════════════════
  // 6. CALENDAR / SCHEDULER (4)
  // ═══════════════════════════════════════════════════════════
  daily_recompute_complete: {
    icon: '🔄', label: 'Daily Update', category: 'calendar',
    channel: 'silent', priority: 'p3',
  },
  morning_briefing_ready: {
    icon: '☀️', label: 'Morning Briefing', category: 'calendar',
    channel: 'push_and_inapp', priority: 'p1',
  },
  upcoming_event_today: {
    icon: '📅', label: 'Upcoming Event', category: 'calendar',
    channel: 'push', priority: 'p1',
  },
  weekly_community_digest: {
    icon: '📰', label: 'Weekly Digest', category: 'calendar',
    channel: 'push_and_inapp', priority: 'p2',
  },

  // ═══════════════════════════════════════════════════════════
  // 7. AUTOPILOT / RECOMMENDATIONS (4)
  // ═══════════════════════════════════════════════════════════
  new_recommendation: {
    icon: '💡', label: 'New Recommendation', category: 'recommendation',
    channel: 'push_and_inapp', priority: 'p1', route: '/autopilot',
  },
  recommendation_expires_soon: {
    icon: '⏳', label: 'Recommendation Expiring', category: 'recommendation',
    channel: 'inapp', priority: 'p2', route: '/autopilot',
  },
  high_impact_recommendation: {
    icon: '🚨', label: 'High-Impact Recommendation', category: 'recommendation',
    channel: 'push_and_inapp', priority: 'p0', route: '/autopilot',
  },
  recommendation_activated: {
    icon: '✅', label: 'Recommendation Activated', category: 'recommendation',
    channel: 'inapp', priority: 'p2',
  },

  // ═══════════════════════════════════════════════════════════
  // 8. HEALTH & LONGEVITY (6)
  // ═══════════════════════════════════════════════════════════
  daily_vitana_index_ready: {
    icon: '📊', label: 'Vitana Index Ready', category: 'health',
    channel: 'inapp', priority: 'p2',
  },
  health_score_improvement: {
    icon: '📈', label: 'Health Score Up', category: 'health',
    channel: 'push_and_inapp', priority: 'p1',
  },
  health_score_decline: {
    icon: '📉', label: 'Health Score Down', category: 'health',
    channel: 'push_and_inapp', priority: 'p0',
  },
  longevity_signal_alert: {
    icon: '⚠️', label: 'Longevity Alert', category: 'health',
    channel: 'push_and_inapp', priority: 'p0',
  },
  lab_report_processed: {
    icon: '🧪', label: 'Lab Report Ready', category: 'health',
    channel: 'inapp', priority: 'p2',
  },
  wearable_data_synced: {
    icon: '⌚', label: 'Wearable Synced', category: 'health',
    channel: 'silent', priority: 'p3',
  },

  // ═══════════════════════════════════════════════════════════
  // 9. PREDICTIVE SIGNALS & RISK (5)
  // ═══════════════════════════════════════════════════════════
  predictive_signal_detected: {
    icon: '🎯', label: 'Predictive Signal', category: 'signal',
    channel: 'push_and_inapp', priority: 'p0',
  },
  positive_momentum_detected: {
    icon: '🚀', label: 'Positive Momentum', category: 'signal',
    channel: 'inapp', priority: 'p2',
  },
  social_withdrawal_signal: {
    icon: '🔕', label: 'Social Withdrawal', category: 'signal',
    channel: 'push_and_inapp', priority: 'p0',
  },
  risk_mitigation_suggestion: {
    icon: '🛡️', label: 'Risk Mitigation', category: 'signal',
    channel: 'push_and_inapp', priority: 'p1',
  },
  signal_expired: {
    icon: '🔇', label: 'Signal Expired', category: 'signal',
    channel: 'silent', priority: 'p3',
  },

  // ═══════════════════════════════════════════════════════════
  // 10. CONTEXTUAL OPPORTUNITIES (3)
  // ═══════════════════════════════════════════════════════════
  opportunity_surfaced: {
    icon: '🌟', label: 'Opportunity Found', category: 'opportunity',
    channel: 'push_and_inapp', priority: 'p1',
  },
  opportunity_expiring: {
    icon: '⏳', label: 'Opportunity Expiring', category: 'opportunity',
    channel: 'inapp', priority: 'p2',
  },
  health_priority_opportunity: {
    icon: '❤️', label: 'Health Opportunity', category: 'opportunity',
    channel: 'push_and_inapp', priority: 'p0',
  },

  // ═══════════════════════════════════════════════════════════
  // 11. DIARY & MEMORY (4)
  // ═══════════════════════════════════════════════════════════
  daily_diary_reminder: {
    icon: '📝', label: 'Diary Reminder', category: 'diary',
    channel: 'push', priority: 'p2',
  },
  diary_streak_milestone: {
    icon: '🔥', label: 'Diary Streak', category: 'diary',
    channel: 'push_and_inapp', priority: 'p2',
  },
  memory_garden_grew: {
    icon: '🧠', label: 'Memory Garden Grew', category: 'diary',
    channel: 'silent', priority: 'p3',
  },
  weekly_reflection_prompt: {
    icon: '🪞', label: 'Weekly Reflection', category: 'diary',
    channel: 'push_and_inapp', priority: 'p2',
  },

  // ═══════════════════════════════════════════════════════════
  // 12. RELATIONSHIPS & SOCIAL (3)
  // ═══════════════════════════════════════════════════════════
  new_connection_formed: {
    icon: '🔗', label: 'New Connection', category: 'social',
    channel: 'push_and_inapp', priority: 'p1',
  },
  relationship_strength_increased: {
    icon: '💪', label: 'Bond Strengthened', category: 'social',
    channel: 'inapp', priority: 'p3',
  },
  comfort_boundary_respected: {
    icon: '🛡️', label: 'Boundary Respected', category: 'social',
    channel: 'silent', priority: 'p3',
  },

  // ═══════════════════════════════════════════════════════════
  // 13. OFFERS & SERVICES (3)
  // ═══════════════════════════════════════════════════════════
  service_recommendation: {
    icon: '🏥', label: 'Service Recommendation', category: 'offer',
    channel: 'inapp', priority: 'p2',
  },
  product_recommendation: {
    icon: '🛒', label: 'Product Recommendation', category: 'offer',
    channel: 'inapp', priority: 'p2',
  },
  usage_outcome_checkin: {
    icon: '📋', label: 'Outcome Check-in', category: 'offer',
    channel: 'inapp', priority: 'p3',
  },

  // ═══════════════════════════════════════════════════════════
  // 14. INVITE & GROWTH (6)
  // ═══════════════════════════════════════════════════════════
  invite_friends_prompt: {
    icon: '📤', label: 'Invite Friends', category: 'growth',
    channel: 'inapp', priority: 'p2',
  },
  friend_joined_vitana: {
    icon: '🎉', label: 'Friend Joined Vitana', category: 'growth',
    channel: 'push_and_inapp', priority: 'p1',
  },
  friend_joined_your_group: {
    icon: '👥', label: 'Friend Joined Your Group', category: 'growth',
    channel: 'push_and_inapp', priority: 'p1',
  },
  people_near_you: {
    icon: '📍', label: 'People Near You', category: 'growth',
    channel: 'push_and_inapp', priority: 'p1',
  },
  weekly_community_growth: {
    icon: '📊', label: 'Community Growth', category: 'growth',
    channel: 'inapp', priority: 'p3',
  },
  someone_wants_to_connect: {
    icon: '💌', label: 'Connection Request', category: 'growth',
    channel: 'push_and_inapp', priority: 'p1',
  },

  // ═══════════════════════════════════════════════════════════
  // 15. SYSTEM & ACCOUNT (4)
  // ═══════════════════════════════════════════════════════════
  welcome_to_vitana: {
    icon: '🎊', label: 'Welcome to Vitana', category: 'system',
    channel: 'push_and_inapp', priority: 'p1',
  },
  complete_your_profile: {
    icon: '👤', label: 'Complete Your Profile', category: 'system',
    channel: 'inapp', priority: 'p2',
  },
  onboarding_step_completed: {
    icon: '✅', label: 'Step Completed', category: 'system',
    channel: 'inapp', priority: 'p3',
  },
  weekly_activity_summary: {
    icon: '📰', label: 'Weekly Summary', category: 'system',
    channel: 'push_and_inapp', priority: 'p2',
  },

  // ═══════════════════════════════════════════════════════════
  // 16. REMINDERS (4)
  // ═══════════════════════════════════════════════════════════
  custom_reminder: {
    icon: '⏰', label: 'Reminder', category: 'reminder',
    channel: 'push_and_inapp', priority: 'p1', route: '/reminders?filter=missed',
  },
  task_reminder: {
    icon: '✅', label: 'Task Reminder', category: 'reminder',
    channel: 'push_and_inapp', priority: 'p1', route: '/reminders?filter=missed',
  },
  event_reminder: {
    icon: '📅', label: 'Event Reminder', category: 'reminder',
    channel: 'push_and_inapp', priority: 'p1', route: '/calendar/{id}',
  },
  medication_reminder: {
    icon: '💊', label: 'Medication Reminder', category: 'reminder',
    channel: 'push_and_inapp', priority: 'p0', route: '/health/medications/{id}',
  },
};

// ── Helper Functions ────────────────────────────────────────

export function resolveNotificationRoute(type: string, data?: Record<string, any>): string | null {
  // 1. Honour explicit URL from push payload
  if (data?.url) {
    const url = data.url as string;
    // Normalize legacy /messages/* paths to /inbox.
    // Path-based form (/inbox/t/<id>) — query-string form silently fails in
    // Appilix's Android in-app browser when launched from a notification tap.
    if (url.startsWith('/messages/') || url.startsWith('/messages?')) {
      const id = url.replace('/messages/', '').split('?')[0];
      if (id) return `/inbox/t/${id}`;
      return '/inbox';
    }
    return url;
  }

  // 2. Special handling for chat messages → path-based deep-link into inbox.
  //    Group chats: use thread_id (UUID); direct DMs: use sender_id (peer user_id).
  if (type === 'new_chat_message') {
    if (data?.thread_id) {
      return `/inbox/t/${data.thread_id}`;
    }
    if (data?.sender_id) {
      return `/inbox/u/${data.sender_id}`;
    }
  }

  // 3. Standard route template from registry
  const def = NOTIFICATION_TYPES[type];
  if (!def?.route) return null;

  const entityId = data?.entity_id || data?.room_id || data?.match_id
    || data?.meetup_id || data?.group_id || data?.thread_id || data?.follower_id || '';
  return def.route.replace('{id}', entityId);
}

export function getNotificationIcon(type: string): string {
  return NOTIFICATION_TYPES[type]?.icon || '🔔';
}

export function getNotificationCategory(type: string): NotificationCategory {
  return NOTIFICATION_TYPES[type]?.category || 'system';
}

export function getNotificationChannel(type: string): NotificationChannel {
  return NOTIFICATION_TYPES[type]?.channel || 'push_and_inapp';
}

export function getNotificationPriority(type: string): NotificationPriority {
  return NOTIFICATION_TYPES[type]?.priority || 'p2';
}

// ── Category Display Info ───────────────────────────────────
//
// User-facing label and icon for each category. `sort_order` controls
// which categories appear first in the bell panel filter row and in
// grouped views — high-signal categories (chat, reminders, health) come
// first; ambient/low-signal (system, growth) come last.

export interface CategoryDisplayInfo {
  label: string;
  icon: string;
  sort_order: number;
}

export const CATEGORY_DISPLAY: Record<NotificationCategory, CategoryDisplayInfo> = {
  chat:           { label: 'Messages',        icon: '💬', sort_order: 10 },
  reminder:       { label: 'Reminders',       icon: '⏰', sort_order: 20 },
  meetup:         { label: 'Meetups',         icon: '📅', sort_order: 30 },
  live_room:      { label: 'Live Rooms',      icon: '🔴', sort_order: 40 },
  match:          { label: 'Matches',         icon: '✨', sort_order: 50 },
  community:      { label: 'Community',       icon: '👥', sort_order: 60 },
  social:         { label: 'Connections',     icon: '🔗', sort_order: 70 },
  health:         { label: 'Health',          icon: '❤️', sort_order: 80 },
  signal:         { label: 'Signals',         icon: '🎯', sort_order: 90 },
  recommendation: { label: 'Recommendations', icon: '💡', sort_order: 100 },
  opportunity:    { label: 'Opportunities',   icon: '🌟', sort_order: 110 },
  calendar:       { label: 'Calendar',        icon: '🗓️', sort_order: 120 },
  diary:          { label: 'Diary',           icon: '📝', sort_order: 130 },
  offer:          { label: 'Offers',          icon: '🛒', sort_order: 140 },
  growth:         { label: 'Growth',          icon: '📈', sort_order: 150 },
  system:         { label: 'System',          icon: '⚙️',  sort_order: 160 },
};

export function getCategoryDisplay(category: NotificationCategory): CategoryDisplayInfo {
  return CATEGORY_DISPLAY[category] ?? CATEGORY_DISPLAY.system;
}

// ── Grouping & Filtering Helpers ────────────────────────────

export interface GroupedNotifications<T extends { type: string }> {
  category: NotificationCategory;
  display: CategoryDisplayInfo;
  items: T[];
}

/** Group an ordered notification list by category, preserving in-group order. */
export function groupByCategory<T extends { type: string }>(
  items: T[]
): GroupedNotifications<T>[] {
  const buckets = new Map<NotificationCategory, T[]>();
  for (const item of items) {
    const cat = getNotificationCategory(item.type);
    const arr = buckets.get(cat);
    if (arr) arr.push(item); else buckets.set(cat, [item]);
  }
  return Array.from(buckets.entries())
    .map(([category, items]) => ({
      category,
      display: getCategoryDisplay(category),
      items,
    }))
    .sort((a, b) => a.display.sort_order - b.display.sort_order);
}

/** Return the list of types that belong to a category — used for scoped delete-all. */
export function getTypesForCategory(category: NotificationCategory): string[] {
  return Object.entries(NOTIFICATION_TYPES)
    .filter(([, def]) => def.category === category)
    .map(([type]) => type);
}
