/**
 * Dev Gateway API Client
 * Handles all communication with Vitana Gateway backend
 * Supports OASIS, VTID, Governance, Workers, CI/CD, Telemetry, LLM, and Autopilot domains
 */

import { DEV_HUB_CONFIG } from '@/config/devHub.config';

// ── Shared Types ──────────────────────────────────────────────

export interface GatewayHealth {
  ok: boolean;
  service: string;
  time: string;
}

export interface GatewayError {
  error: string;
  available: boolean;
  message?: string;
}

// ── Events Types ──────────────────────────────────────────────

export interface VTIDInfo {
  label: string;
  global_number: number;
  color: string;
  layer: string;
  module: string;
}

export interface RecentEvent {
  id: string;
  service: string;
  event: string;
  status: 'green' | 'blue' | 'yellow' | 'red';
  tenant: string;
  rid: string;
  created_at: string;
  vtid?: VTIDInfo;
}

export interface RecentVTID {
  label: string;
  color: string;
  layer: string;
  module: string;
  global_number: number;
  sub_number: number;
  title: string;
  created_at: string;
}

// ── OASIS Types ───────────────────────────────────────────────

export interface OasisEvent {
  id: string;
  type: string;
  topic: string;
  source: string;
  vtid: string;
  service: string;
  status: string;
  message: string;
  payload: Record<string, unknown>;
  created_at: string;
}

// ── VTID Types ────────────────────────────────────────────────

export interface VTIDRecord {
  vtid: string;
  title: string;
  status: string;
  spec_status: string;
  is_terminal: boolean;
  terminal_outcome: string | null;
  claimed_by: string | null;
  claimed_until: string | null;
  target_roles: string[];
  created_at: string;
  updated_at: string;
}

export interface VTIDProjection {
  total: number;
  by_status: Record<string, number>;
  by_spec_status: Record<string, number>;
  completion_rate: number;
  recent_velocity: number;
  data?: Array<{ date: string; created: number; completed: number }>;
}

export interface AllocatorStatus {
  enabled: boolean;
  next_vtid: number;
  last_allocated: string | null;
  total_allocated: number;
}

// ── Governance Types ──────────────────────────────────────────

export interface GovernanceStatus {
  execution_disarmed: boolean;
  autopilot_loop_enabled: boolean;
  vtid_allocator_enabled: boolean;
  active_rules: number;
  rules?: Array<{
    id: string;
    name: string;
    condition: string;
    action: string;
    priority: number;
    enabled: boolean;
  }>;
}

// ── Worker Types ──────────────────────────────────────────────

export interface WorkerInfo {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'busy';
  capabilities: string[];
  last_heartbeat: string;
  claimed_vtid: string | null;
  registered_at: string;
}

export interface PendingTask {
  vtid: string;
  title: string;
  status: string;
  spec_status: string;
  target_roles: string[];
  created_at: string;
  priority: number;
}

// ── CI/CD Types ───────────────────────────────────────────────

export interface CICDHealth {
  ok: boolean;
  pipelines: Array<{
    service: string;
    status: 'passing' | 'failing' | 'pending' | 'unknown';
    last_run: string;
    duration_ms: number;
    git_sha: string;
  }>;
}

export interface CICDApproval {
  id: string;
  vtid: string;
  service: string;
  type: 'deploy' | 'merge' | 'rollback';
  requestor: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
}

export interface LockStatus {
  locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
  reason: string | null;
}

// ── Gateway Logs Types ────────────────────────────────────────

export interface GatewayEvent {
  id: string;
  method: string;
  path: string;
  status_code: number;
  latency_ms: number;
  tenant: string;
  user_id: string | null;
  timestamp: string;
}

// ── Telemetry Types ───────────────────────────────────────────

export interface TelemetrySnapshot {
  request_rate: number;
  error_rate: number;
  latency_p50: number;
  latency_p95: number;
  latency_p99: number;
  uptime_seconds: number;
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    latency_ms: number;
    error_rate: number;
  }>;
}

// ── LLM Types ─────────────────────────────────────────────────

export interface LLMTelemetry {
  total_calls: number;
  total_tokens: number;
  total_cost_usd: number;
  by_provider: Array<{
    provider: string;
    model: string;
    calls: number;
    tokens: number;
    cost_usd: number;
    avg_latency_ms: number;
  }>;
  recent: Array<{
    timestamp: string;
    provider: string;
    model: string;
    tokens: number;
    latency_ms: number;
  }>;
}

export interface LLMRoutingPolicy {
  default_provider: string;
  default_model: string;
  rules: Array<{
    task_type: string;
    provider: string;
    model: string;
    priority: number;
  }>;
}

// ── Autopilot Types ───────────────────────────────────────────

export interface AutopilotRecommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  status: 'pending' | 'accepted' | 'dismissed';
  created_at: string;
}

// ── Client Class ──────────────────────────────────────────────

class DevGatewayClient {
  private baseUrl: string;

  constructor(baseUrl: string = DEV_HUB_CONFIG.gatewayBase) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T | GatewayError> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        return {
          error: 'gateway_error',
          available: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return await response.json();
    } catch (error) {
      return {
        error: 'network_error',
        available: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private buildQuery(params: Record<string, string | number | boolean | undefined>): string {
    const qp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) qp.set(key, String(value));
    }
    const qs = qp.toString();
    return qs ? `?${qs}` : '';
  }

  // ── Health ────────────────────────────────────────────────

  async getHealth(): Promise<GatewayHealth | GatewayError> {
    return this.fetch<GatewayHealth>('/events/health');
  }

  // ── Events (existing) ─────────────────────────────────────

  async getRecentEvents(params?: {
    limit?: number;
    tenant?: string;
  }): Promise<RecentEvent[] | GatewayError> {
    const query = this.buildQuery({ limit: params?.limit, tenant: params?.tenant });
    return this.fetch<RecentEvent[]>(`/events/recent${query}`);
  }

  async getRecentVTIDs(params?: {
    limit?: number;
  }): Promise<RecentVTID[] | GatewayError> {
    const query = this.buildQuery({ limit: params?.limit });
    return this.fetch<RecentVTID[]>(`/vtid/recent${query}`);
  }

  // ── OASIS Events ──────────────────────────────────────────

  async getOasisEvents(params?: {
    limit?: number;
    service?: string;
    status?: string;
    vtid?: string;
    type?: string;
  }): Promise<OasisEvent[] | GatewayError> {
    const query = this.buildQuery({
      limit: params?.limit,
      service: params?.service,
      status: params?.status,
      vtid: params?.vtid,
      type: params?.type,
    });
    return this.fetch<OasisEvent[]>(`/api/v1/oasis/events${query}`);
  }

  async getOasisSmartEvents(params?: {
    limit?: number;
  }): Promise<OasisEvent[] | GatewayError> {
    const query = this.buildQuery({ limit: params?.limit });
    return this.fetch<OasisEvent[]>(`/api/v1/oasis/events/smart${query}`);
  }

  // ── VTID ──────────────────────────────────────────────────

  async getVTIDList(params?: {
    limit?: number;
    status?: string;
    spec_status?: string;
    search?: string;
  }): Promise<VTIDRecord[] | GatewayError> {
    const query = this.buildQuery({
      limit: params?.limit,
      status: params?.status,
      spec_status: params?.spec_status,
      search: params?.search,
    });
    return this.fetch<VTIDRecord[]>(`/api/v1/vtid/list${query}`);
  }

  async getVTIDDetail(vtid: string): Promise<VTIDRecord | GatewayError> {
    return this.fetch<VTIDRecord>(`/api/v1/vtid/${encodeURIComponent(vtid)}`);
  }

  async getVTIDProjection(): Promise<VTIDProjection | GatewayError> {
    return this.fetch<VTIDProjection>('/api/v1/vtid/projection');
  }

  async getAllocatorStatus(): Promise<AllocatorStatus | GatewayError> {
    return this.fetch<AllocatorStatus>('/api/v1/vtid/allocator/status');
  }

  // ── Governance ────────────────────────────────────────────

  async getGovernanceStatus(): Promise<GovernanceStatus | GatewayError> {
    return this.fetch<GovernanceStatus>('/api/v1/governance/status');
  }

  // ── Workers ───────────────────────────────────────────────

  async getWorkers(): Promise<WorkerInfo[] | GatewayError> {
    return this.fetch<WorkerInfo[]>('/api/v1/worker/orchestrator/workers');
  }

  async getPendingTasks(): Promise<PendingTask[] | GatewayError> {
    return this.fetch<PendingTask[]>('/api/v1/worker/orchestrator/tasks/pending');
  }

  // ── CI/CD ─────────────────────────────────────────────────

  async getCICDHealth(): Promise<CICDHealth | GatewayError> {
    return this.fetch<CICDHealth>('/api/v1/cicd/health');
  }

  async getCICDApprovals(): Promise<CICDApproval[] | GatewayError> {
    return this.fetch<CICDApproval[]>('/api/v1/cicd/approvals');
  }

  async getLockStatus(): Promise<LockStatus | GatewayError> {
    return this.fetch<LockStatus>('/api/v1/cicd/lock-status');
  }

  // ── Gateway Logs ──────────────────────────────────────────

  async getGatewayEvents(params?: {
    limit?: number;
    method?: string;
    path?: string;
    status_code?: number;
  }): Promise<GatewayEvent[] | GatewayError> {
    const query = this.buildQuery({
      limit: params?.limit,
      method: params?.method,
      path: params?.path,
      status_code: params?.status_code,
    });
    return this.fetch<GatewayEvent[]>(`/api/v1/gateway-events${query}`);
  }

  // ── Telemetry ─────────────────────────────────────────────

  async getTelemetrySnapshot(): Promise<TelemetrySnapshot | GatewayError> {
    return this.fetch<TelemetrySnapshot>('/api/v1/telemetry/snapshot');
  }

  // ── LLM ───────────────────────────────────────────────────

  async getLLMTelemetry(): Promise<LLMTelemetry | GatewayError> {
    return this.fetch<LLMTelemetry>('/api/v1/llm/telemetry');
  }

  async getLLMRoutingPolicy(): Promise<LLMRoutingPolicy | GatewayError> {
    return this.fetch<LLMRoutingPolicy>('/api/v1/llm/routing-policy');
  }

  // ── Autopilot ─────────────────────────────────────────────

  async getAutopilotRecommendations(): Promise<AutopilotRecommendation[] | GatewayError> {
    return this.fetch<AutopilotRecommendation[]>('/api/v1/autopilot/recommendations/');
  }
}

export const gatewayClient = new DevGatewayClient();

export function isGatewayError(result: unknown): result is GatewayError {
  return result !== null && typeof result === 'object' && 'error' in result && 'available' in result;
}
