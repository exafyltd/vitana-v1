/**
 * Dev Hub Navigation Configuration
 * Defines horizontal sub-navigation for each main category
 */

// Dashboard horizontal tabs
export const devDashboardNavigation = [
  { id: "overview", name: "Overview", path: "/dev/dashboard" },
  { id: "ai-feed", name: "AI Feed", path: "/dev/dashboard/ai-feed" },
  { id: "alerts", name: "Alerts", path: "/dev/dashboard/alerts" },
  { id: "health", name: "System Health", path: "/dev/dashboard/health" },
];

// Command horizontal tabs
export const devCommandNavigation = [
  { id: "live-console", name: "Live Console", path: "/dev/command" },
  { id: "tasks", name: "Tasks", path: "/dev/command/tasks" },
  { id: "autopilot-runs", name: "Autopilot Runs", path: "/dev/command/autopilot-runs" },
  { id: "screen-awareness", name: "Screen Awareness QA", path: "/dev/command/screen-awareness" },
  { id: "history", name: "History", path: "/dev/command/history" },
];

// Agents horizontal tabs
export const devAgentsNavigation = [
  { id: "planner", name: "Planner", path: "/dev/agents" },
  { id: "worker", name: "Worker", path: "/dev/agents/worker" },
  { id: "validator", name: "Validator", path: "/dev/agents/validator" },
  { id: "qa-test", name: "QA/Test", path: "/dev/agents/qa-test" },
  { id: "crew-template", name: "Crew Template", path: "/dev/agents/crew-template" },
];

// Pipelines horizontal tabs
export const devPipelinesNavigation = [
  { id: "builds", name: "Builds", path: "/dev/pipelines" },
  { id: "tests", name: "Tests", path: "/dev/pipelines/tests" },
  { id: "canary", name: "Canary", path: "/dev/pipelines/canary" },
  { id: "rollbacks", name: "Rollbacks", path: "/dev/pipelines/rollbacks" },
];

// OASIS horizontal tabs
export const devOasisNavigation = [
  { id: "events", name: "Events", path: "/dev/oasis" },
  { id: "state", name: "State", path: "/dev/oasis/state" },
  { id: "ledger", name: "Ledger", path: "/dev/oasis/ledger" },
  { id: "policies", name: "Policies", path: "/dev/oasis/policies" },
];

// VTID horizontal tabs
export const devVTIDNavigation = [
  { id: "registry", name: "Registry", path: "/dev/vtid" },
  { id: "issue", name: "Issue", path: "/dev/vtid/issue" },
  { id: "analytics", name: "Analytics", path: "/dev/vtid/analytics" },
  { id: "search", name: "Search", path: "/dev/vtid/search" },
];

// Gateway horizontal tabs
export const devGatewayNavigation = [
  { id: "endpoints", name: "Endpoints", path: "/dev/gateway" },
  { id: "requests", name: "Requests", path: "/dev/gateway/requests" },
  { id: "mobile", name: "Mobile Links", path: "/dev/gateway/mobile" },
  { id: "webhooks", name: "Webhooks", path: "/dev/gateway/webhooks" },
];

// CI/CD horizontal tabs
export const devCICDNavigation = [
  { id: "workflows", name: "Workflows", path: "/dev/cicd" },
  { id: "runs", name: "Runs", path: "/dev/cicd/runs" },
  { id: "artifacts", name: "Artifacts", path: "/dev/cicd/artifacts" },
  { id: "matrix", name: "Env Matrix", path: "/dev/cicd/matrix" },
];

// Observability horizontal tabs
export const devObservabilityNavigation = [
  { id: "logs", name: "Logs", path: "/dev/observability" },
  { id: "traces", name: "Traces", path: "/dev/observability/traces" },
  { id: "metrics", name: "Metrics", path: "/dev/observability/metrics" },
  { id: "costs", name: "Costs", path: "/dev/observability/costs" },
];

// Settings horizontal tabs
export const devSettingsNavigation = [
  { id: "environment", name: "Environment", path: "/dev/settings" },
  { id: "auth", name: "Auth", path: "/dev/settings/auth" },
  { id: "flags", name: "Feature Flags", path: "/dev/settings/flags" },
  { id: "tenants", name: "Tenants", path: "/dev/settings/tenants" },
];

// Docs horizontal tabs
export const devDocsNavigation = [
  { id: "overview", name: "Overview", path: "/dev/docs" },
  { id: "catalogs", name: "Catalogs", path: "/dev/docs/catalogs" },
  { id: "screen-lists", name: "Screen Lists", path: "/dev/docs/screen-lists" },
  { id: "frontpages", name: "Frontpages", path: "/dev/docs/frontpages" },
  { id: "role-views", name: "Role Views", path: "/dev/docs/role-views" },
];
