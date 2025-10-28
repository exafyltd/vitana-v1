/**
 * Dev Gateway API Client
 * Handles all communication with Vitana Gateway backend
 * Phase 1: Read-only endpoints with graceful error handling
 */

import { DEV_HUB_CONFIG } from '@/config/devHub.config';

export interface GatewayHealth {
  ok: boolean;
  service: string;
  time: string;
}

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

export interface GatewayError {
  error: string;
  available: boolean;
  message?: string;
}

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

  async getHealth(): Promise<GatewayHealth | GatewayError> {
    return this.fetch<GatewayHealth>('/events/health');
  }

  async getRecentEvents(params?: {
    limit?: number;
    tenant?: string;
  }): Promise<RecentEvent[] | GatewayError> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.tenant) queryParams.set('tenant', params.tenant);
    
    const query = queryParams.toString();
    const result = await this.fetch<RecentEvent[]>(`/events/recent${query ? `?${query}` : ''}`);
    
    // If error, return empty array wrapped in error
    if ('error' in result) return result;
    return result;
  }

  async getRecentVTIDs(params?: {
    limit?: number;
  }): Promise<RecentVTID[] | GatewayError> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    
    const query = queryParams.toString();
    const result = await this.fetch<RecentVTID[]>(`/vtid/recent${query ? `?${query}` : ''}`);
    
    if ('error' in result) return result;
    return result;
  }
}

export const gatewayClient = new DevGatewayClient();

export function isGatewayError(result: any): result is GatewayError {
  return result && typeof result === 'object' && 'error' in result && 'available' in result;
}
