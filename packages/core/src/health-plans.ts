/**
 * VTID-05456 (native-wave2-health-biology-r3/health-plans-services) — the pure
 * data and helpers behind the web Plans and Services Hub screens: the sample
 * plans the web falls back to when the member has no `user_health_plans` row
 * (src/data/mock*.ts, src/lib/mockPlanData.ts), the Autopilot cross-plan
 * context (src/services/autopilotContext.ts) and the service detail sample
 * (extracted verbatim from src/components/health/ServiceDetailDrawer.tsx,
 * which itself imports the wallet and payment modules). All IO-free.
 */
export * from '@/data/mockRecipes';
export * from '@/data/mockExercise';
export * from '@/data/mockHydration';
export * from '@/data/mockSleep';
export * from '@/data/mockMental';
export * from '@/lib/mockPlanData';
export * from '@/services/autopilotContext';
export * from './extracted/service-details.generated';
