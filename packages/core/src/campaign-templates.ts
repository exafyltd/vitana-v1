/**
 * VTID-05646 — campaign distribution templates (src/lib/campaign-templates.ts):
 * DISTRIBUTION_TEMPLATES (id, frequency, duration, suggested channels, config),
 * CHANNEL_BEST_TIMES, MANUAL_SHARE_CHANNELS and CHANNEL_INFO. Pure data with no
 * imports; the native campaign sheet reads the same templates the web dialog does.
 */
export * from '@/lib/campaign-templates';
