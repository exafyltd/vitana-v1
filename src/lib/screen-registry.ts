/**
 * Screen Registry - Maps routes to rich screen metadata for AI context awareness
 *
 * This registry enables the Vitana assistant orb to understand which screen
 * the user is currently viewing and provide contextually relevant assistance.
 */

export type ScreenModule =
  | 'home' | 'community' | 'discover' | 'health' | 'inbox'
  | 'ai' | 'wallet' | 'sharing' | 'memory' | 'settings'
  | 'auth' | 'utility' | 'patient' | 'professional' | 'staff' | 'admin' | 'dev';

export interface ScreenMeta {
  id: string;
  name: string;
  module: ScreenModule;
  description: string;
  /** What the AI assistant can help with on this screen */
  capabilities: string[];
  /** Prompt augmentation injected when user is on this screen */
  promptHint: string;
}

/**
 * Route pattern → ScreenMeta mapping
 * Routes are matched in order; first match wins.
 * Supports :param patterns via matchRoute().
 */
export const SCREEN_REGISTRY: Record<string, ScreenMeta> = {
  // ── HOME ──────────────────────────────────────────────
  '/home': {
    id: 'HOME-001', name: 'Home Overview', module: 'home',
    description: 'Main dashboard with personalized overview, quick actions, and AI feed.',
    capabilities: ['view daily summary', 'check pending actions', 'browse AI feed', 'see matches'],
    promptHint: 'User is on their home dashboard. Help with daily overview, pending actions, or navigating to other sections.',
  },
  '/home/context': {
    id: 'HOME-002', name: 'Context', module: 'home',
    description: 'Contextual information and situational awareness panel.',
    capabilities: ['view current context', 'check situational data'],
    promptHint: 'User is viewing their context panel. Help them understand their current situation and relevant data.',
  },
  '/home/actions': {
    id: 'HOME-003', name: 'Actions', module: 'home',
    description: 'Pending and suggested actions for the user.',
    capabilities: ['view pending actions', 'complete tasks', 'dismiss suggestions'],
    promptHint: 'User is viewing their actions list. Help them prioritize or complete pending tasks.',
  },
  '/home/matches': {
    id: 'HOME-004', name: 'Matches', module: 'home',
    description: 'Community member matches based on compatibility.',
    capabilities: ['browse matches', 'start conversations', 'view compatibility scores'],
    promptHint: 'User is viewing community matches. Help them connect with compatible members or understand match scores.',
  },
  '/home/aifeed': {
    id: 'HOME-005', name: 'AI Feed', module: 'home',
    description: 'AI-curated content feed with personalized recommendations.',
    capabilities: ['browse AI recommendations', 'view curated content'],
    promptHint: 'User is browsing their AI-curated feed. Help them find relevant content or explain recommendations.',
  },

  // ── COMMUNITY ─────────────────────────────────────────
  '/comm': {
    id: 'COMM-001', name: 'Community Overview', module: 'community',
    description: 'Community hub with events, groups, live rooms, and media.',
    capabilities: ['browse events', 'explore groups', 'join live rooms', 'view media', 'connect with members'],
    promptHint: 'User is in the community hub. Help them discover events, groups, live rooms, or connect with other members.',
  },
  '/comm/events-meetups': {
    id: 'COMM-002', name: 'Events & Meetups', module: 'community',
    description: 'Browse and register for community events and meetups.',
    capabilities: ['browse events', 'register for events', 'filter by date/category', 'view event details', 'share events'],
    promptHint: 'User is browsing events and meetups. Help them find relevant events, register, or get event details. You can offer to RSVP for them.',
  },
  '/comm/live-rooms': {
    id: 'COMM-003', name: 'Live Rooms', module: 'community',
    description: 'Live audio rooms for real-time community conversations.',
    capabilities: ['join live rooms', 'create live rooms', 'browse active rooms', 'view room topics'],
    promptHint: 'User is viewing live rooms. Help them join an active room, create a new one, or find rooms matching their interests.',
  },
  '/comm/media-hub': {
    id: 'COMM-004', name: 'Media Hub', module: 'community',
    description: 'Community media content including videos, podcasts, and music.',
    capabilities: ['browse media', 'upload content', 'play media', 'view analytics'],
    promptHint: 'User is in the media hub. Help them discover content, upload their own, or understand media analytics.',
  },
  '/comm/my-business': {
    id: 'COMM-005', name: 'My Business', module: 'community',
    description: 'Business profile and service offerings management.',
    capabilities: ['manage business profile', 'set up offerings', 'view business analytics'],
    promptHint: 'User is managing their business profile. Help with service offerings, pricing, or growing their business presence.',
  },
  '/comm/groups': {
    id: 'COMM-009', name: 'Groups', module: 'community',
    description: 'Browse and manage community wellness groups.',
    capabilities: ['browse groups', 'create groups', 'join groups', 'manage group settings'],
    promptHint: 'User is browsing community groups. Help them find groups matching their interests or create a new group.',
  },
  '/comm/feed': {
    id: 'COMM-007', name: 'Community Feed', module: 'community',
    description: 'Community activity feed with posts and updates.',
    capabilities: ['browse posts', 'create posts', 'interact with content', 'share updates'],
    promptHint: 'User is viewing the community feed. Help them engage with posts or create new content.',
  },
  '/comm/challenges': {
    id: 'COMM-008', name: 'Challenges', module: 'community',
    description: 'Wellness challenges and competitions.',
    capabilities: ['browse challenges', 'join challenges', 'track progress'],
    promptHint: 'User is viewing wellness challenges. Help them find and join challenges or track their progress.',
  },

  // ── DISCOVER ──────────────────────────────────────────
  '/discover': {
    id: 'DISC-001', name: 'Discover Overview', module: 'discover',
    description: 'Marketplace for supplements, wellness services, doctors, and deals.',
    capabilities: ['browse supplements', 'find services', 'explore deals', 'view orders'],
    promptHint: 'User is in the discover/marketplace section. Help them find products, services, or providers.',
  },
  '/discover/supplements': {
    id: 'DISC-002', name: 'Supplements', module: 'discover',
    description: 'Browse and purchase wellness supplements.',
    capabilities: ['browse supplements', 'compare products', 'add to cart', 'view ingredients'],
    promptHint: 'User is browsing supplements. Help with product recommendations, ingredient questions, or purchase decisions.',
  },
  '/discover/wellness-services': {
    id: 'DISC-003', name: 'Wellness Services', module: 'discover',
    description: 'Browse wellness service providers.',
    capabilities: ['find services', 'book appointments', 'compare providers'],
    promptHint: 'User is browsing wellness services. Help them find the right service or provider for their needs.',
  },
  '/discover/doctors-coaches': {
    id: 'DISC-004', name: 'Doctors & Coaches', module: 'discover',
    description: 'Find and connect with health professionals.',
    capabilities: ['find doctors', 'find coaches', 'view credentials', 'book consultations'],
    promptHint: 'User is looking for doctors or coaches. Help them find the right professional based on their health needs.',
  },
  '/discover/deals-offers': {
    id: 'DISC-005', name: 'Deals & Offers', module: 'discover',
    description: 'Special deals and promotional offers.',
    capabilities: ['browse deals', 'redeem offers', 'view discounts'],
    promptHint: 'User is browsing deals and offers. Help them find the best deals relevant to their interests.',
  },
  '/discover/orders': {
    id: 'DISC-006', name: 'Orders', module: 'discover',
    description: 'Order history and tracking.',
    capabilities: ['view order history', 'track shipments', 'reorder items'],
    promptHint: 'User is viewing their orders. Help with order status, tracking, or reordering.',
  },
  '/discover/cart': {
    id: 'DISC-009', name: 'Cart', module: 'discover',
    description: 'Shopping cart for supplements and products.',
    capabilities: ['view cart', 'modify quantities', 'apply coupons', 'checkout'],
    promptHint: 'User is viewing their cart. Help with checkout, applying discounts, or product questions.',
  },

  // ── HEALTH ────────────────────────────────────────────
  '/health': {
    id: 'HLTH-001', name: 'Health Overview', module: 'health',
    description: 'Personal health dashboard with Vitana score and pillar tracking.',
    capabilities: ['view health score', 'check pillars', 'browse plans', 'upload biomarkers'],
    promptHint: 'User is on their health dashboard. Help with health score interpretation, pillar improvements, or health planning.',
  },
  '/health/services-hub': {
    id: 'HLTH-002', name: 'Health Services Hub', module: 'health',
    description: 'Browse and access health services.',
    capabilities: ['find services', 'book appointments', 'view providers'],
    promptHint: 'User is browsing health services. Help them find appropriate services for their health goals.',
  },
  '/health/my-biology': {
    id: 'HLTH-003', name: 'My Biology (Biomarkers)', module: 'health',
    description: 'Biomarker data, lab results, and biological tracking.',
    capabilities: ['view biomarkers', 'upload lab results', 'track trends', 'understand results'],
    promptHint: 'User is viewing their biomarker data. Help interpret results, explain trends, or suggest improvements.',
  },
  '/health/plans': {
    id: 'HLTH-004', name: 'Health Plans', module: 'health',
    description: 'Personalized health and wellness plans.',
    capabilities: ['view plans', 'start plans', 'track plan progress'],
    promptHint: 'User is viewing health plans. Help them choose, start, or track progress on wellness plans.',
  },
  '/health/education': {
    id: 'HLTH-005', name: 'Health Education', module: 'health',
    description: 'Health and wellness educational content.',
    capabilities: ['browse articles', 'watch videos', 'learn about conditions'],
    promptHint: 'User is in the health education section. Help them find relevant educational content.',
  },
  '/health/pillars': {
    id: 'HLTH-006', name: 'Health Pillars', module: 'health',
    description: 'Track wellness across sleep, nutrition, exercise, mental health, and more.',
    capabilities: ['view pillar scores', 'log activities', 'get recommendations'],
    promptHint: 'User is tracking their health pillars. Help with specific pillar improvements, logging activities, or understanding scores.',
  },
  '/health/conditions': {
    id: 'HLTH-007', name: 'Conditions & Risks', module: 'health',
    description: 'Health conditions and risk assessments.',
    capabilities: ['view conditions', 'assess risks', 'get recommendations'],
    promptHint: 'User is viewing health conditions and risks. Help explain conditions or suggest preventive actions.',
  },

  // ── INBOX ─────────────────────────────────────────────
  '/inbox': {
    id: 'INBX-001', name: 'Inbox Overview', module: 'inbox',
    description: 'Messages and conversations with community members.',
    capabilities: ['view messages', 'send messages', 'manage conversations'],
    promptHint: 'User is in their inbox. Help with messages, suggest responses, or manage conversations.',
  },
  '/inbox/reminder': {
    id: 'INBX-002', name: 'Reminders', module: 'inbox',
    description: 'Saved reminders and follow-ups.',
    capabilities: ['view reminders', 'set reminders', 'dismiss reminders'],
    promptHint: 'User is viewing reminders. Help manage or set up new reminders.',
  },
  '/inbox/inspiration': {
    id: 'INBX-003', name: 'Inspiration', module: 'inbox',
    description: 'Inspirational content and wellness quotes.',
    capabilities: ['browse inspiration', 'save favorites'],
    promptHint: 'User is viewing inspirational content. Share wellness wisdom or help find motivating content.',
  },
  '/inbox/archived': {
    id: 'INBX-004', name: 'Archived Messages', module: 'inbox',
    description: 'Archived conversations and messages.',
    capabilities: ['search archives', 'restore conversations'],
    promptHint: 'User is viewing archived messages. Help search or restore old conversations.',
  },

  // ── AI MODULE ─────────────────────────────────────────
  '/ai': {
    id: 'AI-001', name: 'AI Overview', module: 'ai',
    description: 'AI insights, recommendations, and companion features.',
    capabilities: ['view insights', 'get recommendations', 'read daily summary', 'chat with companion'],
    promptHint: 'User is in the AI section. Help them explore AI-generated insights or recommendations.',
  },
  '/ai/insights': {
    id: 'AI-002', name: 'AI Insights', module: 'ai',
    description: 'AI-generated insights about user behavior and health patterns.',
    capabilities: ['view insights', 'explore patterns', 'understand trends'],
    promptHint: 'User is viewing AI insights. Help them understand patterns, trends, and actionable insights.',
  },
  '/ai/recommendations': {
    id: 'AI-003', name: 'AI Recommendations', module: 'ai',
    description: 'Personalized AI recommendations.',
    capabilities: ['view recommendations', 'accept/dismiss suggestions'],
    promptHint: 'User is viewing AI recommendations. Help explain why recommendations were made or how to act on them.',
  },
  '/ai/daily-summary': {
    id: 'AI-004', name: 'Daily Summary', module: 'ai',
    description: 'AI-generated daily wellness summary.',
    capabilities: ['read summary', 'view highlights', 'check progress'],
    promptHint: 'User is reading their daily summary. Help them understand key takeaways or plan their day.',
  },
  '/ai/companion': {
    id: 'AI-005', name: 'AI Companion', module: 'ai',
    description: 'Interactive AI companion for ongoing wellness support.',
    capabilities: ['chat', 'get advice', 'track goals'],
    promptHint: 'User is with their AI companion. Be conversational and supportive about their wellness journey.',
  },

  // ── WALLET ────────────────────────────────────────────
  '/wallet': {
    id: 'WLLT-001', name: 'Wallet Overview', module: 'wallet',
    description: 'Digital wallet with USD, VTNA tokens, and credits.',
    capabilities: ['view balances', 'transfer funds', 'view transactions', 'redeem rewards'],
    promptHint: 'User is viewing their wallet. Help with balance inquiries, transfers, transaction history, or rewards redemption.',
  },
  '/wallet/balance': {
    id: 'WLLT-002', name: 'Balance & Benefits', module: 'wallet',
    description: 'Detailed balance breakdown and benefits.',
    capabilities: ['view detailed balances', 'check benefits', 'deposit/withdraw'],
    promptHint: 'User is viewing their balance details. Help with financial questions, benefits, or transactions.',
  },
  '/wallet/subscriptions': {
    id: 'WLLT-003', name: 'Subscriptions', module: 'wallet',
    description: 'Manage active subscriptions and memberships.',
    capabilities: ['view subscriptions', 'manage plans', 'cancel/upgrade'],
    promptHint: 'User is managing subscriptions. Help compare plans, manage renewals, or explain benefits.',
  },
  '/wallet/rewards': {
    id: 'WLLT-004', name: 'Rewards & Commissions', module: 'wallet',
    description: 'Earned rewards and commission tracking.',
    capabilities: ['view rewards', 'track commissions', 'redeem points'],
    promptHint: 'User is viewing rewards and commissions. Help them understand earnings or redeem rewards.',
  },

  // ── SHARING ───────────────────────────────────────────
  '/sharing': {
    id: 'SHAR-001', name: 'Sharing Overview', module: 'sharing',
    description: 'Health data sharing, campaigns, and distribution.',
    capabilities: ['manage sharing', 'view campaigns', 'control consent'],
    promptHint: 'User is in the sharing section. Help with data sharing preferences, campaigns, or consent management.',
  },
  '/sharing/campaigns': {
    id: 'SHAR-002', name: 'Campaigns', module: 'sharing',
    description: 'Sharing campaigns and referral programs.',
    capabilities: ['view campaigns', 'create campaigns', 'track performance'],
    promptHint: 'User is viewing sharing campaigns. Help with campaign creation, tracking, or optimization.',
  },
  '/sharing/distribution': {
    id: 'SHAR-004', name: 'Distribution', module: 'sharing',
    description: 'Content and data distribution management.',
    capabilities: ['manage distribution', 'set channels', 'track reach'],
    promptHint: 'User is managing distribution. Help with channel setup or distribution strategies.',
  },
  '/sharing/data-consent': {
    id: 'SHAR-005', name: 'Data & Consent', module: 'sharing',
    description: 'Data sharing consent and privacy controls.',
    capabilities: ['manage consent', 'review permissions', 'control data sharing'],
    promptHint: 'User is managing data consent. Help explain privacy controls and consent options clearly.',
  },

  // ── MEMORY ────────────────────────────────────────────
  '/memory': {
    id: 'MEMO-001', name: 'Memory Overview', module: 'memory',
    description: 'Memory garden with AI insights, diary entries, and recall.',
    capabilities: ['browse memories', 'search memories', 'add diary entries', 'manage permissions'],
    promptHint: 'User is in their memory garden. Help search, organize, or reflect on memories and diary entries.',
  },
  '/memory/timeline': {
    id: 'MEMO-002', name: 'Memory Timeline', module: 'memory',
    description: 'Chronological view of all memories and insights.',
    capabilities: ['browse timeline', 'search by date', 'filter by type'],
    promptHint: 'User is browsing their memory timeline. Help them find specific memories, recall events, or explore their history.',
  },
  '/memory/diary': {
    id: 'MEMO-003', name: 'Daily Diary', module: 'memory',
    description: 'Personal diary for daily reflections and wellness journaling.',
    capabilities: ['write entries', 'view past entries', 'tag entries', 'attach media'],
    promptHint: 'User is in their diary. Help with journaling prompts, reflecting on entries, or extracting insights from their writing.',
  },
  '/memory/recall': {
    id: 'MEMO-004', name: 'Memory Recall', module: 'memory',
    description: 'Search and retrieve specific memories from the memory garden.',
    capabilities: ['search memories', 'recall facts', 'find patterns'],
    promptHint: 'User is using memory recall. Help them search for specific memories or facts stored in their memory garden.',
  },
  '/memory/permissions': {
    id: 'MEMO-005', name: 'Memory Permissions', module: 'memory',
    description: 'Control which memories are shared and with whom.',
    capabilities: ['manage permissions', 'set sharing rules', 'review access'],
    promptHint: 'User is managing memory permissions. Help explain privacy controls for their memory data.',
  },

  // ── SETTINGS ──────────────────────────────────────────
  '/settings': {
    id: 'SETT-001', name: 'Settings Overview', module: 'settings',
    description: 'App settings and configuration.',
    capabilities: ['manage preferences', 'update profile', 'configure notifications', 'manage connections'],
    promptHint: 'User is in settings. Help them find and configure specific settings or explain options.',
  },
  '/settings/preferences': {
    id: 'SETT-002', name: 'Preferences', module: 'settings',
    description: 'Language, theme, assistant, and display preferences.',
    capabilities: ['change language', 'toggle dark mode', 'configure assistant', 'set defaults'],
    promptHint: 'User is configuring preferences. Help with language settings, display options, or assistant configuration.',
  },
  '/settings/privacy': {
    id: 'SETT-003', name: 'Privacy Settings', module: 'settings',
    description: 'Privacy controls and data protection settings.',
    capabilities: ['manage privacy', 'control visibility', 'data deletion'],
    promptHint: 'User is managing privacy settings. Help explain privacy options and their implications clearly.',
  },
  '/settings/notifications': {
    id: 'SETT-004', name: 'Notification Settings', module: 'settings',
    description: 'Push notification and email preferences.',
    capabilities: ['toggle notifications', 'set quiet hours', 'manage channels'],
    promptHint: 'User is configuring notifications. Help them set up notification preferences that work for them.',
  },
  '/settings/connected-apps': {
    id: 'SETT-005', name: 'Connected Apps', module: 'settings',
    description: 'Third-party app integrations and connections.',
    capabilities: ['connect apps', 'disconnect apps', 'manage permissions'],
    promptHint: 'User is managing connected apps. Help with integration setup or troubleshooting connections.',
  },
  '/settings/billing': {
    id: 'SETT-006', name: 'Billing & Rewards', module: 'settings',
    description: 'Billing information and rewards settings.',
    capabilities: ['manage billing', 'view invoices', 'update payment methods'],
    promptHint: 'User is managing billing. Help with payment methods, invoices, or billing questions.',
  },
  '/settings/support': {
    id: 'SETT-007', name: 'Support', module: 'settings',
    description: 'Help center and customer support.',
    capabilities: ['get help', 'contact support', 'browse FAQ'],
    promptHint: 'User is looking for support. Be especially helpful and guide them to the right resources.',
  },
  '/settings/tenant': {
    id: 'SETT-008', name: 'Tenant & Role', module: 'settings',
    description: 'Organization/tenant and role management.',
    capabilities: ['view tenant info', 'manage roles', 'switch organizations'],
    promptHint: 'User is managing their tenant and role settings. Help with organization or role questions.',
  },

  // ── UTILITY SCREENS ───────────────────────────────────
  '/assistant': {
    id: 'UTIL-001', name: 'AI Assistant', module: 'utility',
    description: 'Persistent AI chat interface.',
    capabilities: ['chat', 'ask questions', 'get help'],
    promptHint: 'User has the AI assistant open. Be ready for any question or task.',
  },
  '/calendar': {
    id: 'UTIL-002', name: 'Calendar', module: 'utility',
    description: 'Universal calendar with events and scheduling.',
    capabilities: ['view calendar', 'manage events', 'set reminders'],
    promptHint: 'User is viewing the calendar. Help with scheduling, upcoming events, or time management.',
  },
  '/search': {
    id: 'UTIL-003', name: 'Search', module: 'utility',
    description: 'Global search across the platform.',
    capabilities: ['search content', 'find members', 'locate features'],
    promptHint: 'User is searching. Help refine their search or suggest where to find what they need.',
  },
  '/me/profile/edit': {
    id: 'UTIL-004', name: 'Profile Edit', module: 'utility',
    description: 'Edit personal profile information.',
    capabilities: ['edit profile', 'upload avatar', 'update bio'],
    promptHint: 'User is editing their profile. Help with profile optimization or suggest what to add.',
  },
  '/me/profile': {
    id: 'UTIL-005', name: 'My Profile', module: 'utility',
    description: 'View personal public profile.',
    capabilities: ['view profile', 'check stats', 'manage posts'],
    promptHint: 'User is viewing their profile. Help them understand their stats or improve their profile.',
  },
};

/**
 * Module-level descriptions for higher-level context when no specific screen matches
 */
export const MODULE_DESCRIPTIONS: Record<ScreenModule, string> = {
  home: 'Personal dashboard with overview, actions, matches, and AI feed.',
  community: 'Social hub for events, groups, live rooms, media, and member connections.',
  discover: 'Marketplace for supplements, wellness services, health providers, and deals.',
  health: 'Personal health tracking with biomarkers, pillars, plans, and conditions.',
  inbox: 'Direct messages, reminders, and inspirational content.',
  ai: 'AI-powered insights, recommendations, daily summaries, and companion chat.',
  wallet: 'Digital wallet with balances, subscriptions, and rewards/commissions.',
  sharing: 'Data sharing campaigns, distribution, and consent management.',
  memory: 'Memory garden with diary entries, AI insights, timeline, and recall.',
  settings: 'App configuration including preferences, privacy, notifications, and integrations.',
  auth: 'Authentication and onboarding screens.',
  utility: 'Cross-cutting features like search, calendar, and profile management.',
  patient: 'Patient-specific health management dashboard.',
  professional: 'Healthcare professional tools and patient management.',
  staff: 'Staff operations including queue management and daily tasks.',
  admin: 'Platform administration and system management.',
  dev: 'Developer tools, command center, and system observability.',
};

/**
 * Resolve the current pathname to its ScreenMeta.
 * Tries exact match first, then prefix match for parameterized routes.
 */
export function resolveScreen(pathname: string): ScreenMeta | null {
  // Exact match
  if (SCREEN_REGISTRY[pathname]) {
    return SCREEN_REGISTRY[pathname];
  }

  // Try stripping trailing slash
  const normalized = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  if (SCREEN_REGISTRY[normalized]) {
    return SCREEN_REGISTRY[normalized];
  }

  // Prefix match: find the most specific (longest) matching route
  const candidates = Object.keys(SCREEN_REGISTRY)
    .filter(route => normalized.startsWith(route))
    .sort((a, b) => b.length - a.length);

  if (candidates.length > 0) {
    return SCREEN_REGISTRY[candidates[0]];
  }

  return null;
}

/**
 * Resolve the module from a pathname.
 */
export function resolveModule(pathname: string): ScreenModule {
  const screen = resolveScreen(pathname);
  if (screen) return screen.module;

  // Fallback: derive from first path segment
  const segment = pathname.split('/').filter(Boolean)[0] || '';
  const segmentMap: Record<string, ScreenModule> = {
    home: 'home', comm: 'community', community: 'community',
    discover: 'discover', health: 'health', inbox: 'inbox',
    ai: 'ai', wallet: 'wallet', sharing: 'sharing',
    memory: 'memory', settings: 'settings', auth: 'auth',
    login: 'auth', register: 'auth', patient: 'patient',
    professional: 'professional', staff: 'staff', admin: 'admin',
    dev: 'dev', assistant: 'utility', search: 'utility',
    calendar: 'utility', me: 'utility',
  };
  return segmentMap[segment] || 'home';
}
