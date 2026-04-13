/**
 * Mock API server for autopilot wave endpoints.
 * Serves realistic wave data so the frontend can render fully.
 */
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

// ── Wave definitions (mirrors wave-defaults.ts) ─────────────

const WAVES = [
  {
    id: 'wave-1', name: 'Getting Started', description: 'Set up your profile, meet Maxina, explore the community',
    icon: 'rocket', enabled: true, order: 1, is_initiative: false,
    timeline: { start_day: 0, end_day: 7 },
    automation_ids: [], recommendation_templates: ['onboarding_profile','onboarding_avatar','onboarding_explore','onboarding_interests','onboarding_maxina','onboarding_diary_day0','onboarding_health','onboarding_discover_matches'],
    automations: [], total_automations: 0, enabled_automations: 0, implemented_automations: 0, total_templates: 8,
  },
  {
    id: 'wave-2', name: 'Daily Anchors', description: 'Build daily habits — diary, matches, meetups',
    icon: 'sun', enabled: true, order: 2, is_initiative: false,
    timeline: { start_day: 1, end_day: 14 },
    automation_ids: ['AP-0501','AP-0505','AP-0506'], recommendation_templates: ['onboarding_diary','onboarding_matches','onboarding_group','engage_matches','engage_meetup','engage_health'],
    automations: [
      { id: 'AP-0501', name: 'Engagement Loop Trigger', status: 'IMPLEMENTED', enabled: true },
      { id: 'AP-0505', name: 'Daily Match Nudge', status: 'IMPLEMENTED', enabled: true },
      { id: 'AP-0506', name: 'Weekly Group Pulse', status: 'IMPLEMENTED', enabled: false },
    ],
    total_automations: 3, enabled_automations: 2, implemented_automations: 3, total_templates: 6,
  },
  {
    id: 'wave-3', name: 'Deepening Connections', description: 'Deepen connections, set goals, invite friends',
    icon: 'heart', enabled: true, order: 3, is_initiative: false,
    timeline: { start_day: 7, end_day: 30 },
    automation_ids: ['AP-0101','AP-0102','AP-0103','AP-0303','AP-0507'],
    recommendation_templates: ['deepen_connection','set_goal','invite_friend'],
    automations: [
      { id: 'AP-0101', name: 'Daily Match Delivery', status: 'IMPLEMENTED', enabled: true },
      { id: 'AP-0102', name: 'Shared Interest Nudge', status: 'IMPLEMENTED', enabled: true },
      { id: 'AP-0103', name: 'Auto-Introduction', status: 'IMPLEMENTED', enabled: false },
      { id: 'AP-0303', name: 'Event Engagement Activator', status: 'IMPLEMENTED', enabled: false },
      { id: 'AP-0507', name: 'Re-engagement Spark', status: 'PLANNED', enabled: false },
    ],
    total_automations: 5, enabled_automations: 2, implemented_automations: 4, total_templates: 3,
  },
  {
    id: 'wave-4', name: 'Health Intelligence', description: 'Health tracking, biomarker trends, Vitana Index',
    icon: 'activity', enabled: true, order: 4, is_initiative: false,
    timeline: { start_day: 14, end_day: 60 },
    automation_ids: ['AP-0607','AP-0608','AP-0609','AP-0610','AP-0611','AP-0614'],
    recommendation_templates: ['share_expertise','start_streak','streak_celebration'],
    automations: [
      { id: 'AP-0607', name: 'Lab Report Ingestion', status: 'IMPLEMENTED', enabled: true },
      { id: 'AP-0608', name: 'Biomarker Trend Analysis', status: 'IMPLEMENTED', enabled: true },
      { id: 'AP-0609', name: 'Health Recommendations', status: 'PLANNED', enabled: false },
    ],
    total_automations: 6, enabled_automations: 2, implemented_automations: 3, total_templates: 3,
  },
  {
    id: 'wave-5', name: 'Insight Moments', description: 'Weekly reports, pattern reveals, milestones',
    icon: 'lightbulb', enabled: true, order: 5, is_initiative: false,
    timeline: { start_day: 30, end_day: 60 },
    automation_ids: ['AP-0502','AP-0504','AP-0611'],
    recommendation_templates: ['explore_content','try_live_room','create_live_room'],
    automations: [
      { id: 'AP-0502', name: 'Weekly Engagement Report', status: 'IMPLEMENTED', enabled: true },
      { id: 'AP-0504', name: 'Milestone Celebration', status: 'PLANNED', enabled: false },
    ],
    total_automations: 3, enabled_automations: 1, implemented_automations: 1, total_templates: 3,
  },
  {
    id: 'wave-6', name: 'Recommendations & Discovery', description: 'Products, services, professionals tailored to you',
    icon: 'compass', enabled: true, order: 6, is_initiative: false,
    timeline: { start_day: 30, end_day: 90 },
    automation_ids: ['AP-0612','AP-0615','AP-1101','AP-1102','AP-1103','AP-1104'],
    recommendation_templates: ['mentor_newcomer','explore_marketplace'],
    automations: [
      { id: 'AP-0612', name: 'Professional Referral', status: 'PLANNED', enabled: false },
      { id: 'AP-1101', name: 'Service Distribution', status: 'PLANNED', enabled: false },
    ],
    total_automations: 6, enabled_automations: 0, implemented_automations: 0, total_templates: 2,
  },
  {
    id: 'wave-7', name: 'Events & Meetups', description: 'Let Vitana create events, send invitations, organize meetups',
    icon: 'calendar', enabled: false, order: 7, is_initiative: true,
    timeline: { start_day: 14, end_day: 90 },
    automation_ids: ['AP-1401','AP-1402','AP-1403','AP-1404','AP-1405'],
    recommendation_templates: ['initiative_event_create','initiative_calendar_sync','initiative_auto_invite','initiative_event_discover','initiative_meetup_organize'],
    automations: [
      { id: 'AP-1401', name: 'Smart Event Creation', status: 'PLANNED', enabled: false },
      { id: 'AP-1402', name: 'Calendar Availability Check', status: 'PLANNED', enabled: false },
      { id: 'AP-1403', name: 'Auto-Invitation Sender', status: 'PLANNED', enabled: false },
      { id: 'AP-1404', name: 'Event Discovery Recommendation', status: 'PLANNED', enabled: false },
      { id: 'AP-1405', name: 'Social Meetup Organizer', status: 'PLANNED', enabled: false },
    ],
    total_automations: 5, enabled_automations: 0, implemented_automations: 0, total_templates: 5,
  },
  {
    id: 'wave-8', name: 'Business Opportunity', description: 'Marketplace gaps, revenue opportunities, business coaching',
    icon: 'trending-up', enabled: false, order: 8, is_initiative: true,
    timeline: { start_day: 30, end_day: 90 },
    automation_ids: ['AP-1501','AP-1502','AP-1503','AP-1504','AP-1505'],
    recommendation_templates: ['initiative_gap_detection','initiative_revenue_alert','initiative_demand_match','initiative_biz_coach','initiative_income_tips'],
    automations: [
      { id: 'AP-1501', name: 'Marketplace Gap Detection', status: 'PLANNED', enabled: false },
      { id: 'AP-1502', name: 'Revenue Opportunity Alert', status: 'PLANNED', enabled: false },
      { id: 'AP-1503', name: 'Service Demand Matching', status: 'PLANNED', enabled: false },
      { id: 'AP-1504', name: 'Business Setup Coach', status: 'PLANNED', enabled: false },
      { id: 'AP-1505', name: 'Income Growth Tips', status: 'PLANNED', enabled: false },
    ],
    total_automations: 5, enabled_automations: 0, implemented_automations: 0, total_templates: 5,
  },
  {
    id: 'wave-9', name: 'Health Action', description: 'Lab tests, screenings, exercise, supplements — take action',
    icon: 'heart-pulse', enabled: false, order: 9, is_initiative: true,
    timeline: { start_day: 14, end_day: 90 },
    automation_ids: ['AP-1601','AP-1602','AP-1603','AP-1604','AP-1605'],
    recommendation_templates: ['initiative_lab_order','initiative_screening','initiative_health_nudge','initiative_exercise','initiative_supplement_reorder'],
    automations: [
      { id: 'AP-1601', name: 'Lab Test Kit Ordering', status: 'PLANNED', enabled: false },
      { id: 'AP-1602', name: 'Health Screening Scheduler', status: 'PLANNED', enabled: false },
      { id: 'AP-1603', name: 'Motivational Health Nudge', status: 'PLANNED', enabled: false },
      { id: 'AP-1604', name: 'Exercise Initiation', status: 'PLANNED', enabled: false },
      { id: 'AP-1605', name: 'Supplement Reorder Reminder', status: 'PLANNED', enabled: false },
    ],
    total_automations: 5, enabled_automations: 0, implemented_automations: 0, total_templates: 5,
  },
];

// ── Community recommendations with wave metadata ────────────

const RECOMMENDATIONS = [
  // Wave 1: Getting Started
  { id: 'rec-001', title: 'Complete your profile', summary: 'Add your name, bio, and interests so others can find you', status: 'completed', source_ref: 'onboarding_profile', impact_score: 90, wave_id: 'wave-1', wave_order: 1 },
  { id: 'rec-002', title: 'Add your photo', summary: 'Upload a profile photo so your matches can recognize you', status: 'completed', source_ref: 'onboarding_avatar', impact_score: 85, wave_id: 'wave-1', wave_order: 1 },
  { id: 'rec-003', title: 'Explore the community', summary: 'Browse groups, events, and people in your community', status: 'completed', source_ref: 'onboarding_explore', impact_score: 80, wave_id: 'wave-1', wave_order: 1 },
  { id: 'rec-004', title: 'Share your interests', summary: 'Tell us what topics and activities you enjoy', status: 'activated', source_ref: 'onboarding_interests', impact_score: 78, wave_id: 'wave-1', wave_order: 1 },
  { id: 'rec-005', title: 'Say hello to Maxina', summary: 'Chat with your AI wellness companion', status: 'activated', source_ref: 'onboarding_maxina', impact_score: 75, wave_id: 'wave-1', wave_order: 1 },
  { id: 'rec-006', title: 'Start your well-being journal', summary: 'Write your first diary entry to track how you feel', status: 'new', source_ref: 'onboarding_diary_day0', impact_score: 70, wave_id: 'wave-1', wave_order: 1 },
  { id: 'rec-007', title: 'Check your health status', summary: 'See your health overview and Vitana Index', status: 'new', source_ref: 'onboarding_health', impact_score: 68, wave_id: 'wave-1', wave_order: 1 },
  { id: 'rec-008', title: 'Discover your matches', summary: 'See who you have been matched with based on shared interests', status: 'new', source_ref: 'onboarding_discover_matches', impact_score: 65, wave_id: 'wave-1', wave_order: 1 },

  // Wave 2: Daily Anchors
  { id: 'rec-009', title: 'Write in your diary', summary: 'Build a daily journaling habit for wellness', status: 'activated', source_ref: 'onboarding_diary', impact_score: 82, wave_id: 'wave-2', wave_order: 2 },
  { id: 'rec-010', title: 'Check your matches', summary: 'See new people who share your interests', status: 'activated', source_ref: 'onboarding_matches', impact_score: 78, wave_id: 'wave-2', wave_order: 2 },
  { id: 'rec-011', title: 'Join a group', summary: 'Find a group that matches your interests', status: 'new', source_ref: 'onboarding_group', impact_score: 75, wave_id: 'wave-2', wave_order: 2 },
  { id: 'rec-012', title: 'Respond to your matches', summary: 'Send a message to someone you matched with', status: 'new', source_ref: 'engage_matches', impact_score: 72, wave_id: 'wave-2', wave_order: 2 },
  { id: 'rec-013', title: 'Attend a meetup', summary: 'Find and join an upcoming community event', status: 'new', source_ref: 'engage_meetup', impact_score: 70, wave_id: 'wave-2', wave_order: 2 },
  { id: 'rec-014', title: 'Review your health scores', summary: 'Check your latest health metrics and trends', status: 'new', source_ref: 'engage_health', impact_score: 68, wave_id: 'wave-2', wave_order: 2 },

  // Wave 3: Deepening Connections
  { id: 'rec-015', title: 'Deepen a connection', summary: 'Reach out to someone you have connected with', status: 'new', source_ref: 'deepen_connection', impact_score: 75, wave_id: 'wave-3', wave_order: 3 },
  { id: 'rec-016', title: 'Set a health goal', summary: 'Work with Maxina to set and track a wellness goal', status: 'new', source_ref: 'set_goal', impact_score: 72, wave_id: 'wave-3', wave_order: 3 },
  { id: 'rec-017', title: 'Invite a friend', summary: 'Share Vitana with someone you care about', status: 'new', source_ref: 'invite_friend', impact_score: 70, wave_id: 'wave-3', wave_order: 3 },

  // Wave 4: Health Intelligence
  { id: 'rec-018', title: 'Share your expertise', summary: 'Help others by sharing what you know in a group', status: 'new', source_ref: 'share_expertise', impact_score: 65, wave_id: 'wave-4', wave_order: 4 },
  { id: 'rec-019', title: 'Start a wellness streak', summary: 'Log in daily to build your streak and earn VTN', status: 'new', source_ref: 'start_streak', impact_score: 60, wave_id: 'wave-4', wave_order: 4 },

  // Wave 5: Insight Moments
  { id: 'rec-020', title: 'Explore health content', summary: 'Discover articles and videos about longevity', status: 'new', source_ref: 'explore_content', impact_score: 58, wave_id: 'wave-5', wave_order: 5 },
  { id: 'rec-021', title: 'Try a live room', summary: 'Join a live wellness session with the community', status: 'new', source_ref: 'try_live_room', impact_score: 55, wave_id: 'wave-5', wave_order: 5 },

  // Wave 6: Recommendations & Discovery
  { id: 'rec-022', title: 'Mentor a newcomer', summary: 'Welcome and guide a new community member', status: 'new', source_ref: 'mentor_newcomer', impact_score: 50, wave_id: 'wave-6', wave_order: 6 },
  { id: 'rec-023', title: 'Explore the marketplace', summary: 'Discover products and services for your wellness journey', status: 'new', source_ref: 'explore_marketplace', impact_score: 48, wave_id: 'wave-6', wave_order: 6 },

  // Wave 7: Events & Meetups (initiative)
  { id: 'rec-024', title: 'Let Vitana create events for you', summary: 'Enable smart event creation based on your interests', status: 'new', source_ref: 'initiative_event_create', impact_score: 55, wave_id: 'wave-7', wave_order: 7 },
  { id: 'rec-025', title: 'Connect your calendar', summary: 'Sync your calendar so Vitana checks availability', status: 'new', source_ref: 'initiative_calendar_sync', impact_score: 52, wave_id: 'wave-7', wave_order: 7 },
  { id: 'rec-026', title: 'Auto-invite friends to events', summary: 'Let Vitana send invitations to relevant members', status: 'new', source_ref: 'initiative_auto_invite', impact_score: 50, wave_id: 'wave-7', wave_order: 7 },
  { id: 'rec-027', title: 'Get event recommendations', summary: 'Hey, I got something you will like', status: 'new', source_ref: 'initiative_event_discover', impact_score: 48, wave_id: 'wave-7', wave_order: 7 },
  { id: 'rec-028', title: 'Auto-organize social meetups', summary: 'Vitana finds people with shared interests and sets up meetups', status: 'new', source_ref: 'initiative_meetup_organize', impact_score: 45, wave_id: 'wave-7', wave_order: 7 },

  // Wave 8: Business Opportunity (initiative)
  { id: 'rec-029', title: 'Detect marketplace gaps', summary: 'Find unserved demand you could fill', status: 'new', source_ref: 'initiative_gap_detection', impact_score: 52, wave_id: 'wave-8', wave_order: 8 },
  { id: 'rec-030', title: 'Get revenue opportunity alerts', summary: 'I found a way to make money', status: 'new', source_ref: 'initiative_revenue_alert', impact_score: 50, wave_id: 'wave-8', wave_order: 8 },
  { id: 'rec-031', title: 'Match your skills to demand', summary: 'See what services people are looking for', status: 'new', source_ref: 'initiative_demand_match', impact_score: 48, wave_id: 'wave-8', wave_order: 8 },
  { id: 'rec-032', title: 'Get business setup coaching', summary: 'Guidance on listing, pricing, and promotion', status: 'new', source_ref: 'initiative_biz_coach', impact_score: 45, wave_id: 'wave-8', wave_order: 8 },
  { id: 'rec-033', title: 'Receive income growth tips', summary: 'Weekly suggestions to grow your revenue', status: 'new', source_ref: 'initiative_income_tips', impact_score: 42, wave_id: 'wave-8', wave_order: 8 },

  // Wave 9: Health Action (initiative)
  { id: 'rec-034', title: 'Order a lab test kit', summary: 'Let us make a blood test — simple and guided', status: 'new', source_ref: 'initiative_lab_order', impact_score: 55, wave_id: 'wave-9', wave_order: 9 },
  { id: 'rec-035', title: 'Schedule health screenings', summary: 'Proactive screening schedule based on your profile', status: 'new', source_ref: 'initiative_screening', impact_score: 52, wave_id: 'wave-9', wave_order: 9 },
  { id: 'rec-036', title: 'Get daily health nudges', summary: 'Come on. Go. Start. — motivational pushes', status: 'new', source_ref: 'initiative_health_nudge', impact_score: 50, wave_id: 'wave-9', wave_order: 9 },
  { id: 'rec-037', title: 'Start an exercise routine', summary: 'Vitana suggests and schedules exercise for you', status: 'new', source_ref: 'initiative_exercise', impact_score: 48, wave_id: 'wave-9', wave_order: 9 },
  { id: 'rec-038', title: 'Set up supplement reminders', summary: 'Track your supplement usage and get reorder prompts', status: 'new', source_ref: 'initiative_supplement_reorder', impact_score: 45, wave_id: 'wave-9', wave_order: 9 },
];

const ENABLED_WAVES = WAVES.filter(w => w.enabled).map(w => ({
  id: w.id, name: w.name, description: w.description, icon: w.icon,
  order: w.order, is_initiative: w.is_initiative, timeline: w.timeline,
}));

// ── Routes ──────────────────────────────────────────────────

// Community: GET recommendations with wave metadata
app.get('/api/v1/autopilot/recommendations', (req, res) => {
  console.log('[mock] GET /api/v1/autopilot/recommendations');
  res.json({
    ok: true,
    recommendations: RECOMMENDATIONS,
    waves: ENABLED_WAVES,
    count: RECOMMENDATIONS.length,
    has_more: false,
  });
});

// Community: POST activate recommendation
app.post('/api/v1/autopilot/recommendations/:id/activate', (req, res) => {
  console.log(`[mock] POST activate ${req.params.id}`);
  const rec = RECOMMENDATIONS.find(r => r.id === req.params.id);
  if (rec) rec.status = 'activated';
  res.json({
    ok: true,
    action_type: 'notify',
    completion_message: 'Task activated! Working on it...',
  });
});

// Community: GET recommendations count
app.get('/api/v1/autopilot/recommendations/count', (req, res) => {
  res.json({ ok: true, count: RECOMMENDATIONS.filter(r => r.status === 'new').length });
});

// Admin: GET waves
app.get('/api/v1/admin/autopilot/waves', (req, res) => {
  console.log('[mock] GET /api/v1/admin/autopilot/waves');
  res.json({ ok: true, data: WAVES });
});

// Admin: PATCH wave toggle
app.patch('/api/v1/admin/autopilot/waves/:waveId', (req, res) => {
  const wave = WAVES.find(w => w.id === req.params.waveId);
  if (wave) wave.enabled = req.body.enabled;
  console.log(`[mock] PATCH wave ${req.params.waveId} enabled=${req.body.enabled}`);
  res.json({ ok: true, data: { wave_id: req.params.waveId, enabled: req.body.enabled } });
});

// Admin: GET settings
app.get('/api/v1/admin/autopilot/settings', (req, res) => {
  res.json({ ok: true, data: { id: 'mock', tenant_id: 'mock', enabled: true, wave_config: {} } });
});

// Catch-all for other API routes
app.use((req, res) => {
  console.log(`[mock] Unhandled: ${req.method} ${req.path}`);
  res.json({ ok: true, data: [] });
});

app.listen(3099, () => {
  console.log('[mock-api] Autopilot mock API running on http://localhost:3099');
});
