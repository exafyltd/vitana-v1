-- Add performance metrics tracking to api_integrations table
ALTER TABLE public.api_integrations
ADD COLUMN IF NOT EXISTS avg_response_time integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS success_rate numeric(5,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS error_rate numeric(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS throughput integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_connections integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS p95_latency integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS p99_latency integer DEFAULT 0;

-- Create table for time-series performance data
CREATE TABLE IF NOT EXISTS public.api_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.api_integrations(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL DEFAULT now(),
  response_time integer NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  error_count integer NOT NULL DEFAULT 0,
  status_code integer,
  endpoint text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add index for efficient time-series queries
CREATE INDEX IF NOT EXISTS idx_api_performance_metrics_integration_time 
ON public.api_performance_metrics(integration_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_api_performance_metrics_timestamp 
ON public.api_performance_metrics(timestamp DESC);

-- Enable RLS
ALTER TABLE public.api_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for performance metrics
CREATE POLICY "Staff can view performance metrics"
ON public.api_performance_metrics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('admin', 'staff')
    AND m.status = 'active'
  )
  OR
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
);

CREATE POLICY "System can insert performance metrics"
ON public.api_performance_metrics
FOR INSERT
WITH CHECK (true);

-- Create function to calculate aggregate metrics
CREATE OR REPLACE FUNCTION public.update_api_metrics(p_integration_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg_response_time integer;
  v_p95_latency integer;
  v_p99_latency integer;
  v_total_requests integer;
  v_total_errors integer;
  v_success_rate numeric;
  v_error_rate numeric;
BEGIN
  -- Calculate metrics from last 24 hours
  SELECT 
    COALESCE(AVG(response_time), 0)::integer,
    COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time), 0)::integer,
    COALESCE(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time), 0)::integer,
    COALESCE(SUM(request_count), 0)::integer,
    COALESCE(SUM(error_count), 0)::integer
  INTO 
    v_avg_response_time,
    v_p95_latency,
    v_p99_latency,
    v_total_requests,
    v_total_errors
  FROM public.api_performance_metrics
  WHERE integration_id = p_integration_id
  AND timestamp > now() - interval '24 hours';

  -- Calculate rates
  IF v_total_requests > 0 THEN
    v_success_rate := ((v_total_requests - v_total_errors)::numeric / v_total_requests::numeric) * 100;
    v_error_rate := (v_total_errors::numeric / v_total_requests::numeric) * 100;
  ELSE
    v_success_rate := 100;
    v_error_rate := 0;
  END IF;

  -- Update integration metrics
  UPDATE public.api_integrations
  SET 
    avg_response_time = v_avg_response_time,
    p95_latency = v_p95_latency,
    p99_latency = v_p99_latency,
    success_rate = v_success_rate,
    error_rate = v_error_rate,
    throughput = (v_total_requests / 24 / 60)::integer, -- requests per minute
    updated_at = now()
  WHERE id = p_integration_id;
END;
$$;

-- Add MCP-specific fields to api_integrations
ALTER TABLE public.api_integrations
ADD COLUMN IF NOT EXISTS mcp_schema jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS mcp_tools jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS mcp_capabilities jsonb DEFAULT '{}'::jsonb;

-- Create table for MCP tool execution logs
CREATE TABLE IF NOT EXISTS public.mcp_tool_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.api_integrations(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  input_parameters jsonb NOT NULL,
  output_result jsonb,
  execution_time_ms integer,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'timeout')),
  error_message text,
  executed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_mcp_tool_executions_integration 
ON public.mcp_tool_executions(integration_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.mcp_tool_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view MCP executions"
ON public.mcp_tool_executions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('admin', 'staff')
    AND m.status = 'active'
  )
  OR
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
);

CREATE POLICY "Authenticated users can execute MCP tools"
ON public.mcp_tool_executions
FOR INSERT
WITH CHECK (auth.uid() = executed_by);

-- Comment on tables
COMMENT ON TABLE public.api_performance_metrics IS 'Time-series performance data for API integrations';
COMMENT ON TABLE public.mcp_tool_executions IS 'Execution logs for MCP (Model Context Protocol) tools';
