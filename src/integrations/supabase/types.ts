export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      access_audit_log: {
        Row: {
          action: string
          actor_role: string
          actor_user_id: string
          audit_id: string
          created_at: string
          metadata: Json
          object_id: string
          object_type: string
          reason: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_role: string
          actor_user_id: string
          audit_id?: string
          created_at?: string
          metadata?: Json
          object_id: string
          object_type: string
          reason?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_role?: string
          actor_user_id?: string
          audit_id?: string
          created_at?: string
          metadata?: Json
          object_id?: string
          object_type?: string
          reason?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "access_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "access_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      active_threads: {
        Row: {
          active_role: string
          created_at: string
          id: string
          last_activity_at: string
          tenant_id: string
          thread_id: string
          turn_count: number
          user_id: string
          vtid: string | null
        }
        Insert: {
          active_role?: string
          created_at?: string
          id?: string
          last_activity_at?: string
          tenant_id: string
          thread_id: string
          turn_count?: number
          user_id: string
          vtid?: string | null
        }
        Update: {
          active_role?: string
          created_at?: string
          id?: string
          last_activity_at?: string
          tenant_id?: string
          thread_id?: string
          turn_count?: number
          user_id?: string
          vtid?: string | null
        }
        Relationships: []
      }
      admin_proactive_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_proactive_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      agent_keys: {
        Row: {
          agent_name: string
          created_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
        }
        Insert: {
          agent_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
        }
        Update: {
          agent_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          agent_type: string
          context_snapshot: Json | null
          created_at: string
          id: string
          metadata: Json | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_type: string
          context_snapshot?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_type?: string
          context_snapshot?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      ai_memory: {
        Row: {
          confidence_score: number | null
          content: string
          created_at: string
          embedding: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          memory_type: string
          metadata: Json | null
          source_conversation_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          content: string
          created_at?: string
          embedding?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          memory_type: string
          metadata?: Json | null
          source_conversation_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          content?: string
          created_at?: string
          embedding?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          memory_type?: string
          metadata?: Json | null
          source_conversation_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_memory_source_conversation_id_fkey"
            columns: ["source_conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_memory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          context_used: Json | null
          conversation_id: string
          created_at: string
          id: string
          input_method: string | null
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          context_used?: Json | null
          conversation_id: string
          created_at?: string
          id?: string
          input_method?: string | null
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          context_used?: Json | null
          conversation_id?: string
          created_at?: string
          id?: string
          input_method?: string | null
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_personality_config: {
        Row: {
          config: Json
          is_customized: boolean
          surface_key: string
          updated_at: string | null
          updated_by: string | null
          updated_by_role: string | null
        }
        Insert: {
          config?: Json
          is_customized?: boolean
          surface_key: string
          updated_at?: string | null
          updated_by?: string | null
          updated_by_role?: string | null
        }
        Update: {
          config?: Json
          is_customized?: boolean
          surface_key?: string
          updated_at?: string | null
          updated_by?: string | null
          updated_by_role?: string | null
        }
        Relationships: []
      }
      ai_personality_config_audit: {
        Row: {
          created_at: string | null
          from_config: Json | null
          id: string
          reason: string | null
          surface_key: string
          to_config: Json | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          from_config?: Json | null
          id?: string
          reason?: string | null
          surface_key: string
          to_config?: Json | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          from_config?: Json | null
          id?: string
          reason?: string | null
          surface_key?: string
          to_config?: Json | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_recommendations: {
        Row: {
          actions: Json
          admin_feedback: string | null
          admin_rating: number | null
          complexity_score: number | null
          conditions: Json | null
          confidence_score: number | null
          created_at: string | null
          created_by: string
          deployed: boolean | null
          deployed_at: string | null
          deployed_by: string | null
          deployed_rule_id: string | null
          description: string
          estimated_users_affected: number | null
          id: string
          impact_score: number | null
          rationale: string | null
          situation_id: string | null
          tenant_id: string | null
          title: string
          trigger_config: Json
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          actions: Json
          admin_feedback?: string | null
          admin_rating?: number | null
          complexity_score?: number | null
          conditions?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          created_by: string
          deployed?: boolean | null
          deployed_at?: string | null
          deployed_by?: string | null
          deployed_rule_id?: string | null
          description: string
          estimated_users_affected?: number | null
          id?: string
          impact_score?: number | null
          rationale?: string | null
          situation_id?: string | null
          tenant_id?: string | null
          title: string
          trigger_config: Json
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          admin_feedback?: string | null
          admin_rating?: number | null
          complexity_score?: number | null
          conditions?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          created_by?: string
          deployed?: boolean | null
          deployed_at?: string | null
          deployed_by?: string | null
          deployed_rule_id?: string | null
          description?: string
          estimated_users_affected?: number | null
          id?: string
          impact_score?: number | null
          rationale?: string | null
          situation_id?: string | null
          tenant_id?: string | null
          title?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_recommendations_deployed_rule_id_fkey"
            columns: ["deployed_rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_recommendations_situation_id_fkey"
            columns: ["situation_id"]
            isOneToOne: false
            referencedRelation: "ai_situation_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_recommendations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_recommendations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      ai_situation_analyses: {
        Row: {
          analysis_duration_ms: number | null
          analysis_result: Json | null
          constraints: Json | null
          context_filters: Json | null
          created_at: string | null
          created_by: string
          error_message: string | null
          id: string
          situation_description: string
          status: string | null
          suggested_actions: Json | null
          suggested_conditions: Json | null
          suggested_triggers: string[] | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          analysis_duration_ms?: number | null
          analysis_result?: Json | null
          constraints?: Json | null
          context_filters?: Json | null
          created_at?: string | null
          created_by: string
          error_message?: string | null
          id?: string
          situation_description: string
          status?: string | null
          suggested_actions?: Json | null
          suggested_conditions?: Json | null
          suggested_triggers?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          analysis_duration_ms?: number | null
          analysis_result?: Json | null
          constraints?: Json | null
          context_filters?: Json | null
          created_at?: string | null
          created_by?: string
          error_message?: string | null
          id?: string
          situation_description?: string
          status?: string | null
          suggested_actions?: Json | null
          suggested_conditions?: Json | null
          suggested_triggers?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_situation_analyses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_situation_analyses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      anticipatory_guidance: {
        Row: {
          confidence: number
          created_at: string
          dismissed_at: string | null
          dismissible: boolean
          domain: string
          engaged_at: string | null
          generation_rules_version: string | null
          guidance_mode: string
          guidance_text: string
          id: string
          metadata: Json
          originating_signal_ids: Json | null
          relevance_score: number | null
          source_window_id: string | null
          status: string
          surfaced_at: string | null
          tenant_id: string
          timing_hint: string
          updated_at: string
          user_id: string
          user_preferences_snapshot: Json | null
          why_this_matters: string
        }
        Insert: {
          confidence: number
          created_at?: string
          dismissed_at?: string | null
          dismissible?: boolean
          domain: string
          engaged_at?: string | null
          generation_rules_version?: string | null
          guidance_mode: string
          guidance_text: string
          id?: string
          metadata?: Json
          originating_signal_ids?: Json | null
          relevance_score?: number | null
          source_window_id?: string | null
          status?: string
          surfaced_at?: string | null
          tenant_id: string
          timing_hint: string
          updated_at?: string
          user_id: string
          user_preferences_snapshot?: Json | null
          why_this_matters: string
        }
        Update: {
          confidence?: number
          created_at?: string
          dismissed_at?: string | null
          dismissible?: boolean
          domain?: string
          engaged_at?: string | null
          generation_rules_version?: string | null
          guidance_mode?: string
          guidance_text?: string
          id?: string
          metadata?: Json
          originating_signal_ids?: Json | null
          relevance_score?: number | null
          source_window_id?: string | null
          status?: string
          surfaced_at?: string | null
          tenant_id?: string
          timing_hint?: string
          updated_at?: string
          user_id?: string
          user_preferences_snapshot?: Json | null
          why_this_matters?: string
        }
        Relationships: []
      }
      api_integrations: {
        Row: {
          active_connections: number | null
          auth_token: string | null
          auth_type: string
          avg_response_time: number | null
          base_url: string
          created_at: string | null
          created_by: string | null
          error_rate: number | null
          id: string
          integration_type: string
          is_active: boolean | null
          last_test_status: string | null
          last_test_timestamp: string | null
          mcp_capabilities: Json | null
          mcp_schema: Json | null
          mcp_tools: Json | null
          metadata: Json | null
          name: string
          notes: string | null
          p95_latency: number | null
          p99_latency: number | null
          success_rate: number | null
          test_endpoints: Json | null
          test_frequency_minutes: number
          test_runner_function: string | null
          throughput: number | null
          updated_at: string | null
        }
        Insert: {
          active_connections?: number | null
          auth_token?: string | null
          auth_type: string
          avg_response_time?: number | null
          base_url: string
          created_at?: string | null
          created_by?: string | null
          error_rate?: number | null
          id?: string
          integration_type: string
          is_active?: boolean | null
          last_test_status?: string | null
          last_test_timestamp?: string | null
          mcp_capabilities?: Json | null
          mcp_schema?: Json | null
          mcp_tools?: Json | null
          metadata?: Json | null
          name: string
          notes?: string | null
          p95_latency?: number | null
          p99_latency?: number | null
          success_rate?: number | null
          test_endpoints?: Json | null
          test_frequency_minutes?: number
          test_runner_function?: string | null
          throughput?: number | null
          updated_at?: string | null
        }
        Update: {
          active_connections?: number | null
          auth_token?: string | null
          auth_type?: string
          avg_response_time?: number | null
          base_url?: string
          created_at?: string | null
          created_by?: string | null
          error_rate?: number | null
          id?: string
          integration_type?: string
          is_active?: boolean | null
          last_test_status?: string | null
          last_test_timestamp?: string | null
          mcp_capabilities?: Json | null
          mcp_schema?: Json | null
          mcp_tools?: Json | null
          metadata?: Json | null
          name?: string
          notes?: string | null
          p95_latency?: number | null
          p99_latency?: number | null
          success_rate?: number | null
          test_endpoints?: Json | null
          test_frequency_minutes?: number
          test_runner_function?: string | null
          throughput?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_integrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      api_performance_metrics: {
        Row: {
          created_at: string
          endpoint: string | null
          error_count: number
          id: string
          integration_id: string
          request_count: number
          response_time: number
          status_code: number | null
          timestamp: string
        }
        Insert: {
          created_at?: string
          endpoint?: string | null
          error_count?: number
          id?: string
          integration_id: string
          request_count?: number
          response_time: number
          status_code?: number | null
          timestamp?: string
        }
        Update: {
          created_at?: string
          endpoint?: string | null
          error_count?: number
          id?: string
          integration_id?: string
          request_count?: number
          response_time?: number
          status_code?: number | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_performance_metrics_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "api_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_test_logs: {
        Row: {
          error_log: string | null
          id: string
          integration_id: string
          metadata: Json | null
          response_body: Json | null
          response_time_ms: number | null
          status: string
          test_type: string | null
          timestamp: string | null
          triggered_by: string | null
        }
        Insert: {
          error_log?: string | null
          id?: string
          integration_id: string
          metadata?: Json | null
          response_body?: Json | null
          response_time_ms?: number | null
          status: string
          test_type?: string | null
          timestamp?: string | null
          triggered_by?: string | null
        }
        Update: {
          error_log?: string | null
          id?: string
          integration_id?: string
          metadata?: Json | null
          response_body?: Json | null
          response_time_ms?: number | null
          status?: string
          test_type?: string | null
          timestamp?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_test_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "api_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_test_logs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      api_test_notifications: {
        Row: {
          created_at: string | null
          id: string
          integration_id: string
          message: string
          metadata: Json | null
          notification_type: string
          sent_at: string | null
          severity: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          integration_id: string
          message: string
          metadata?: Json | null
          notification_type?: string
          sent_at?: string | null
          severity?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          integration_id?: string
          message?: string
          metadata?: Json | null
          notification_type?: string
          sent_at?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_test_notifications_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "api_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          live_room_id: string | null
          profile: Json
          status: string
          stripe_account_id: string | null
          stripe_charges_enabled: boolean | null
          stripe_onboarded_at: string | null
          stripe_payouts_enabled: boolean | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          live_room_id?: string | null
          profile?: Json
          status?: string
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_onboarded_at?: string | null
          stripe_payouts_enabled?: boolean | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          live_room_id?: string | null
          profile?: Json
          status?: string
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_onboarded_at?: string | null
          stripe_payouts_enabled?: boolean | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "app_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "app_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "fk_app_users_live_room"
            columns: ["live_room_id"]
            isOneToOne: false
            referencedRelation: "live_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_app_users_live_room"
            columns: ["live_room_id"]
            isOneToOne: false
            referencedRelation: "live_rooms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      automation_executions: {
        Row: {
          actions_executed: Json | null
          conditions_result: Json | null
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          metadata: Json | null
          rule_id: string
          status: string
          tenant_id: string | null
          trigger_data: Json | null
          user_id: string
        }
        Insert: {
          actions_executed?: Json | null
          conditions_result?: Json | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          rule_id: string
          status: string
          tenant_id?: string | null
          trigger_data?: Json | null
          user_id: string
        }
        Update: {
          actions_executed?: Json | null
          conditions_result?: Json | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          rule_id?: string
          status?: string
          tenant_id?: string | null
          trigger_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          action_config: Json
          action_type: string
          conditions: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          scope: string | null
          trigger_config: Json
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          scope?: string | null
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          scope?: string | null
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "automation_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      autopilot_action_templates: {
        Row: {
          category: string
          context_requirements: Json | null
          created_at: string | null
          created_by: string
          description: string
          icon: string
          id: string
          is_active: boolean | null
          max_frequency_per_day: number | null
          min_hours_between: number | null
          name: string
          personalization_fields: Json | null
          priority: string | null
          prompt_template: string
          time_estimate: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          context_requirements?: Json | null
          created_at?: string | null
          created_by: string
          description: string
          icon?: string
          id?: string
          is_active?: boolean | null
          max_frequency_per_day?: number | null
          min_hours_between?: number | null
          name: string
          personalization_fields?: Json | null
          priority?: string | null
          prompt_template: string
          time_estimate?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          context_requirements?: Json | null
          created_at?: string | null
          created_by?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean | null
          max_frequency_per_day?: number | null
          min_hours_between?: number | null
          name?: string
          personalization_fields?: Json | null
          priority?: string | null
          prompt_template?: string
          time_estimate?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      autopilot_actions: {
        Row: {
          category: string
          context_snapshot: Json | null
          created_at: string
          executed_at: string | null
          icon: string | null
          id: string
          image_url: string | null
          metadata: Json | null
          priority: string
          reason: string | null
          selected: boolean | null
          status: string
          tenant_id: string | null
          time_estimate: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          context_snapshot?: Json | null
          created_at?: string
          executed_at?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          priority: string
          reason?: string | null
          selected?: boolean | null
          status?: string
          tenant_id?: string | null
          time_estimate?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          context_snapshot?: Json | null
          created_at?: string
          executed_at?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          priority?: string
          reason?: string | null
          selected?: boolean | null
          status?: string
          tenant_id?: string | null
          time_estimate?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "autopilot_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "autopilot_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "autopilot_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      autopilot_feedback: {
        Row: {
          action_id: string
          comment: string | null
          created_at: string | null
          feedback_type: string | null
          id: string
          rating: number | null
          user_id: string
        }
        Insert: {
          action_id: string
          comment?: string | null
          created_at?: string | null
          feedback_type?: string | null
          id?: string
          rating?: number | null
          user_id: string
        }
        Update: {
          action_id?: string
          comment?: string | null
          created_at?: string | null
          feedback_type?: string | null
          id?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "autopilot_feedback_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "autopilot_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      autopilot_loop_state: {
        Row: {
          batch_size: number
          created_at: string
          environment: string
          errors_1h: number
          events_processed_1h: number
          events_processed_total: number
          id: string
          is_running: boolean
          last_error: string | null
          last_error_at: string | null
          last_event_cursor: string | null
          last_event_timestamp: string | null
          poll_interval_ms: number
          started_at: string | null
          stopped_at: string | null
          updated_at: string
        }
        Insert: {
          batch_size?: number
          created_at?: string
          environment?: string
          errors_1h?: number
          events_processed_1h?: number
          events_processed_total?: number
          id?: string
          is_running?: boolean
          last_error?: string | null
          last_error_at?: string | null
          last_event_cursor?: string | null
          last_event_timestamp?: string | null
          poll_interval_ms?: number
          started_at?: string | null
          stopped_at?: string | null
          updated_at?: string
        }
        Update: {
          batch_size?: number
          created_at?: string
          environment?: string
          errors_1h?: number
          events_processed_1h?: number
          events_processed_total?: number
          id?: string
          is_running?: boolean
          last_error?: string | null
          last_error_at?: string | null
          last_event_cursor?: string | null
          last_event_timestamp?: string | null
          poll_interval_ms?: number
          started_at?: string | null
          stopped_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      autopilot_processed_events: {
        Row: {
          action_triggered: string | null
          error: string | null
          event_id: string
          event_timestamp: string | null
          event_type: string
          processed_at: string
          raw_event: Json | null
          result: Json
          transition_from: string | null
          transition_to: string | null
          vtid: string | null
        }
        Insert: {
          action_triggered?: string | null
          error?: string | null
          event_id: string
          event_timestamp?: string | null
          event_type: string
          processed_at?: string
          raw_event?: Json | null
          result?: Json
          transition_from?: string | null
          transition_to?: string | null
          vtid?: string | null
        }
        Update: {
          action_triggered?: string | null
          error?: string | null
          event_id?: string
          event_timestamp?: string | null
          event_type?: string
          processed_at?: string
          raw_event?: Json | null
          result?: Json
          transition_from?: string | null
          transition_to?: string | null
          vtid?: string | null
        }
        Relationships: []
      }
      autopilot_recommendations: {
        Row: {
          activated_at: string | null
          activated_vtid: string | null
          created_at: string | null
          domain: string
          effort_score: number | null
          id: string
          impact_score: number | null
          risk_level: string | null
          snoozed_until: string | null
          spec_checksum: string | null
          spec_snapshot: Json | null
          status: string
          summary: string
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          activated_vtid?: string | null
          created_at?: string | null
          domain?: string
          effort_score?: number | null
          id?: string
          impact_score?: number | null
          risk_level?: string | null
          snoozed_until?: string | null
          spec_checksum?: string | null
          spec_snapshot?: Json | null
          status?: string
          summary: string
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          activated_vtid?: string | null
          created_at?: string | null
          domain?: string
          effort_score?: number | null
          id?: string
          impact_score?: number | null
          risk_level?: string | null
          snoozed_until?: string | null
          spec_checksum?: string | null
          spec_snapshot?: Json | null
          status?: string
          summary?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "autopilot_recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      autopilot_run_state: {
        Row: {
          attempts: Json
          completed_at: string | null
          created_at: string
          error: string | null
          error_at: string | null
          error_code: string | null
          last_event_id: string | null
          last_event_type: string | null
          last_transition_at: string
          lock_until: string | null
          locked_by: string | null
          max_attempts: number
          merge_sha: string | null
          metadata: Json | null
          pr_number: number | null
          pr_url: string | null
          run_id: string | null
          spec_checksum: string | null
          started_at: string
          state: string
          updated_at: string
          validator_passed: boolean | null
          validator_result: Json | null
          verification_passed: boolean | null
          verification_result: Json | null
          vtid: string
        }
        Insert: {
          attempts?: Json
          completed_at?: string | null
          created_at?: string
          error?: string | null
          error_at?: string | null
          error_code?: string | null
          last_event_id?: string | null
          last_event_type?: string | null
          last_transition_at?: string
          lock_until?: string | null
          locked_by?: string | null
          max_attempts?: number
          merge_sha?: string | null
          metadata?: Json | null
          pr_number?: number | null
          pr_url?: string | null
          run_id?: string | null
          spec_checksum?: string | null
          started_at?: string
          state?: string
          updated_at?: string
          validator_passed?: boolean | null
          validator_result?: Json | null
          verification_passed?: boolean | null
          verification_result?: Json | null
          vtid: string
        }
        Update: {
          attempts?: Json
          completed_at?: string | null
          created_at?: string
          error?: string | null
          error_at?: string | null
          error_code?: string | null
          last_event_id?: string | null
          last_event_type?: string | null
          last_transition_at?: string
          lock_until?: string | null
          locked_by?: string | null
          max_attempts?: number
          merge_sha?: string | null
          metadata?: Json | null
          pr_number?: number | null
          pr_url?: string | null
          run_id?: string | null
          spec_checksum?: string | null
          started_at?: string
          state?: string
          updated_at?: string
          validator_passed?: boolean | null
          validator_result?: Json | null
          verification_passed?: boolean | null
          verification_result?: Json | null
          vtid?: string
        }
        Relationships: []
      }
      biomarker_results: {
        Row: {
          biomarker_code: string | null
          id: string
          lab_report_id: string | null
          measured_at: string
          name: string | null
          ref_range_high: number | null
          ref_range_low: number | null
          status: string | null
          tenant_id: string
          unit: string | null
          user_id: string
          value: number | null
        }
        Insert: {
          biomarker_code?: string | null
          id?: string
          lab_report_id?: string | null
          measured_at: string
          name?: string | null
          ref_range_high?: number | null
          ref_range_low?: number | null
          status?: string | null
          tenant_id: string
          unit?: string | null
          user_id: string
          value?: number | null
        }
        Update: {
          biomarker_code?: string | null
          id?: string
          lab_report_id?: string | null
          measured_at?: string
          name?: string | null
          ref_range_high?: number | null
          ref_range_low?: number | null
          status?: string | null
          tenant_id?: string
          unit?: string | null
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "biomarker_results_lab_report_id_fkey"
            columns: ["lab_report_id"]
            isOneToOne: false
            referencedRelation: "lab_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarked_items: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          item_image_url: string | null
          item_metadata: Json | null
          item_name: string
          item_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          item_image_url?: string | null
          item_metadata?: Json | null
          item_name: string
          item_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          item_image_url?: string | null
          item_metadata?: Json | null
          item_name?: string
          item_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarked_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      business_packages: {
        Row: {
          billing_interval: string | null
          created_at: string | null
          creator_id: string
          currency: string
          description: string | null
          duration_weeks: number | null
          id: string
          image_url: string | null
          metadata: Json | null
          original_price_cents: number | null
          package_type: string
          price_cents: number
          start_date: string | null
          status: string
          tenant_id: string | null
          title: string
          updated_at: string | null
          validity_days: number | null
        }
        Insert: {
          billing_interval?: string | null
          created_at?: string | null
          creator_id: string
          currency?: string
          description?: string | null
          duration_weeks?: number | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          original_price_cents?: number | null
          package_type?: string
          price_cents?: number
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string | null
          validity_days?: number | null
        }
        Update: {
          billing_interval?: string | null
          created_at?: string | null
          creator_id?: string
          currency?: string
          description?: string | null
          duration_weeks?: number | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          original_price_cents?: number | null
          package_type?: string
          price_cents?: number
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "business_packages_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "business_packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "business_packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          attendees_count: number | null
          created_at: string
          description: string | null
          end_time: string | null
          event_type: string
          has_rewards: boolean | null
          id: string
          is_recurring: boolean
          location: string | null
          metadata: Json | null
          priority: string
          recurring_pattern: Json | null
          source_message_id: string | null
          source_type: string | null
          start_time: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attendees_count?: number | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_type?: string
          has_rewards?: boolean | null
          id?: string
          is_recurring?: boolean
          location?: string | null
          metadata?: Json | null
          priority?: string
          recurring_pattern?: Json | null
          source_message_id?: string | null
          source_type?: string | null
          start_time: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attendees_count?: number | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_type?: string
          has_rewards?: boolean | null
          id?: string
          is_recurring?: boolean
          location?: string | null
          metadata?: Json | null
          priority?: string
          recurring_pattern?: Json | null
          source_message_id?: string | null
          source_type?: string | null
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_invite_responses: {
        Row: {
          event_id: string | null
          id: string
          message_id: string
          responded_at: string
          response: string
          user_id: string
        }
        Insert: {
          event_id?: string | null
          id?: string
          message_id: string
          responded_at?: string
          response: string
          user_id: string
        }
        Update: {
          event_id?: string | null
          id?: string
          message_id?: string
          responded_at?: string
          response?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_audience_segments: {
        Row: {
          contact_count: number | null
          created_at: string | null
          criteria: Json
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contact_count?: number | null
          created_at?: string | null
          criteria?: Json
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contact_count?: number | null
          created_at?: string | null
          criteria?: Json
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      campaign_posts: {
        Row: {
          added_at: string
          campaign_id: string
          post_id: string
        }
        Insert: {
          added_at?: string
          campaign_id: string
          post_id: string
        }
        Update: {
          added_at?: string
          campaign_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "distribution_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          channel: string
          clicked_at: string | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          recipient_email: string | null
          recipient_id: string | null
          recipient_name: string
          recipient_phone: string | null
          recipient_type: string
          sent_at: string | null
          status: string
          unsubscribed_at: string | null
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          channel: string
          clicked_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_name: string
          recipient_phone?: string | null
          recipient_type: string
          sent_at?: string | null
          status?: string
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          channel?: string
          clicked_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_name?: string
          recipient_phone?: string | null
          recipient_type?: string
          sent_at?: string | null
          status?: string
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          distribution_config: Json | null
          end_date: string | null
          id: string
          metadata: Json | null
          name: string
          start_date: string | null
          status: string
          target_channels: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          distribution_config?: Json | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          name: string
          start_date?: string | null
          status?: string
          target_channels?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          distribution_config?: Json | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          start_date?: string | null
          status?: string
          target_channels?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          external_product_id: string | null
          external_source: string | null
          id: string
          item_id: string
          item_image_url: string | null
          item_metadata: Json | null
          item_name: string
          item_price: number
          item_type: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          external_product_id?: string | null
          external_source?: string | null
          id?: string
          item_id: string
          item_image_url?: string | null
          item_metadata?: Json | null
          item_name: string
          item_price: number
          item_type: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          external_product_id?: string | null
          external_source?: string | null
          id?: string
          item_id?: string
          item_image_url?: string | null
          item_metadata?: Json | null
          item_name?: string
          item_price?: number
          item_type?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
          tenant_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
          tenant_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
          tenant_id?: string
        }
        Relationships: []
      }
      checkout_sessions: {
        Row: {
          cart_snapshot: Json
          completed_at: string | null
          created_at: string
          id: string
          payment_intent_id: string | null
          status: string
          stripe_session_id: string | null
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cart_snapshot: Json
          completed_at?: string | null
          created_at?: string
          id?: string
          payment_intent_id?: string | null
          status?: string
          stripe_session_id?: string | null
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cart_snapshot?: Json
          completed_at?: string | null
          created_at?: string
          id?: string
          payment_intent_id?: string | null
          status?: string
          stripe_session_id?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cj_orders: {
        Row: {
          carrier: string | null
          checkout_session_id: string | null
          cj_order_id: string | null
          created_at: string | null
          delivered_at: string | null
          id: string
          order_items: Json
          shipped_at: string | null
          shipping_address: Json
          shipping_cost: number | null
          status: string
          total_amount: number
          tracking_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          carrier?: string | null
          checkout_session_id?: string | null
          cj_order_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          order_items: Json
          shipped_at?: string | null
          shipping_address: Json
          shipping_cost?: number | null
          status?: string
          total_amount: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          carrier?: string | null
          checkout_session_id?: string | null
          cj_order_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          order_items?: Json
          shipped_at?: string | null
          shipping_address?: Json
          shipping_cost?: number | null
          status?: string
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cj_orders_checkout_session_id_fkey"
            columns: ["checkout_session_id"]
            isOneToOne: false
            referencedRelation: "checkout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cj_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      cj_products: {
        Row: {
          brand: string | null
          category: string | null
          cj_product_id: string
          created_at: string | null
          description: string | null
          dimensions: Json | null
          id: string
          image_url: string | null
          images: Json | null
          inventory_count: number | null
          is_active: boolean | null
          last_synced_at: string | null
          list_price: number | null
          name: string
          price: number
          rating: number | null
          review_count: number | null
          shipping_info: Json | null
          updated_at: string | null
          variants: Json | null
          weight: number | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          cj_product_id: string
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          id?: string
          image_url?: string | null
          images?: Json | null
          inventory_count?: number | null
          is_active?: boolean | null
          last_synced_at?: string | null
          list_price?: number | null
          name: string
          price: number
          rating?: number | null
          review_count?: number | null
          shipping_info?: Json | null
          updated_at?: string | null
          variants?: Json | null
          weight?: number | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          cj_product_id?: string
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          id?: string
          image_url?: string | null
          images?: Json | null
          inventory_count?: number | null
          is_active?: boolean | null
          last_synced_at?: string | null
          list_price?: number | null
          name?: string
          price?: number
          rating?: number | null
          review_count?: number | null
          shipping_info?: Json | null
          updated_at?: string | null
          variants?: Json | null
          weight?: number | null
        }
        Relationships: []
      }
      cj_webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
        }
        Relationships: []
      }
      community_group_invitations: {
        Row: {
          created_at: string
          group_id: string
          id: string
          invited_by: string
          invited_user_id: string
          message: string | null
          responded_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          invited_by: string
          invited_user_id: string
          message?: string | null
          responded_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: []
      }
      community_live_streams: {
        Row: {
          access_level: string | null
          co_hosts: string[] | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string
          description: string | null
          enable_chat: boolean | null
          enable_polls: boolean | null
          enable_recording: boolean | null
          enable_replay: boolean | null
          ended_at: string | null
          id: string
          metadata: Json | null
          peak_viewers: number | null
          recording_status: string | null
          scheduled_for: string | null
          started_at: string | null
          status: string | null
          stream_type: string
          tags: string[] | null
          title: string
          total_messages: number | null
          updated_at: string | null
          viewer_count: number | null
        }
        Insert: {
          access_level?: string | null
          co_hosts?: string[] | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          enable_chat?: boolean | null
          enable_polls?: boolean | null
          enable_recording?: boolean | null
          enable_replay?: boolean | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          peak_viewers?: number | null
          recording_status?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string | null
          stream_type: string
          tags?: string[] | null
          title: string
          total_messages?: number | null
          updated_at?: string | null
          viewer_count?: number | null
        }
        Update: {
          access_level?: string | null
          co_hosts?: string[] | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          enable_chat?: boolean | null
          enable_polls?: boolean | null
          enable_recording?: boolean | null
          enable_replay?: boolean | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          peak_viewers?: number | null
          recording_status?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string | null
          stream_type?: string
          tags?: string[] | null
          title?: string
          total_messages?: number | null
          updated_at?: string | null
          viewer_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "community_live_streams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      connection_requests: {
        Row: {
          created_at: string | null
          from_user_id: string
          id: string
          message: string | null
          request_type: string | null
          responded_at: string | null
          status: string | null
          to_user_id: string
        }
        Insert: {
          created_at?: string | null
          from_user_id: string
          id?: string
          message?: string | null
          request_type?: string | null
          responded_at?: string | null
          status?: string | null
          to_user_id: string
        }
        Update: {
          created_at?: string | null
          from_user_id?: string
          id?: string
          message?: string | null
          request_type?: string | null
          responded_at?: string | null
          status?: string | null
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_requests_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "connection_requests_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      consents: {
        Row: {
          consent_id: string
          created_at: string
          data_scope: string
          expires_at: string | null
          grantee_id: string
          grantee_type: string
          proof: Json
          revoked_at: string | null
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          consent_id?: string
          created_at?: string
          data_scope: string
          expires_at?: string | null
          grantee_id: string
          grantee_type: string
          proof?: Json
          revoked_at?: string | null
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          consent_id?: string
          created_at?: string
          data_scope?: string
          expires_at?: string | null
          grantee_id?: string
          grantee_type?: string
          proof?: Json
          revoked_at?: string | null
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "consents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      contacts: {
        Row: {
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          contact_user_id: string | null
          created_at: string | null
          id: string
          invite_sent_at: string | null
          is_on_platform: boolean | null
          metadata: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          contact_user_id?: string | null
          created_at?: string | null
          id?: string
          invite_sent_at?: string | null
          is_on_platform?: boolean | null
          metadata?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          contact_user_id?: string | null
          created_at?: string | null
          id?: string
          invite_sent_at?: string | null
          is_on_platform?: boolean | null
          metadata?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_contact_user_id_fkey"
            columns: ["contact_user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      content_reports: {
        Row: {
          action_taken: string | null
          admin_notes: string | null
          content_id: string
          content_type: string
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_user_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          admin_notes?: string | null
          content_id: string
          content_type: string
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_user_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          admin_notes?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_user_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "content_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      contradiction_flags: {
        Row: {
          contradiction_id: string
          created_at: string
          domain: string
          left_source_id: string
          left_source_table: string
          module: string
          resolution: Json
          right_source_id: string
          right_source_table: string
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contradiction_id?: string
          created_at?: string
          domain: string
          left_source_id: string
          left_source_table: string
          module: string
          resolution?: Json
          right_source_id: string
          right_source_table: string
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contradiction_id?: string
          created_at?: string
          domain?: string
          left_source_id?: string
          left_source_table?: string
          module?: string
          resolution?: Json
          right_source_id?: string
          right_source_table?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contradiction_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contradiction_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contradiction_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          channel: string
          content: string
          created_at: string
          id: string
          metadata: Json
          role: string
          tenant_id: string
          thread_id: string
          user_id: string
        }
        Insert: {
          channel?: string
          content: string
          created_at?: string
          id?: string
          metadata?: Json
          role: string
          tenant_id: string
          thread_id: string
          user_id: string
        }
        Update: {
          channel?: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          role?: string
          tenant_id?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: []
      }
      crew_memory: {
        Row: {
          agent: string
          created_at: string
          id: string
          key: string
          payload: Json
          tenant: string
          updated_at: string
        }
        Insert: {
          agent: string
          created_at?: string
          id?: string
          key: string
          payload: Json
          tenant: string
          updated_at?: string
        }
        Update: {
          agent?: string
          created_at?: string
          id?: string
          key?: string
          payload?: Json
          tenant?: string
          updated_at?: string
        }
        Relationships: []
      }
      crewai_test: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string | null
          result: Json | null
          status: string | null
          work_item_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
          result?: Json | null
          status?: string | null
          work_item_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
          result?: Json | null
          status?: string | null
          work_item_id?: string | null
        }
        Relationships: []
      }
      curated_memories: {
        Row: {
          allowed_roles: string[]
          confidence_score: number | null
          consent_id: string | null
          created_at: string
          domain: string
          expires_at: string | null
          fact_payload: Json
          is_active: boolean
          memory_id: string
          module: string
          reinforcement_log: Json
          scope: Database["public"]["Enums"]["memory_scope"]
          sensitivity: Database["public"]["Enums"]["memory_sensitivity"]
          source_event_id: string | null
          status: string
          subject_id: string | null
          subject_type: string
          summary_text: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_roles?: string[]
          confidence_score?: number | null
          consent_id?: string | null
          created_at?: string
          domain: string
          expires_at?: string | null
          fact_payload?: Json
          is_active?: boolean
          memory_id?: string
          module: string
          reinforcement_log?: Json
          scope?: Database["public"]["Enums"]["memory_scope"]
          sensitivity?: Database["public"]["Enums"]["memory_sensitivity"]
          source_event_id?: string | null
          status?: string
          subject_id?: string | null
          subject_type?: string
          summary_text: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_roles?: string[]
          confidence_score?: number | null
          consent_id?: string | null
          created_at?: string
          domain?: string
          expires_at?: string | null
          fact_payload?: Json
          is_active?: boolean
          memory_id?: string
          module?: string
          reinforcement_log?: Json
          scope?: Database["public"]["Enums"]["memory_scope"]
          sensitivity?: Database["public"]["Enums"]["memory_sensitivity"]
          source_event_id?: string | null
          status?: string
          subject_id?: string | null
          subject_type?: string
          summary_text?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curated_memories_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "consents"
            referencedColumns: ["consent_id"]
          },
          {
            foreignKeyName: "curated_memories_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "memory_events"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "curated_memories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "curated_memories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "curated_memories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      daily_matches: {
        Row: {
          action: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          match_reasons: Json | null
          match_score: number
          matched_user_id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          match_reasons?: Json | null
          match_score: number
          matched_user_id: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          match_reasons?: Json | null
          match_score?: number
          matched_user_id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_matches_matched_user_id_fkey"
            columns: ["matched_user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "daily_matches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      diary_entries: {
        Row: {
          attachments: Json | null
          created_at: string
          duration: number | null
          id: string
          source: string
          tags: string[] | null
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          duration?: number | null
          id?: string
          source?: string
          tags?: string[] | null
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          duration?: number | null
          id?: string
          source?: string
          tags?: string[] | null
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      distribution_channels: {
        Row: {
          channel_name: string
          channel_type: Database["public"]["Enums"]["channel_type"]
          connection_data: Json | null
          created_at: string | null
          daily_limit: number | null
          daily_sent: number | null
          id: string
          is_active: boolean | null
          is_connected: boolean | null
          last_reset_at: string | null
          metadata: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          channel_name: string
          channel_type: Database["public"]["Enums"]["channel_type"]
          connection_data?: Json | null
          created_at?: string | null
          daily_limit?: number | null
          daily_sent?: number | null
          id?: string
          is_active?: boolean | null
          is_connected?: boolean | null
          last_reset_at?: string | null
          metadata?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          channel_name?: string
          channel_type?: Database["public"]["Enums"]["channel_type"]
          connection_data?: Json | null
          created_at?: string | null
          daily_limit?: number | null
          daily_sent?: number | null
          id?: string
          is_active?: boolean | null
          is_connected?: boolean | null
          last_reset_at?: string | null
          metadata?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_channels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      distribution_posts: {
        Row: {
          blast_count: number | null
          campaign_id: string | null
          channels: Database["public"]["Enums"]["channel_type"][] | null
          content: string
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          published_at: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["post_status"] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          blast_count?: number | null
          campaign_id?: string | null
          channels?: Database["public"]["Enums"]["channel_type"][] | null
          content: string
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["post_status"] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          blast_count?: number | null
          campaign_id?: string | null
          channels?: Database["public"]["Enums"]["channel_type"][] | null
          content?: string
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["post_status"] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      entity_relationships: {
        Row: {
          created_at: string
          metadata: Json
          object_id: string
          object_type: string
          rel_id: string
          relationship_type: string
          status: string
          subject_id: string
          subject_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          metadata?: Json
          object_id: string
          object_type: string
          rel_id?: string
          relationship_type: string
          status?: string
          subject_id: string
          subject_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          metadata?: Json
          object_id?: string
          object_type?: string
          rel_id?: string
          relationship_type?: string
          status?: string
          subject_id?: string
          subject_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_relationships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "entity_relationships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      event_attendance: {
        Row: {
          attended_at: string | null
          created_at: string
          id: string
          meetup_id: string
          rsvp_at: string | null
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attended_at?: string | null
          created_at?: string
          id?: string
          meetup_id: string
          rsvp_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attended_at?: string | null
          created_at?: string
          id?: string
          meetup_id?: string
          rsvp_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      event_attendees: {
        Row: {
          created_at: string
          event_id: string
          id: string
          invited_at: string
          invited_by: string | null
          metadata: Json | null
          responded_at: string | null
          response: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          metadata?: Json | null
          responded_at?: string | null
          response: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          metadata?: Json | null
          responded_at?: string | null
          response?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      event_co_creators: {
        Row: {
          added_at: string
          added_by: string | null
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_co_creators_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "event_co_creators_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "global_community_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_co_creators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      event_kinds: {
        Row: {
          created_at: string | null
          description: string | null
          event_type: string
          label: string
          layer: string
          module: string
          status: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_type: string
          label: string
          layer: string
          module: string
          status: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_type?: string
          label?: string
          layer?: string
          module?: string
          status?: string
        }
        Relationships: []
      }
      event_recommendations: {
        Row: {
          created_at: string
          event_id: string
          expires_at: string | null
          id: string
          is_dismissed: boolean | null
          match_reasons: Json | null
          match_score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          match_reasons?: Json | null
          match_score: number
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          match_reasons?: Json | null
          match_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_recommendations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "global_community_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      event_ticket_purchases: {
        Row: {
          buyer_email: string
          buyer_id: string | null
          buyer_name: string
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string
          currency: string
          event_id: string
          id: string
          metadata: Json | null
          qr_code_token: string
          quantity: number
          refund_reason: string | null
          refunded_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          ticket_number: string
          ticket_type_id: string
          total_amount: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          buyer_email: string
          buyer_id?: string | null
          buyer_name: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          currency?: string
          event_id: string
          id?: string
          metadata?: Json | null
          qr_code_token: string
          quantity?: number
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          ticket_number: string
          ticket_type_id: string
          total_amount: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          buyer_email?: string
          buyer_id?: string | null
          buyer_name?: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          currency?: string
          event_id?: string
          id?: string
          metadata?: Json | null
          qr_code_token?: string
          quantity?: number
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          ticket_number?: string
          ticket_type_id?: string
          total_amount?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_ticket_purchases_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "event_ticket_purchases_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "event_ticket_purchases_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "global_community_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_ticket_purchases_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ticket_scans: {
        Row: {
          device_info: Json | null
          id: string
          is_valid: boolean
          rejection_reason: string | null
          scan_location: string | null
          scanned_at: string
          scanned_by: string | null
          ticket_purchase_id: string
        }
        Insert: {
          device_info?: Json | null
          id?: string
          is_valid?: boolean
          rejection_reason?: string | null
          scan_location?: string | null
          scanned_at?: string
          scanned_by?: string | null
          ticket_purchase_id: string
        }
        Update: {
          device_info?: Json | null
          id?: string
          is_valid?: boolean
          rejection_reason?: string | null
          scan_location?: string | null
          scanned_at?: string
          scanned_by?: string | null
          ticket_purchase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_ticket_scans_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "event_ticket_scans_ticket_purchase_id_fkey"
            columns: ["ticket_purchase_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ticket_types: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          event_id: string
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          price: number
          quantity_available: number
          quantity_sold: number
          sale_end_date: string | null
          sale_start_date: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          price?: number
          quantity_available?: number
          quantity_sold?: number
          sale_end_date?: string | null
          sale_start_date?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          price?: number
          quantity_available?: number
          quantity_sold?: number
          sale_end_date?: string | null
          sale_start_date?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "global_community_events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          actor: string
          created_at: string | null
          environment: string
          event_type: string
          id: string
          metadata: Json | null
          projected: boolean | null
          source_service: string
          timestamp: string | null
          vtid: string
        }
        Insert: {
          actor: string
          created_at?: string | null
          environment: string
          event_type: string
          id?: string
          metadata?: Json | null
          projected?: boolean | null
          source_service: string
          timestamp?: string | null
          vtid: string
        }
        Update: {
          actor?: string
          created_at?: string | null
          environment?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          projected?: boolean | null
          source_service?: string
          timestamp?: string | null
          vtid?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          change_24h: number | null
          created_at: string | null
          from_currency: string
          id: string
          is_active: boolean | null
          rate: number
          to_currency: string
          trend: string | null
        }
        Insert: {
          change_24h?: number | null
          created_at?: string | null
          from_currency: string
          id?: string
          is_active?: boolean | null
          rate: number
          to_currency: string
          trend?: string | null
        }
        Update: {
          change_24h?: number | null
          created_at?: string | null
          from_currency?: string
          id?: string
          is_active?: boolean | null
          rate?: number
          to_currency?: string
          trend?: string | null
        }
        Relationships: []
      }
      global_community_events: {
        Row: {
          created_at: string
          created_by: string
          default_reseller_commission_rate: number | null
          description: string | null
          end_time: string | null
          event_type: string
          id: string
          image_url: string | null
          location: string | null
          max_participants: number | null
          metadata: Json | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_notes: string | null
          participant_count: number
          resale_scope: string
          resellable: boolean
          reseller_config: Json | null
          slug: string | null
          start_time: string
          title: string
          updated_at: string
          virtual_link: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          default_reseller_commission_rate?: number | null
          description?: string | null
          end_time?: string | null
          event_type?: string
          id?: string
          image_url?: string | null
          location?: string | null
          max_participants?: number | null
          metadata?: Json | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          participant_count?: number
          resale_scope?: string
          resellable?: boolean
          reseller_config?: Json | null
          slug?: string | null
          start_time: string
          title: string
          updated_at?: string
          virtual_link?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          default_reseller_commission_rate?: number | null
          description?: string | null
          end_time?: string | null
          event_type?: string
          id?: string
          image_url?: string | null
          location?: string | null
          max_participants?: number | null
          metadata?: Json | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          participant_count?: number
          resale_scope?: string
          resellable?: boolean
          reseller_config?: Json | null
          slug?: string | null
          start_time?: string
          title?: string
          updated_at?: string
          virtual_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "global_community_events_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      global_community_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_community_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "global_community_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_community_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      global_community_groups: {
        Row: {
          avatar_url: string | null
          category: string | null
          chat_thread_id: string | null
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean
          member_count: number
          moderated_at: string | null
          moderated_by: string | null
          moderation_notes: string | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          category?: string | null
          chat_thread_id?: string | null
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean
          member_count?: number
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          category?: string | null
          chat_thread_id?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean
          member_count?: number
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_community_groups_chat_thread_id_fkey"
            columns: ["chat_thread_id"]
            isOneToOne: false
            referencedRelation: "global_message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_community_groups_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      global_community_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          interests: string[] | null
          is_visible: boolean
          location: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          interests?: string[] | null
          is_visible?: boolean
          location?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          interests?: string[] | null
          is_visible?: boolean
          location?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      global_event_participants: {
        Row: {
          event_id: string
          id: string
          registered_at: string
          status: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          registered_at?: string
          status?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          registered_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_global_event_participants_event"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "global_community_events"
            referencedColumns: ["id"]
          },
        ]
      }
      global_group_members: {
        Row: {
          group_id: string
          id: string
          is_active: boolean
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          is_active?: boolean
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_global_group_members_group"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "global_community_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      global_message_threads: {
        Row: {
          created_at: string
          created_by: string
          id: string
          metadata: Json | null
          name: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          metadata?: Json | null
          name?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          metadata?: Json | null
          name?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      global_messages: {
        Row: {
          action_buttons: Json | null
          body: string
          content_data: Json | null
          created_at: string | null
          delivered_at: string | null
          id: string
          message_type: string
          parent_message_id: string | null
          read_at: string | null
          sender_id: string
          sent_at: string | null
          thread_id: string
          updated_at: string
        }
        Insert: {
          action_buttons?: Json | null
          body: string
          content_data?: Json | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          message_type?: string
          parent_message_id?: string | null
          read_at?: string | null
          sender_id: string
          sent_at?: string | null
          thread_id: string
          updated_at?: string
        }
        Update: {
          action_buttons?: Json | null
          body?: string
          content_data?: Json | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          message_type?: string
          parent_message_id?: string | null
          read_at?: string | null
          sender_id?: string
          sent_at?: string | null
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_global_messages_thread"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "global_message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      global_thread_participants: {
        Row: {
          id: string
          is_active: boolean
          joined_at: string
          last_read_at: string | null
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          joined_at?: string
          last_read_at?: string | null
          role?: string
          thread_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          joined_at?: string
          last_read_at?: string | null
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_global_thread_participants_thread"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "global_message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      global_typing_indicators: {
        Row: {
          id: string
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          thread_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_typing_indicators_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "global_message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_catalog: {
        Row: {
          categories_count: number | null
          commit_hash: string
          created_at: string | null
          id: string
          metadata: Json | null
          rules_count: number | null
          updated_at: string | null
          version: string
        }
        Insert: {
          categories_count?: number | null
          commit_hash: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          rules_count?: number | null
          updated_at?: string | null
          version: string
        }
        Update: {
          categories_count?: number | null
          commit_hash?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          rules_count?: number | null
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      governance_categories: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          severity: number | null
          tenant_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          severity?: number | null
          tenant_id: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          severity?: number | null
          tenant_id?: string
        }
        Relationships: []
      }
      governance_enforcements: {
        Row: {
          action: string
          details: Json | null
          executed_at: string | null
          id: string
          rule_id: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          action: string
          details?: Json | null
          executed_at?: string | null
          id?: string
          rule_id?: string | null
          status: string
          tenant_id: string
        }
        Update: {
          action?: string
          details?: Json | null
          executed_at?: string | null
          id?: string
          rule_id?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_enforcements_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "governance_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_evaluations: {
        Row: {
          entity_id: string
          evaluated_at: string | null
          id: string
          metadata: Json | null
          rule_id: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          entity_id: string
          evaluated_at?: string | null
          id?: string
          metadata?: Json | null
          rule_id?: string | null
          status: string
          tenant_id: string
        }
        Update: {
          entity_id?: string
          evaluated_at?: string | null
          id?: string
          metadata?: Json | null
          rule_id?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_evaluations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "governance_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_proposals: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          original_rule: Json | null
          proposal_id: string
          proposed_rule: Json
          rationale: string | null
          rule_code: string | null
          status: string
          tenant_id: string
          timeline: Json
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          original_rule?: Json | null
          proposal_id: string
          proposed_rule: Json
          rationale?: string | null
          rule_code?: string | null
          status?: string
          tenant_id: string
          timeline?: Json
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          original_rule?: Json | null
          proposal_id?: string
          proposed_rule?: Json
          rationale?: string | null
          rule_code?: string | null
          status?: string
          tenant_id?: string
          timeline?: Json
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      governance_rules: {
        Row: {
          catalog_version: string | null
          category_id: string | null
          commit_hash: string | null
          created_at: string | null
          description: string | null
          enforcement: string[] | null
          id: string
          is_active: boolean | null
          level: string | null
          logic: Json
          name: string
          rule_id: string | null
          sources: string[] | null
          tenant_id: string
          vtids: string[] | null
        }
        Insert: {
          catalog_version?: string | null
          category_id?: string | null
          commit_hash?: string | null
          created_at?: string | null
          description?: string | null
          enforcement?: string[] | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          logic: Json
          name: string
          rule_id?: string | null
          sources?: string[] | null
          tenant_id: string
          vtids?: string[] | null
        }
        Update: {
          catalog_version?: string | null
          category_id?: string | null
          commit_hash?: string | null
          created_at?: string | null
          description?: string | null
          enforcement?: string[] | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          logic?: Json
          name?: string
          rule_id?: string | null
          sources?: string[] | null
          tenant_id?: string
          vtids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "governance_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "governance_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_violations: {
        Row: {
          created_at: string | null
          entity_id: string
          id: string
          resolved_at: string | null
          rule_id: string | null
          severity: number | null
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          id?: string
          resolved_at?: string | null
          rule_id?: string | null
          severity?: number | null
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          id?: string
          resolved_at?: string | null
          rule_id?: string | null
          severity?: number | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_violations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "governance_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      group_post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_posts: {
        Row: {
          comments_count: number
          content: string
          created_at: string
          group_id: string
          id: string
          image_url: string | null
          likes_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_count?: number
          content: string
          created_at?: string
          group_id: string
          id?: string
          image_url?: string | null
          likes_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_count?: number
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "global_community_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_recommendations: {
        Row: {
          created_at: string
          expires_at: string | null
          group_id: string
          id: string
          is_dismissed: boolean | null
          match_reasons: Json | null
          match_score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          group_id: string
          id?: string
          is_dismissed?: boolean | null
          match_reasons?: Json | null
          match_score: number
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          group_id?: string
          id?: string
          is_dismissed?: boolean | null
          match_reasons?: Json | null
          match_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_recommendations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "global_community_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      health_features_daily: {
        Row: {
          created_at: string | null
          date: string
          feature_key: string
          feature_value: number
          id: string
          provenance: Json | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          feature_key: string
          feature_value: number
          id?: string
          provenance?: Json | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          feature_key?: string
          feature_value?: number
          id?: string
          provenance?: Json | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      invite_analytics: {
        Row: {
          channel: string
          clicked_count: number
          created_at: string
          event_id: string
          id: string
          opened_count: number
          response_count: number
          sent_count: number
          updated_at: string
        }
        Insert: {
          channel: string
          clicked_count?: number
          created_at?: string
          event_id: string
          id?: string
          opened_count?: number
          response_count?: number
          sent_count?: number
          updated_at?: string
        }
        Update: {
          channel?: string
          clicked_count?: number
          created_at?: string
          event_id?: string
          id?: string
          opened_count?: number
          response_count?: number
          sent_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_docs: {
        Row: {
          content: string
          content_tsv: unknown
          created_at: string | null
          id: string
          path: string
          source_type: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          word_count: number | null
        }
        Insert: {
          content: string
          content_tsv?: unknown
          created_at?: string | null
          id?: string
          path: string
          source_type?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          word_count?: number | null
        }
        Update: {
          content?: string
          content_tsv?: unknown
          created_at?: string | null
          id?: string
          path?: string
          source_type?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          word_count?: number | null
        }
        Relationships: []
      }
      lab_reports: {
        Row: {
          ai_summary: string | null
          created_at: string
          file_path: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          parsed_json: Json | null
          processing_status:
            | Database["public"]["Enums"]["health_processing_status"]
            | null
          provider_name: string | null
          raw_file_ref: string | null
          raw_text: string | null
          report_date: string | null
          report_type: Database["public"]["Enums"]["health_report_type"] | null
          source: string | null
          tenant_id: string
          title: string | null
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          parsed_json?: Json | null
          processing_status?:
            | Database["public"]["Enums"]["health_processing_status"]
            | null
          provider_name?: string | null
          raw_file_ref?: string | null
          raw_text?: string | null
          report_date?: string | null
          report_type?: Database["public"]["Enums"]["health_report_type"] | null
          source?: string | null
          tenant_id: string
          title?: string | null
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          created_at?: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          parsed_json?: Json | null
          processing_status?:
            | Database["public"]["Enums"]["health_processing_status"]
            | null
          provider_name?: string | null
          raw_file_ref?: string | null
          raw_text?: string | null
          report_date?: string | null
          report_type?: Database["public"]["Enums"]["health_report_type"] | null
          source?: string | null
          tenant_id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lab_test_orders: {
        Row: {
          collection_method: Database["public"]["Enums"]["collection_method"]
          created_at: string
          facility_address: string | null
          id: string
          lab_test_id: string
          payment_intent_id: string | null
          scheduled_date: string | null
          shipping_address: Json | null
          special_instructions: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          collection_method: Database["public"]["Enums"]["collection_method"]
          created_at?: string
          facility_address?: string | null
          id?: string
          lab_test_id: string
          payment_intent_id?: string | null
          scheduled_date?: string | null
          shipping_address?: Json | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          collection_method?: Database["public"]["Enums"]["collection_method"]
          created_at?: string
          facility_address?: string | null
          id?: string
          lab_test_id?: string
          payment_intent_id?: string | null
          scheduled_date?: string | null
          shipping_address?: Json | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_test_orders_lab_test_id_fkey"
            columns: ["lab_test_id"]
            isOneToOne: false
            referencedRelation: "lab_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_test_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      lab_test_results: {
        Row: {
          ai_insights: string | null
          biomarker_data: Json
          completed_at: string
          created_at: string
          id: string
          order_id: string
          result_pdf_url: string | null
          user_id: string
        }
        Insert: {
          ai_insights?: string | null
          biomarker_data: Json
          completed_at?: string
          created_at?: string
          id?: string
          order_id: string
          result_pdf_url?: string | null
          user_id: string
        }
        Update: {
          ai_insights?: string | null
          biomarker_data?: Json
          completed_at?: string
          created_at?: string
          id?: string
          order_id?: string
          result_pdf_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_test_results_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lab_test_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_test_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      lab_tests: {
        Row: {
          biomarkers: string[]
          category: Database["public"]["Enums"]["lab_test_category"]
          created_at: string
          data_source: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          provider_logo_url: string | null
          provider_name: string
          sample_type: string
          turnaround_days: number
          updated_at: string
        }
        Insert: {
          biomarkers: string[]
          category: Database["public"]["Enums"]["lab_test_category"]
          created_at?: string
          data_source?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price: number
          provider_logo_url?: string | null
          provider_name: string
          sample_type: string
          turnaround_days: number
          updated_at?: string
        }
        Update: {
          biomarkers?: string[]
          category?: Database["public"]["Enums"]["lab_test_category"]
          created_at?: string
          data_source?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          provider_logo_url?: string | null
          provider_name?: string
          sample_type?: string
          turnaround_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      life_compass: {
        Row: {
          ai_summary: string | null
          alignment_score: number | null
          category: string
          confidence_score: number | null
          created_at: string
          id: string
          is_active: boolean
          primary_goal: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          ai_summary?: string | null
          alignment_score?: number | null
          category?: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          primary_goal: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          ai_summary?: string | null
          alignment_score?: number | null
          category?: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          primary_goal?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "life_compass_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      life_compass_subgoals: {
        Row: {
          compass_id: string
          created_at: string
          description: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          compass_id: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          compass_id?: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "life_compass_subgoals_compass_id_fkey"
            columns: ["compass_id"]
            isOneToOne: false
            referencedRelation: "life_compass"
            referencedColumns: ["id"]
          },
        ]
      }
      live_highlights: {
        Row: {
          created_at: string
          created_by_user_id: string
          highlight_type: string
          id: string
          live_room_id: string
          metadata: Json | null
          tenant_id: string
          text: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          highlight_type: string
          id?: string
          live_room_id: string
          metadata?: Json | null
          tenant_id: string
          text: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          highlight_type?: string
          id?: string
          live_room_id?: string
          metadata?: Json | null
          tenant_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_highlights_live_room_id_fkey"
            columns: ["live_room_id"]
            isOneToOne: false
            referencedRelation: "live_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_highlights_live_room_id_fkey"
            columns: ["live_room_id"]
            isOneToOne: false
            referencedRelation: "live_rooms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      live_room_access_grants: {
        Row: {
          access_type: string
          created_at: string
          expires_at: string | null
          id: string
          is_revoked: boolean | null
          is_valid: boolean | null
          metadata: Json | null
          purchased_at: string
          refund_id: string | null
          refund_status: string | null
          revoked_at: string | null
          revoked_reason: string | null
          room_id: string
          session_id: string | null
          stripe_payment_intent_id: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          access_type: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_revoked?: boolean | null
          is_valid?: boolean | null
          metadata?: Json | null
          purchased_at?: string
          refund_id?: string | null
          refund_status?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          room_id: string
          session_id?: string | null
          stripe_payment_intent_id?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          access_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_revoked?: boolean | null
          is_valid?: boolean | null
          metadata?: Json | null
          purchased_at?: string
          refund_id?: string | null
          refund_status?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          room_id?: string
          session_id?: string | null
          stripe_payment_intent_id?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_grants_session"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_room_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_room_access_grants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "live_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_room_access_grants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "live_rooms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_room_access_grants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "live_room_access_grants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "live_room_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "live_room_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["app_user_id"]
          },
        ]
      }
      live_room_attendance: {
        Row: {
          created_at: string
          disconnected_at: string | null
          duration_minutes: number | null
          id: string
          is_banned: boolean | null
          joined_at: string
          left_at: string | null
          live_room_id: string
          lobby_status: string | null
          role: string | null
          session_id: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          disconnected_at?: string | null
          duration_minutes?: number | null
          id?: string
          is_banned?: boolean | null
          joined_at?: string
          left_at?: string | null
          live_room_id: string
          lobby_status?: string | null
          role?: string | null
          session_id?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          disconnected_at?: string | null
          duration_minutes?: number | null
          id?: string
          is_banned?: boolean | null
          joined_at?: string
          left_at?: string | null
          live_room_id?: string
          lobby_status?: string | null
          role?: string | null
          session_id?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_attendance_session"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_room_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_room_attendance_live_room_id_fkey"
            columns: ["live_room_id"]
            isOneToOne: false
            referencedRelation: "live_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_room_attendance_live_room_id_fkey"
            columns: ["live_room_id"]
            isOneToOne: false
            referencedRelation: "live_rooms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      live_room_sessions: {
        Row: {
          access_level: string | null
          auto_admit: boolean | null
          created_at: string
          ends_at: string | null
          host_present: boolean | null
          id: string
          idempotency_key: string | null
          lobby_buffer_minutes: number | null
          lobby_open_at: string | null
          max_participants: number | null
          metadata: Json | null
          room_id: string
          session_title: string | null
          starts_at: string
          status: string
          tenant_id: string
          topic_keys: string[] | null
          updated_at: string
        }
        Insert: {
          access_level?: string | null
          auto_admit?: boolean | null
          created_at?: string
          ends_at?: string | null
          host_present?: boolean | null
          id?: string
          idempotency_key?: string | null
          lobby_buffer_minutes?: number | null
          lobby_open_at?: string | null
          max_participants?: number | null
          metadata?: Json | null
          room_id: string
          session_title?: string | null
          starts_at: string
          status?: string
          tenant_id: string
          topic_keys?: string[] | null
          updated_at?: string
        }
        Update: {
          access_level?: string | null
          auto_admit?: boolean | null
          created_at?: string
          ends_at?: string | null
          host_present?: boolean | null
          id?: string
          idempotency_key?: string | null
          lobby_buffer_minutes?: number | null
          lobby_open_at?: string | null
          max_participants?: number | null
          metadata?: Json | null
          room_id?: string
          session_title?: string | null
          starts_at?: string
          status?: string
          tenant_id?: string
          topic_keys?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_room_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "live_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_room_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "live_rooms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      live_rooms: {
        Row: {
          access_level: string | null
          cover_image_url: string | null
          created_at: string
          current_session_id: string | null
          description: string | null
          ends_at: string | null
          host_present: boolean | null
          host_user_id: string
          id: string
          metadata: Json | null
          room_name: string | null
          room_slug: string | null
          starts_at: string | null
          status: string
          tenant_id: string
          title: string
          topic_keys: string[] | null
          updated_at: string
        }
        Insert: {
          access_level?: string | null
          cover_image_url?: string | null
          created_at?: string
          current_session_id?: string | null
          description?: string | null
          ends_at?: string | null
          host_present?: boolean | null
          host_user_id: string
          id?: string
          metadata?: Json | null
          room_name?: string | null
          room_slug?: string | null
          starts_at?: string | null
          status?: string
          tenant_id: string
          title: string
          topic_keys?: string[] | null
          updated_at?: string
        }
        Update: {
          access_level?: string | null
          cover_image_url?: string | null
          created_at?: string
          current_session_id?: string | null
          description?: string | null
          ends_at?: string | null
          host_present?: boolean | null
          host_user_id?: string
          id?: string
          metadata?: Json | null
          room_name?: string | null
          room_slug?: string | null
          starts_at?: string | null
          status?: string
          tenant_id?: string
          title?: string
          topic_keys?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_live_rooms_current_session"
            columns: ["current_session_id"]
            isOneToOne: false
            referencedRelation: "live_room_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      location_preferences: {
        Row: {
          allow_location_personalization: boolean
          allow_sharing_in_meetups: boolean
          home_area: string | null
          home_city: string | null
          id: string
          preferred_radius_km: number
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_location_personalization?: boolean
          allow_sharing_in_meetups?: boolean
          home_area?: string | null
          home_city?: string | null
          id?: string
          preferred_radius_km?: number
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_location_personalization?: boolean
          allow_sharing_in_meetups?: boolean
          home_area?: string | null
          home_city?: string | null
          id?: string
          preferred_radius_km?: number
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      location_visits: {
        Row: {
          created_at: string
          id: string
          location_id: string
          metadata: Json
          notes: string | null
          tenant_id: string
          user_id: string
          visit_time: string
          visit_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          metadata?: Json
          notes?: string | null
          tenant_id: string
          user_id: string
          visit_time?: string
          visit_type: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          metadata?: Json
          notes?: string | null
          tenant_id?: string
          user_id?: string
          visit_time?: string
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_visits_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          area: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string
          id: string
          lat: number | null
          lng: number | null
          location_type: string
          metadata: Json
          name: string
          privacy_level: string
          tenant_id: string
          topic_keys: string[]
          updated_at: string
        }
        Insert: {
          area?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          id?: string
          lat?: number | null
          lng?: number | null
          location_type: string
          metadata?: Json
          name: string
          privacy_level?: string
          tenant_id: string
          topic_keys?: string[]
          updated_at?: string
        }
        Update: {
          area?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          id?: string
          lat?: number | null
          lng?: number | null
          location_type?: string
          metadata?: Json
          name?: string
          privacy_level?: string
          tenant_id?: string
          topic_keys?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      match_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          match_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          match_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_notifications_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "user_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_tool_executions: {
        Row: {
          created_at: string
          error_message: string | null
          executed_by: string | null
          execution_time_ms: number | null
          id: string
          input_parameters: Json
          integration_id: string
          output_result: Json | null
          status: string
          tool_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          executed_by?: string | null
          execution_time_ms?: number | null
          id?: string
          input_parameters: Json
          integration_id: string
          output_result?: Json | null
          status: string
          tool_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          executed_by?: string | null
          execution_time_ms?: number | null
          id?: string
          input_parameters?: Json
          integration_id?: string
          output_result?: Json | null
          status?: string
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_tool_executions_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "mcp_tool_executions_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "api_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      media_analytics: {
        Row: {
          action: string
          created_at: string
          id: string
          media_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          media_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          media_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_analytics_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      media_content: {
        Row: {
          album: string | null
          artist: string | null
          category: string | null
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          episode_number: number | null
          file_path: string
          file_size_bytes: number | null
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          like_count: number | null
          media_type: string
          published_at: string | null
          season_number: number | null
          share_count: number | null
          tags: string[] | null
          thumbnail_path: string | null
          title: string
          updated_at: string | null
          user_id: string
          view_count: number | null
          wellness_pillar: string | null
        }
        Insert: {
          album?: string | null
          artist?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          episode_number?: number | null
          file_path: string
          file_size_bytes?: number | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          like_count?: number | null
          media_type: string
          published_at?: string | null
          season_number?: number | null
          share_count?: number | null
          tags?: string[] | null
          thumbnail_path?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          view_count?: number | null
          wellness_pillar?: string | null
        }
        Update: {
          album?: string | null
          artist?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          episode_number?: number | null
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          like_count?: number | null
          media_type?: string
          published_at?: string | null
          season_number?: number | null
          share_count?: number | null
          tags?: string[] | null
          thumbnail_path?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
          wellness_pillar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_content_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      media_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          media_id: string
          media_type: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          media_id: string
          media_type: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          media_id?: string
          media_type?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      media_uploads: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          duration: number | null
          file_path: string
          file_size: number
          file_url: string
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          likes_count: number | null
          media_type: string
          mime_type: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_notes: string | null
          plays_count: number | null
          status: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          file_path: string
          file_size: number
          file_url: string
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          likes_count?: number | null
          media_type: string
          mime_type: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          plays_count?: number | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          file_path?: string
          file_size?: number
          file_url?: string
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          likes_count?: number | null
          media_type?: string
          mime_type?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          plays_count?: number | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: []
      }
      media_videos: {
        Row: {
          captions_url: string | null
          category: string | null
          created_at: string
          description: string | null
          duration_sec: number | null
          height: number | null
          id: string
          language: string | null
          likes_count: number | null
          shares_count: number | null
          src_url: string
          status: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          views_count: number | null
          width: number | null
        }
        Insert: {
          captions_url?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          duration_sec?: number | null
          height?: number | null
          id?: string
          language?: string | null
          likes_count?: number | null
          shares_count?: number | null
          src_url: string
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          views_count?: number | null
          width?: number | null
        }
        Update: {
          captions_url?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          duration_sec?: number | null
          height?: number | null
          id?: string
          language?: string | null
          likes_count?: number | null
          shares_count?: number | null
          src_url?: string
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          views_count?: number | null
          width?: number | null
        }
        Relationships: []
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["tenant_role"]
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      memory_categories: {
        Row: {
          created_at: string
          is_active: boolean
          key: string
          label: string
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          key: string
          label: string
        }
        Update: {
          created_at?: string
          is_active?: boolean
          key?: string
          label?: string
        }
        Relationships: []
      }
      memory_category_mapping: {
        Row: {
          garden_category: string
          source_category: string
        }
        Insert: {
          garden_category: string
          source_category: string
        }
        Update: {
          garden_category?: string
          source_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_category_mapping_garden_category_fkey"
            columns: ["garden_category"]
            isOneToOne: false
            referencedRelation: "memory_garden_config"
            referencedColumns: ["category_key"]
          },
        ]
      }
      memory_diary_entries: {
        Row: {
          created_at: string
          energy_level: number | null
          entry_date: string
          entry_type: string
          id: string
          mood: string | null
          raw_text: string
          tags: string[] | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          energy_level?: number | null
          entry_date: string
          entry_type: string
          id?: string
          mood?: string | null
          raw_text: string
          tags?: string[] | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          energy_level?: number | null
          entry_date?: string
          entry_type?: string
          id?: string
          mood?: string | null
          raw_text?: string
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      memory_embeddings: {
        Row: {
          created_at: string
          domain: string
          embedding: string
          embedding_id: string
          module: string
          scope: Database["public"]["Enums"]["memory_scope"]
          sensitivity: Database["public"]["Enums"]["memory_sensitivity"]
          source_id: string
          source_table: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          domain: string
          embedding: string
          embedding_id?: string
          module: string
          scope: Database["public"]["Enums"]["memory_scope"]
          sensitivity: Database["public"]["Enums"]["memory_sensitivity"]
          source_id: string
          source_table: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          domain?: string
          embedding?: string
          embedding_id?: string
          module?: string
          scope?: Database["public"]["Enums"]["memory_scope"]
          sensitivity?: Database["public"]["Enums"]["memory_sensitivity"]
          source_id?: string
          source_table?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_embeddings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "memory_embeddings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "memory_embeddings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      memory_events: {
        Row: {
          created_at: string
          domain: string
          event_id: string
          module: string
          payload: Json
          source: string
          subject_id: string | null
          subject_type: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          domain: string
          event_id?: string
          module: string
          payload?: Json
          source: string
          subject_id?: string | null
          subject_type: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          domain?: string
          event_id?: string
          module?: string
          payload?: Json
          source?: string
          subject_id?: string | null
          subject_type?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "memory_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "memory_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      memory_facts: {
        Row: {
          embedding: string | null
          embedding_model: string | null
          embedding_updated_at: string | null
          entity: string
          extracted_at: string
          fact_key: string
          fact_value: string
          fact_value_type: string
          id: string
          provenance_confidence: number
          provenance_source: string
          provenance_utterance_id: string | null
          superseded_at: string | null
          superseded_by: string | null
          tenant_id: string
          thread_id: string | null
          user_id: string
          vtid: string | null
        }
        Insert: {
          embedding?: string | null
          embedding_model?: string | null
          embedding_updated_at?: string | null
          entity?: string
          extracted_at?: string
          fact_key: string
          fact_value: string
          fact_value_type?: string
          id?: string
          provenance_confidence?: number
          provenance_source: string
          provenance_utterance_id?: string | null
          superseded_at?: string | null
          superseded_by?: string | null
          tenant_id: string
          thread_id?: string | null
          user_id: string
          vtid?: string | null
        }
        Update: {
          embedding?: string | null
          embedding_model?: string | null
          embedding_updated_at?: string | null
          entity?: string
          extracted_at?: string
          fact_key?: string
          fact_value?: string
          fact_value_type?: string
          id?: string
          provenance_confidence?: number
          provenance_source?: string
          provenance_utterance_id?: string | null
          superseded_at?: string | null
          superseded_by?: string | null
          tenant_id?: string
          thread_id?: string | null
          user_id?: string
          vtid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memory_facts_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "memory_facts"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_garden_config: {
        Row: {
          category_key: string
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          is_active: boolean
          label: string
          longevity_message: string | null
          target_count: number
        }
        Insert: {
          category_key: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          is_active?: boolean
          label: string
          longevity_message?: string | null
          target_count?: number
        }
        Update: {
          category_key?: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          is_active?: boolean
          label?: string
          longevity_message?: string | null
          target_count?: number
        }
        Relationships: []
      }
      memory_garden_nodes: {
        Row: {
          confidence: number
          created_at: string
          domain: string
          first_seen: string
          id: string
          last_seen: string
          node_type: string
          source: string
          summary: string
          tenant_id: string
          title: string
          user_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          domain: string
          first_seen?: string
          id?: string
          last_seen?: string
          node_type: string
          source: string
          summary: string
          tenant_id: string
          title: string
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          domain?: string
          first_seen?: string
          id?: string
          last_seen?: string
          node_type?: string
          source?: string
          summary?: string
          tenant_id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      memory_items: {
        Row: {
          active_role: string | null
          category_key: string
          content: string
          content_json: Json | null
          conversation_id: string | null
          created_at: string
          embedding: string | null
          embedding_model: string | null
          embedding_updated_at: string | null
          id: string
          importance: number
          occurred_at: string
          origin_service: string | null
          source: string
          tenant_id: string
          user_id: string
          visibility_scope: string | null
          vtid: string | null
          workspace_scope: string | null
        }
        Insert: {
          active_role?: string | null
          category_key: string
          content: string
          content_json?: Json | null
          conversation_id?: string | null
          created_at?: string
          embedding?: string | null
          embedding_model?: string | null
          embedding_updated_at?: string | null
          id?: string
          importance?: number
          occurred_at?: string
          origin_service?: string | null
          source: string
          tenant_id: string
          user_id: string
          visibility_scope?: string | null
          vtid?: string | null
          workspace_scope?: string | null
        }
        Update: {
          active_role?: string | null
          category_key?: string
          content?: string
          content_json?: Json | null
          conversation_id?: string | null
          created_at?: string
          embedding?: string | null
          embedding_model?: string | null
          embedding_updated_at?: string | null
          id?: string
          importance?: number
          occurred_at?: string
          origin_service?: string | null
          source?: string
          tenant_id?: string
          user_id?: string
          visibility_scope?: string | null
          vtid?: string | null
          workspace_scope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memory_items_category_key_fkey"
            columns: ["category_key"]
            isOneToOne: false
            referencedRelation: "memory_categories"
            referencedColumns: ["key"]
          },
        ]
      }
      memory_node_sources: {
        Row: {
          created_at: string
          diary_entry_id: string
          node_id: string
        }
        Insert: {
          created_at?: string
          diary_entry_id: string
          node_id: string
        }
        Update: {
          created_at?: string
          diary_entry_id?: string
          node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_node_sources_diary_entry_id_fkey"
            columns: ["diary_entry_id"]
            isOneToOne: false
            referencedRelation: "memory_diary_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_node_sources_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "memory_garden_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      message_actions: {
        Row: {
          action_data: Json | null
          action_type: string
          created_at: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          created_at?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          created_at?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_actions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_queue: {
        Row: {
          attempts: number | null
          campaign_id: string
          channel_type: string
          created_at: string | null
          error: string | null
          id: string
          max_attempts: number | null
          metadata: Json | null
          payload: Json
          priority: number | null
          processed_at: string | null
          recipient_id: string
          scheduled_for: string
          status: string
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          campaign_id: string
          channel_type: string
          created_at?: string | null
          error?: string | null
          id?: string
          max_attempts?: number | null
          metadata?: Json | null
          payload: Json
          priority?: number | null
          processed_at?: string | null
          recipient_id: string
          scheduled_for: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          campaign_id?: string
          channel_type?: string
          created_at?: string | null
          error?: string | null
          id?: string
          max_attempts?: number | null
          metadata?: Json | null
          payload?: Json
          priority?: number | null
          processed_at?: string | null
          recipient_id?: string
          scheduled_for?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_queue_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "campaign_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          message_id?: string
          user_id?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          category: string
          content: Json
          created_at: string
          id: string
          is_active: boolean
          template_type: string
          tenant_id: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          category: string
          content: Json
          created_at?: string
          id?: string
          is_active?: boolean
          template_type: string
          tenant_id: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          category?: string
          content?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          template_type?: string
          tenant_id?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      message_threads: {
        Row: {
          created_at: string
          created_by: string
          id: string
          metadata: Json | null
          name: string | null
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          metadata?: Json | null
          name?: string | null
          tenant_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          metadata?: Json | null
          name?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          action_buttons: Json | null
          body: string
          content_data: Json | null
          created_at: string | null
          delivered_at: string | null
          expires_at: string | null
          id: string
          message_type: string
          parent_message_id: string | null
          read_at: string | null
          recipient_id: string | null
          sender_id: string | null
          sent_at: string | null
          tenant_id: string
          thread_id: string | null
          updated_at: string
          workflow_type: string | null
        }
        Insert: {
          action_buttons?: Json | null
          body: string
          content_data?: Json | null
          created_at?: string | null
          delivered_at?: string | null
          expires_at?: string | null
          id?: string
          message_type?: string
          parent_message_id?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string | null
          sent_at?: string | null
          tenant_id: string
          thread_id?: string | null
          updated_at?: string
          workflow_type?: string | null
        }
        Update: {
          action_buttons?: Json | null
          body?: string
          content_data?: Json | null
          created_at?: string | null
          delivered_at?: string | null
          expires_at?: string | null
          id?: string
          message_type?: string
          parent_message_id?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string | null
          sent_at?: string | null
          tenant_id?: string
          thread_id?: string | null
          updated_at?: string
          workflow_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      music_metadata: {
        Row: {
          album_name: string | null
          artist_name: string | null
          bpm: number | null
          genre: string | null
          media_id: string
          mood: string | null
        }
        Insert: {
          album_name?: string | null
          artist_name?: string | null
          bpm?: number | null
          genre?: string | null
          media_id: string
          mood?: string | null
        }
        Update: {
          album_name?: string | null
          artist_name?: string | null
          bpm?: number | null
          genre?: string | null
          media_id?: string
          mood?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "music_metadata_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: true
            referencedRelation: "media_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          message_id: string | null
          reason: string | null
          thread_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          message_id?: string | null
          reason?: string | null
          thread_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          message_id?: string | null
          reason?: string | null
          thread_id?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          dnd_enabled: boolean
          dnd_end_time: string | null
          dnd_start_time: string | null
          email_ai_tips: boolean | null
          email_appointments: boolean | null
          email_events: boolean | null
          email_weekly_reports: boolean | null
          id: string
          inapp_achievements: boolean | null
          inapp_messages: boolean | null
          inapp_system: boolean | null
          push_breaking_news: boolean | null
          push_enabled: boolean
          push_friend_activity: boolean | null
          push_goal_reminders: boolean | null
          push_group_messages: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dnd_enabled?: boolean
          dnd_end_time?: string | null
          dnd_start_time?: string | null
          email_ai_tips?: boolean | null
          email_appointments?: boolean | null
          email_events?: boolean | null
          email_weekly_reports?: boolean | null
          id?: string
          inapp_achievements?: boolean | null
          inapp_messages?: boolean | null
          inapp_system?: boolean | null
          push_breaking_news?: boolean | null
          push_enabled?: boolean
          push_friend_activity?: boolean | null
          push_goal_reminders?: boolean | null
          push_group_messages?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dnd_enabled?: boolean
          dnd_end_time?: string | null
          dnd_start_time?: string | null
          email_ai_tips?: boolean | null
          email_appointments?: boolean | null
          email_events?: boolean | null
          email_weekly_reports?: boolean | null
          id?: string
          inapp_achievements?: boolean | null
          inapp_messages?: boolean | null
          inapp_system?: boolean | null
          push_breaking_news?: boolean | null
          push_enabled?: boolean
          push_friend_activity?: boolean | null
          push_goal_reminders?: boolean | null
          push_group_messages?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      oasis_events: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          conversation_turn_id: string | null
          created_at: string
          event: string | null
          git_sha: string | null
          id: string
          kind: string | null
          layer: string | null
          link: string | null
          message: string
          meta: Json | null
          metadata: Json | null
          model: string | null
          module: string | null
          notes: string | null
          projected: boolean | null
          ref: string | null
          rid: string | null
          role: string
          service: string
          source: string | null
          status: string
          surface: string | null
          task_stage: string | null
          tenant: string | null
          title: string | null
          topic: string
          vtid: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          conversation_turn_id?: string | null
          created_at?: string
          event?: string | null
          git_sha?: string | null
          id?: string
          kind?: string | null
          layer?: string | null
          link?: string | null
          message: string
          meta?: Json | null
          metadata?: Json | null
          model?: string | null
          module?: string | null
          notes?: string | null
          projected?: boolean | null
          ref?: string | null
          rid?: string | null
          role: string
          service: string
          source?: string | null
          status: string
          surface?: string | null
          task_stage?: string | null
          tenant?: string | null
          title?: string | null
          topic: string
          vtid?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          conversation_turn_id?: string | null
          created_at?: string
          event?: string | null
          git_sha?: string | null
          id?: string
          kind?: string | null
          layer?: string | null
          link?: string | null
          message?: string
          meta?: Json | null
          metadata?: Json | null
          model?: string | null
          module?: string | null
          notes?: string | null
          projected?: boolean | null
          ref?: string | null
          rid?: string | null
          role?: string
          service?: string
          source?: string | null
          status?: string
          surface?: string | null
          task_stage?: string | null
          tenant?: string | null
          title?: string | null
          topic?: string
          vtid?: string | null
        }
        Relationships: []
      }
      oasis_events_v1: {
        Row: {
          assignee_ai: string
          created_at: string
          git_sha: string | null
          id: number
          metadata: Json
          notes: string | null
          rid: string
          schema_version: number
          status: string
          task_type: string
          tenant: string
        }
        Insert: {
          assignee_ai: string
          created_at?: string
          git_sha?: string | null
          id?: number
          metadata?: Json
          notes?: string | null
          rid: string
          schema_version?: number
          status: string
          task_type: string
          tenant: string
        }
        Update: {
          assignee_ai?: string
          created_at?: string
          git_sha?: string | null
          id?: number
          metadata?: Json
          notes?: string | null
          rid?: string
          schema_version?: number
          status?: string
          task_type?: string
          tenant?: string
        }
        Relationships: []
      }
      oasis_spec_approvals: {
        Row: {
          approved_at: string
          approved_by: string
          approved_role: string
          id: string
          spec_hash: string
          spec_id: string
          vtid: string
        }
        Insert: {
          approved_at?: string
          approved_by: string
          approved_role?: string
          id?: string
          spec_hash: string
          spec_id: string
          vtid: string
        }
        Update: {
          approved_at?: string
          approved_by?: string
          approved_role?: string
          id?: string
          spec_hash?: string
          spec_id?: string
          vtid?: string
        }
        Relationships: [
          {
            foreignKeyName: "oasis_spec_approvals_spec_id_fkey"
            columns: ["spec_id"]
            isOneToOne: false
            referencedRelation: "oasis_specs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oasis_spec_approvals_spec_id_fkey"
            columns: ["spec_id"]
            isOneToOne: false
            referencedRelation: "vtid_specs"
            referencedColumns: ["id"]
          },
        ]
      }
      oasis_spec_validations: {
        Row: {
          created_at: string
          id: string
          report_json: Json
          result: string
          spec_hash: string
          spec_id: string
          validator_model: string
          vtid: string
        }
        Insert: {
          created_at?: string
          id?: string
          report_json?: Json
          result?: string
          spec_hash: string
          spec_id: string
          validator_model?: string
          vtid: string
        }
        Update: {
          created_at?: string
          id?: string
          report_json?: Json
          result?: string
          spec_hash?: string
          spec_id?: string
          validator_model?: string
          vtid?: string
        }
        Relationships: [
          {
            foreignKeyName: "oasis_spec_validations_spec_id_fkey"
            columns: ["spec_id"]
            isOneToOne: false
            referencedRelation: "oasis_specs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oasis_spec_validations_spec_id_fkey"
            columns: ["spec_id"]
            isOneToOne: false
            referencedRelation: "vtid_specs"
            referencedColumns: ["id"]
          },
        ]
      }
      oasis_specs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          spec_hash: string
          spec_markdown: string
          status: string
          title: string
          version: number
          vtid: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          spec_hash?: string
          spec_markdown?: string
          status?: string
          title?: string
          version?: number
          vtid: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          spec_hash?: string
          spec_markdown?: string
          status?: string
          title?: string
          version?: number
          vtid?: string
        }
        Relationships: []
      }
      oasis_tasks: {
        Row: {
          assignee: string | null
          column: string | null
          created_at: string
          description: string | null
          id: number
          is_terminal: boolean | null
          metadata: Json | null
          status: string
          terminal_outcome: string | null
          title: string
          updated_at: string
          vtid: string
        }
        Insert: {
          assignee?: string | null
          column?: string | null
          created_at?: string
          description?: string | null
          id?: number
          is_terminal?: boolean | null
          metadata?: Json | null
          status?: string
          terminal_outcome?: string | null
          title: string
          updated_at?: string
          vtid: string
        }
        Update: {
          assignee?: string | null
          column?: string | null
          created_at?: string
          description?: string | null
          id?: number
          is_terminal?: boolean | null
          metadata?: Json | null
          status?: string
          terminal_outcome?: string | null
          title?: string
          updated_at?: string
          vtid?: string
        }
        Relationships: []
      }
      OasisEvent: {
        Row: {
          created_at: string | null
          event: string | null
          git_sha: string | null
          id: string
          message: string | null
          metadata: Json | null
          notes: string | null
          projected: boolean | null
          rid: string | null
          service: string
          status: string
          tenant: string | null
          topic: string | null
          vtid: string | null
        }
        Insert: {
          created_at?: string | null
          event?: string | null
          git_sha?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          notes?: string | null
          projected?: boolean | null
          rid?: string | null
          service: string
          status: string
          tenant?: string | null
          topic?: string | null
          vtid?: string | null
        }
        Update: {
          created_at?: string | null
          event?: string | null
          git_sha?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          notes?: string | null
          projected?: boolean | null
          rid?: string | null
          service?: string
          status?: string
          tenant?: string | null
          topic?: string | null
          vtid?: string | null
        }
        Relationships: []
      }
      onboarding_invitations: {
        Row: {
          clicked_at: string | null
          converted_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          message: string | null
          opened_at: string | null
          sent_at: string | null
          signup_attempt_id: string | null
          status: string
          target_user_id: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          clicked_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          message?: string | null
          opened_at?: string | null
          sent_at?: string | null
          signup_attempt_id?: string | null
          status?: string
          target_user_id?: string | null
          tenant_id: string
          type?: string
        }
        Update: {
          clicked_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          message?: string | null
          opened_at?: string | null
          sent_at?: string | null
          signup_attempt_id?: string | null
          status?: string
          target_user_id?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_invitations_signup_attempt_id_fkey"
            columns: ["signup_attempt_id"]
            isOneToOne: false
            referencedRelation: "signup_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_invitations_signup_attempt_id_fkey"
            columns: ["signup_attempt_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["attempt_id"]
          },
          {
            foreignKeyName: "onboarding_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "onboarding_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      package_item_redemptions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          package_item_id: string
          purchase_id: string
          redemption_number: number
          scheduled_at: string | null
          status: string
          tenant_id: string | null
          ticket_purchase_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          package_item_id: string
          purchase_id: string
          redemption_number?: number
          scheduled_at?: string | null
          status?: string
          tenant_id?: string | null
          ticket_purchase_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          package_item_id?: string
          purchase_id?: string
          redemption_number?: number
          scheduled_at?: string | null
          status?: string
          tenant_id?: string | null
          ticket_purchase_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_item_redemptions_package_item_id_fkey"
            columns: ["package_item_id"]
            isOneToOne: false
            referencedRelation: "package_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_item_redemptions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "package_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_item_redemptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "package_item_redemptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "package_item_redemptions_ticket_purchase_id_fkey"
            columns: ["ticket_purchase_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      package_items: {
        Row: {
          access_duration_days: number | null
          access_type: string | null
          created_at: string | null
          event_id: string | null
          id: string
          item_description: string | null
          item_duration_min: number | null
          item_title: string | null
          item_type: string
          item_value_cents: number | null
          metadata: Json | null
          package_id: string
          quantity: number
          service_key: string | null
          sort_order: number | null
          tenant_id: string | null
        }
        Insert: {
          access_duration_days?: number | null
          access_type?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          item_description?: string | null
          item_duration_min?: number | null
          item_title?: string | null
          item_type: string
          item_value_cents?: number | null
          metadata?: Json | null
          package_id: string
          quantity?: number
          service_key?: string | null
          sort_order?: number | null
          tenant_id?: string | null
        }
        Update: {
          access_duration_days?: number | null
          access_type?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          item_description?: string | null
          item_duration_min?: number | null
          item_title?: string | null
          item_type?: string
          item_value_cents?: number | null
          metadata?: Json | null
          package_id?: string
          quantity?: number
          service_key?: string | null
          sort_order?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "global_community_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "business_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "package_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      package_purchases: {
        Row: {
          amount_paid_cents: number | null
          buyer_email: string
          buyer_id: string | null
          buyer_name: string | null
          created_at: string | null
          currency: string
          expires_at: string | null
          id: string
          metadata: Json | null
          package_id: string
          purchased_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount_paid_cents?: number | null
          buyer_email: string
          buyer_id?: string | null
          buyer_name?: string | null
          created_at?: string | null
          currency?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          package_id: string
          purchased_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_paid_cents?: number | null
          buyer_email?: string
          buyer_id?: string | null
          buyer_name?: string | null
          created_at?: string | null
          currency?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          package_id?: string
          purchased_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_purchases_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "package_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "business_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_purchases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "package_purchases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      patient_provider_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          patient_id: string
          provider_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          provider_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          provider_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_provider_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "patient_provider_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      pattern_discoveries: {
        Row: {
          conditions: Json | null
          confidence_level: number | null
          created_at: string | null
          expected_impact: string | null
          id: string
          implemented_rule_id: string | null
          occurrence_rate: number | null
          pattern_description: string
          pattern_name: string
          pattern_type: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sample_size: number
          status: string | null
          suggested_actions: Json | null
          tenant_id: string | null
          triggers: Json | null
          updated_at: string | null
        }
        Insert: {
          conditions?: Json | null
          confidence_level?: number | null
          created_at?: string | null
          expected_impact?: string | null
          id?: string
          implemented_rule_id?: string | null
          occurrence_rate?: number | null
          pattern_description: string
          pattern_name: string
          pattern_type: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_size: number
          status?: string | null
          suggested_actions?: Json | null
          tenant_id?: string | null
          triggers?: Json | null
          updated_at?: string | null
        }
        Update: {
          conditions?: Json | null
          confidence_level?: number | null
          created_at?: string | null
          expected_impact?: string | null
          id?: string
          implemented_rule_id?: string | null
          occurrence_rate?: number | null
          pattern_description?: string
          pattern_name?: string
          pattern_type?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_size?: number
          status?: string | null
          suggested_actions?: Json | null
          tenant_id?: string | null
          triggers?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pattern_discoveries_implemented_rule_id_fkey"
            columns: ["implemented_rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pattern_discoveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pattern_discoveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      plan_adherence_logs: {
        Row: {
          completed: boolean | null
          data: Json
          id: string
          logged_at: string | null
          notes: string | null
          plan_id: string
          plan_type: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          data: Json
          id?: string
          logged_at?: string | null
          notes?: string | null
          plan_id: string
          plan_type: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          data?: Json
          id?: string
          logged_at?: string | null
          notes?: string | null
          plan_id?: string
          plan_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_adherence_logs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "user_health_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_adherence_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      podcast_favorites: {
        Row: {
          created_at: string
          id: string
          podcast_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          podcast_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          podcast_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_favorites_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "media_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_metadata: {
        Row: {
          episode_number: number | null
          guest_name: string | null
          host_name: string | null
          language: string | null
          media_id: string
          season_number: number | null
          series_name: string | null
        }
        Insert: {
          episode_number?: number | null
          guest_name?: string | null
          host_name?: string | null
          language?: string | null
          media_id: string
          season_number?: number | null
          series_name?: string | null
        }
        Update: {
          episode_number?: number | null
          guest_name?: string | null
          host_name?: string | null
          language?: string | null
          media_id?: string
          season_number?: number | null
          series_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "podcast_metadata_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: true
            referencedRelation: "media_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_show_subscriptions: {
        Row: {
          host_name: string
          id: string
          notification_enabled: boolean | null
          show_name: string
          subscribed_at: string | null
          user_id: string
        }
        Insert: {
          host_name: string
          id?: string
          notification_enabled?: boolean | null
          show_name: string
          subscribed_at?: string | null
          user_id: string
        }
        Update: {
          host_name?: string
          id?: string
          notification_enabled?: boolean | null
          show_name?: string
          subscribed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_show_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      post_analytics: {
        Row: {
          channel_type: Database["public"]["Enums"]["channel_type"]
          clicked_count: number | null
          created_at: string | null
          delivered_count: number | null
          failed_count: number | null
          id: string
          metadata: Json | null
          opened_count: number | null
          post_id: string
          responded_count: number | null
          revenue: number | null
          sent_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          channel_type: Database["public"]["Enums"]["channel_type"]
          clicked_count?: number | null
          created_at?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          metadata?: Json | null
          opened_count?: number | null
          post_id: string
          responded_count?: number | null
          revenue?: number | null
          sent_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          channel_type?: Database["public"]["Enums"]["channel_type"]
          clicked_count?: number | null
          created_at?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          metadata?: Json | null
          opened_count?: number | null
          post_id?: string
          responded_count?: number | null
          revenue?: number | null
          sent_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_analytics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "distribution_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      proactive_context_cache: {
        Row: {
          computed_at: string
          context_data: Json
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          computed_at?: string
          context_data?: Json
          expires_at?: string
          id?: string
          user_id: string
        }
        Update: {
          computed_at?: string
          context_data?: Json
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proactive_context_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      proactive_engagement: {
        Row: {
          context_snapshot: Json | null
          created_at: string
          engagement_type: string
          id: string
          user_id: string
          user_response: string | null
          was_helpful: boolean | null
        }
        Insert: {
          context_snapshot?: Json | null
          created_at?: string
          engagement_type: string
          id?: string
          user_id: string
          user_response?: string | null
          was_helpful?: boolean | null
        }
        Update: {
          context_snapshot?: Json | null
          created_at?: string
          engagement_type?: string
          id?: string
          user_id?: string
          user_response?: string | null
          was_helpful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "proactive_engagement_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      profile_gallery: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          is_public: boolean
          sort_order: number | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_public?: boolean
          sort_order?: number | null
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_public?: boolean
          sort_order?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profile_milestones: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_public: boolean
          milestone_date: string | null
          sort_order: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean
          milestone_date?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean
          milestone_date?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_posts: {
        Row: {
          comments_count: number
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_public: boolean
          likes_count: number
          shares_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_count?: number
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_public?: boolean
          likes_count?: number
          shares_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_public?: boolean
          likes_count?: number
          shares_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      profile_privacy_settings: {
        Row: {
          created_at: string
          searchable: boolean
          show_email: boolean
          show_full_name: boolean
          show_medical_info: boolean
          show_phone: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          searchable?: boolean
          show_email?: boolean
          show_full_name?: boolean
          show_medical_info?: boolean
          show_phone?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          searchable?: boolean
          show_email?: boolean
          show_full_name?: boolean
          show_medical_info?: boolean
          show_phone?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          admin_user_number: number
          age_range: string | null
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          facebook_bio: string | null
          facebook_interests: string[] | null
          facebook_synced_at: string | null
          facebook_url: string | null
          full_name: string | null
          gender: string | null
          handle: string | null
          id: string
          inferred_language: string | null
          instagram_bio: string | null
          instagram_followers_count: number | null
          instagram_interests: string[] | null
          instagram_synced_at: string | null
          instagram_url: string | null
          languages: string[] | null
          linkedin_headline: string | null
          linkedin_summary: string | null
          linkedin_synced_at: string | null
          linkedin_url: string | null
          links: Json | null
          location: string | null
          longevity_archetype: string | null
          medical_conditions: string[] | null
          medications: string[] | null
          phone: string | null
          preferred_languages: Json | null
          professional_skills: string[] | null
          tenant_id: string | null
          theme: string | null
          tiktok_bio: string | null
          tiktok_content_themes: string[] | null
          tiktok_followers_count: number | null
          tiktok_synced_at: string | null
          tiktok_url: string | null
          timezone: string | null
          updated_at: string
          user_id: string
          x_bio: string | null
          x_followers_count: number | null
          x_synced_at: string | null
          x_topics: string[] | null
          x_url: string | null
          youtube_content_categories: string[] | null
          youtube_description: string | null
          youtube_subscribers_count: number | null
          youtube_synced_at: string | null
          youtube_url: string | null
        }
        Insert: {
          activity_level?: string | null
          admin_user_number?: number
          age_range?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          facebook_bio?: string | null
          facebook_interests?: string[] | null
          facebook_synced_at?: string | null
          facebook_url?: string | null
          full_name?: string | null
          gender?: string | null
          handle?: string | null
          id?: string
          inferred_language?: string | null
          instagram_bio?: string | null
          instagram_followers_count?: number | null
          instagram_interests?: string[] | null
          instagram_synced_at?: string | null
          instagram_url?: string | null
          languages?: string[] | null
          linkedin_headline?: string | null
          linkedin_summary?: string | null
          linkedin_synced_at?: string | null
          linkedin_url?: string | null
          links?: Json | null
          location?: string | null
          longevity_archetype?: string | null
          medical_conditions?: string[] | null
          medications?: string[] | null
          phone?: string | null
          preferred_languages?: Json | null
          professional_skills?: string[] | null
          tenant_id?: string | null
          theme?: string | null
          tiktok_bio?: string | null
          tiktok_content_themes?: string[] | null
          tiktok_followers_count?: number | null
          tiktok_synced_at?: string | null
          tiktok_url?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
          x_bio?: string | null
          x_followers_count?: number | null
          x_synced_at?: string | null
          x_topics?: string[] | null
          x_url?: string | null
          youtube_content_categories?: string[] | null
          youtube_description?: string | null
          youtube_subscribers_count?: number | null
          youtube_synced_at?: string | null
          youtube_url?: string | null
        }
        Update: {
          activity_level?: string | null
          admin_user_number?: number
          age_range?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          facebook_bio?: string | null
          facebook_interests?: string[] | null
          facebook_synced_at?: string | null
          facebook_url?: string | null
          full_name?: string | null
          gender?: string | null
          handle?: string | null
          id?: string
          inferred_language?: string | null
          instagram_bio?: string | null
          instagram_followers_count?: number | null
          instagram_interests?: string[] | null
          instagram_synced_at?: string | null
          instagram_url?: string | null
          languages?: string[] | null
          linkedin_headline?: string | null
          linkedin_summary?: string | null
          linkedin_synced_at?: string | null
          linkedin_url?: string | null
          links?: Json | null
          location?: string | null
          longevity_archetype?: string | null
          medical_conditions?: string[] | null
          medications?: string[] | null
          phone?: string | null
          preferred_languages?: Json | null
          professional_skills?: string[] | null
          tenant_id?: string | null
          theme?: string | null
          tiktok_bio?: string | null
          tiktok_content_themes?: string[] | null
          tiktok_followers_count?: number | null
          tiktok_synced_at?: string | null
          tiktok_url?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          x_bio?: string | null
          x_followers_count?: number | null
          x_synced_at?: string | null
          x_topics?: string[] | null
          x_url?: string | null
          youtube_content_categories?: string[] | null
          youtube_description?: string | null
          youtube_subscribers_count?: number | null
          youtube_synced_at?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      projection_offsets: {
        Row: {
          created_at: string
          events_processed: number | null
          id: string
          last_event_id: string | null
          last_event_time: string | null
          last_processed_at: string
          projector_name: string
        }
        Insert: {
          created_at?: string
          events_processed?: number | null
          id?: string
          last_event_id?: string | null
          last_event_time?: string | null
          last_processed_at?: string
          projector_name: string
        }
        Update: {
          created_at?: string
          events_processed?: number | null
          id?: string
          last_event_id?: string | null
          last_event_time?: string | null
          last_processed_at?: string
          projector_name?: string
        }
        Relationships: []
      }
      provider_appointments: {
        Row: {
          appointment_type: string
          created_at: string
          duration_minutes: number | null
          end_time: string | null
          id: string
          location: string | null
          metadata: Json | null
          notes: string | null
          patient_notes: string | null
          payment_intent_id: string | null
          provider_id: string
          provider_image_url: string | null
          provider_name: string
          provider_specialty: string | null
          start_time: string
          status: string
          stripe_session_id: string | null
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_type: string
          created_at?: string
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          location?: string | null
          metadata?: Json | null
          notes?: string | null
          patient_notes?: string | null
          payment_intent_id?: string | null
          provider_id: string
          provider_image_url?: string | null
          provider_name: string
          provider_specialty?: string | null
          start_time: string
          status?: string
          stripe_session_id?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_type?: string
          created_at?: string
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          location?: string | null
          metadata?: Json | null
          notes?: string | null
          patient_notes?: string | null
          payment_intent_id?: string | null
          provider_id?: string
          provider_image_url?: string | null
          provider_name?: string
          provider_specialty?: string | null
          start_time?: string
          status?: string
          stripe_session_id?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      provider_notes: {
        Row: {
          created_at: string
          id: string
          is_favorite: boolean | null
          metadata: Json | null
          note_text: string
          provider_id: string
          provider_name: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_favorite?: boolean | null
          metadata?: Json | null
          note_text: string
          provider_id: string
          provider_name: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_favorite?: boolean | null
          metadata?: Json | null
          note_text?: string
          provider_id?: string
          provider_name?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          muted_threads: string[] | null
          p256dh_key: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          muted_threads?: string[] | null
          p256dh_key: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          muted_threads?: string[] | null
          p256dh_key?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recommendation_deployments: {
        Row: {
          avg_execution_time_ms: number | null
          created_at: string | null
          deactivated_at: string | null
          deactivated_reason: string | null
          deployed_by: string
          failed_executions: number | null
          id: string
          is_active: boolean | null
          negative_feedback_count: number | null
          positive_feedback_count: number | null
          recommendation_id: string
          rule_id: string
          successful_executions: number | null
          total_executions: number | null
          unique_users_affected: number | null
          updated_at: string | null
        }
        Insert: {
          avg_execution_time_ms?: number | null
          created_at?: string | null
          deactivated_at?: string | null
          deactivated_reason?: string | null
          deployed_by: string
          failed_executions?: number | null
          id?: string
          is_active?: boolean | null
          negative_feedback_count?: number | null
          positive_feedback_count?: number | null
          recommendation_id: string
          rule_id: string
          successful_executions?: number | null
          total_executions?: number | null
          unique_users_affected?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_execution_time_ms?: number | null
          created_at?: string | null
          deactivated_at?: string | null
          deactivated_reason?: string | null
          deployed_by?: string
          failed_executions?: number | null
          id?: string
          is_active?: boolean | null
          negative_feedback_count?: number | null
          positive_feedback_count?: number | null
          recommendation_id?: string
          rule_id?: string
          successful_executions?: number | null
          total_executions?: number | null
          unique_users_affected?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_deployments_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "ai_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_deployments_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          based_on: Json | null
          body: string | null
          category: string | null
          created_at: string | null
          evidence_refs: Json | null
          id: string
          safety_checked: boolean | null
          status: string | null
          tenant_id: string
          title: string | null
          user_id: string
        }
        Insert: {
          based_on?: Json | null
          body?: string | null
          category?: string | null
          created_at?: string | null
          evidence_refs?: Json | null
          id?: string
          safety_checked?: boolean | null
          status?: string | null
          tenant_id: string
          title?: string | null
          user_id: string
        }
        Update: {
          based_on?: Json | null
          body?: string | null
          category?: string | null
          created_at?: string | null
          evidence_refs?: Json | null
          id?: string
          safety_checked?: boolean | null
          status?: string | null
          tenant_id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      relationship_edges: {
        Row: {
          created_at: string
          edge_type: string
          id: string
          last_interaction_at: string
          metadata: Json | null
          source_id: string
          source_type: string
          strength: number
          target_id: string
          target_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          edge_type: string
          id?: string
          last_interaction_at?: string
          metadata?: Json | null
          source_id: string
          source_type: string
          strength?: number
          target_id: string
          target_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          edge_type?: string
          id?: string
          last_interaction_at?: string
          metadata?: Json | null
          source_id?: string
          source_type?: string
          strength?: number
          target_id?: string
          target_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      relationship_nodes: {
        Row: {
          created_at: string
          domain: string
          id: string
          metadata: Json | null
          node_type: string
          ref_id: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string
          domain?: string
          id?: string
          metadata?: Json | null
          node_type: string
          ref_id?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          metadata?: Json | null
          node_type?: string
          ref_id?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: []
      }
      reseller_attributions: {
        Row: {
          commission_amount: number | null
          commission_rate: number | null
          created_at: string | null
          event_id: string
          id: string
          paid_at: string | null
          payout_id: string | null
          reseller_id: string
          sale_amount: number
          status: string
          ticket_purchase_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string | null
          event_id: string
          id?: string
          paid_at?: string | null
          payout_id?: string | null
          reseller_id: string
          sale_amount: number
          status?: string
          ticket_purchase_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string | null
          event_id?: string
          id?: string
          paid_at?: string | null
          payout_id?: string | null
          reseller_id?: string
          sale_amount?: number
          status?: string
          ticket_purchase_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reseller_attributions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "global_community_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_attributions_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "reseller_payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_attributions_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "reseller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_attributions_ticket_purchase_id_fkey"
            columns: ["ticket_purchase_id"]
            isOneToOne: true
            referencedRelation: "event_ticket_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_payouts: {
        Row: {
          created_at: string
          currency: string
          id: string
          notes: string | null
          paid_at: string | null
          reseller_profile_id: string
          status: string
          total_commission_amount: number
          wallet_transaction_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          reseller_profile_id: string
          status?: string
          total_commission_amount: number
          wallet_transaction_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          reseller_profile_id?: string
          status?: string
          total_commission_amount?: number
          wallet_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reseller_payouts_reseller_profile_id_fkey"
            columns: ["reseller_profile_id"]
            isOneToOne: false
            referencedRelation: "reseller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_payouts_wallet_transaction_id_fkey"
            columns: ["wallet_transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_profiles: {
        Row: {
          commission_rate: number | null
          created_at: string | null
          id: string
          metadata: Json | null
          reseller_code: string
          status: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          reseller_code: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          reseller_code?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "reseller_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "reseller_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      retrieval_traces: {
        Row: {
          actor_role: string
          actor_user_id: string
          blocked: Json
          created_at: string
          domain: string
          module: string
          query_text: string | null
          request_id: string
          retrieved: Json
          tenant_id: string
          trace_id: string
        }
        Insert: {
          actor_role: string
          actor_user_id: string
          blocked?: Json
          created_at?: string
          domain: string
          module: string
          query_text?: string | null
          request_id?: string
          retrieved?: Json
          tenant_id: string
          trace_id?: string
        }
        Update: {
          actor_role?: string
          actor_user_id?: string
          blocked?: Json
          created_at?: string
          domain?: string
          module?: string
          query_text?: string | null
          request_id?: string
          retrieved?: Json
          tenant_id?: string
          trace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "retrieval_traces_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "retrieval_traces_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "retrieval_traces_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      role_preferences: {
        Row: {
          id: string
          role: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          role: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          role?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "role_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      role_sessions: {
        Row: {
          active_role: Database["public"]["Enums"]["vitana_role"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_role: Database["public"]["Enums"]["vitana_role"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_role?: Database["public"]["Enums"]["vitana_role"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "role_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "role_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      safety_constraints: {
        Row: {
          constraint_key: string | null
          constraint_value: string | null
          created_at: string | null
          id: string
          severity: string | null
          source: string | null
          tenant_id: string
          type: string | null
          user_id: string
        }
        Insert: {
          constraint_key?: string | null
          constraint_value?: string | null
          created_at?: string | null
          id?: string
          severity?: string | null
          source?: string | null
          tenant_id: string
          type?: string | null
          user_id: string
        }
        Update: {
          constraint_key?: string | null
          constraint_value?: string | null
          created_at?: string | null
          id?: string
          severity?: string | null
          source?: string | null
          tenant_id?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          channels: Database["public"]["Enums"]["channel_type"][]
          created_at: string | null
          error_message: string | null
          id: string
          last_attempt_at: string | null
          metadata: Json | null
          post_id: string
          retry_count: number | null
          scheduled_for: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          channels: Database["public"]["Enums"]["channel_type"][]
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          metadata?: Json | null
          post_id: string
          retry_count?: number | null
          scheduled_for: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          channels?: Database["public"]["Enums"]["channel_type"][]
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          metadata?: Json | null
          post_id?: string
          retry_count?: number | null
          scheduled_for?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "distribution_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      search_audit_log: {
        Row: {
          created_at: string
          id: string
          results_count: number
          search_scope: string
          search_term: string
          searcher_id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          results_count?: number
          search_scope: string
          search_term: string
          searcher_id: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          results_count?: number
          search_scope?: string
          search_term?: string
          searcher_id?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      signup_attempts: {
        Row: {
          auth_user_id: string | null
          completed_at: string | null
          created_at: string | null
          email: string
          id: string
          ip_address: unknown
          metadata: Json | null
          started_at: string | null
          status: string
          tenant_id: string
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          auth_user_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          email: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          started_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          auth_user_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          email?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          started_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signup_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "signup_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      skills_mcp: {
        Row: {
          connector_name: string
          created_at: string | null
          description: string | null
          id: string
          parameters: Json | null
          skill_id: string
          skill_name: string
          updated_at: string | null
        }
        Insert: {
          connector_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          parameters?: Json | null
          skill_id: string
          skill_name: string
          updated_at?: string | null
        }
        Update: {
          connector_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          parameters?: Json | null
          skill_id?: string
          skill_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      software_versions: {
        Row: {
          created_at: string
          deploy_type: string
          environment: string
          git_commit: string
          id: string
          initiator: string
          service: string
          status: string
          swv_id: string
        }
        Insert: {
          created_at?: string
          deploy_type: string
          environment?: string
          git_commit: string
          id?: string
          initiator: string
          service: string
          status: string
          swv_id: string
        }
        Update: {
          created_at?: string
          deploy_type?: string
          environment?: string
          git_commit?: string
          id?: string
          initiator?: string
          service?: string
          status?: string
          swv_id?: string
        }
        Relationships: []
      }
      stream_recordings: {
        Row: {
          created_at: string
          duration_seconds: number | null
          file_size_bytes: number | null
          id: string
          recording_url: string
          status: string | null
          storage_path: string
          stream_id: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          recording_url: string
          status?: string | null
          storage_path: string
          stream_id: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          recording_url?: string
          status?: string | null
          storage_path?: string
          stream_id?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_recordings_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "community_live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      supplements: {
        Row: {
          benefits: string[] | null
          brand: string | null
          category: string
          created_at: string | null
          description: string | null
          dosage: string | null
          id: string
          image_url: string | null
          in_stock: boolean | null
          ingredients: Json | null
          is_active: boolean | null
          metadata: Json | null
          name: string
          price: number
          rating: number | null
          review_count: number | null
          serving_size: string | null
          servings_per_container: number | null
          updated_at: string | null
        }
        Insert: {
          benefits?: string[] | null
          brand?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          dosage?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean | null
          ingredients?: Json | null
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          price: number
          rating?: number | null
          review_count?: number | null
          serving_size?: string | null
          servings_per_container?: number | null
          updated_at?: string | null
        }
        Update: {
          benefits?: string[] | null
          brand?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          dosage?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean | null
          ingredients?: Json | null
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          price?: number
          rating?: number | null
          review_count?: number | null
          serving_size?: string | null
          servings_per_container?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_control_audit: {
        Row: {
          created_at: string
          expires_at: string | null
          from_enabled: boolean
          id: string
          key: string
          reason: string
          scope: Json
          to_enabled: boolean
          updated_by: string | null
          updated_by_role: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          from_enabled: boolean
          id?: string
          key: string
          reason: string
          scope: Json
          to_enabled: boolean
          updated_by?: string | null
          updated_by_role?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          from_enabled?: boolean
          id?: string
          key?: string
          reason?: string
          scope?: Json
          to_enabled?: boolean
          updated_by?: string | null
          updated_by_role?: string | null
        }
        Relationships: []
      }
      system_controls: {
        Row: {
          enabled: boolean
          expires_at: string | null
          key: string
          reason: string
          scope: Json
          updated_at: string
          updated_by: string | null
          updated_by_role: string | null
        }
        Insert: {
          enabled?: boolean
          expires_at?: string | null
          key: string
          reason?: string
          scope?: Json
          updated_at?: string
          updated_by?: string | null
          updated_by_role?: string | null
        }
        Update: {
          enabled?: boolean
          expires_at?: string | null
          key?: string
          reason?: string
          scope?: Json
          updated_at?: string
          updated_by?: string | null
          updated_by_role?: string | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          category: string
          content: string
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          metadata: Json | null
          name: string
          preview_image_url: string | null
          updated_at: string
          usage_count: number | null
          user_id: string
          variables: Json | null
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          name: string
          preview_image_url?: string | null
          updated_at?: string
          usage_count?: number | null
          user_id: string
          variables?: Json | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          name?: string
          preview_image_url?: string | null
          updated_at?: string
          usage_count?: number | null
          user_id?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      tenants: {
        Row: {
          branding: Json
          created_at: string | null
          is_active: boolean
          name: string
          policy_profile: Json
          slug: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branding?: Json
          created_at?: string | null
          is_active?: boolean
          name: string
          policy_profile?: Json
          slug?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          branding?: Json
          created_at?: string | null
          is_active?: boolean
          name?: string
          policy_profile?: Json
          slug?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      thread_participants: {
        Row: {
          id: string
          is_active: boolean
          joined_at: string
          last_read_at: string | null
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          joined_at?: string
          last_read_at?: string | null
          role?: string
          thread_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          joined_at?: string
          last_read_at?: string | null
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_thread_participants_thread_id"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_thread_participants_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "thread_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_presence: {
        Row: {
          context: string
          id: string
          last_seen: string
          tenant_id: string | null
          thread_id: string
          user_id: string
        }
        Insert: {
          context: string
          id?: string
          last_seen?: string
          tenant_id?: string | null
          thread_id: string
          user_id: string
        }
        Update: {
          context?: string
          id?: string
          last_seen?: string
          tenant_id?: string | null
          thread_id?: string
          user_id?: string
        }
        Relationships: []
      }
      thread_summaries: {
        Row: {
          content_hash: string
          covers_turns_from: number
          covers_turns_to: number
          generated_at: string
          generation_model: string | null
          id: string
          summary_text: string
          summary_type: string
          tenant_id: string
          thread_id: string
          user_id: string
          version: number
          vtid: string | null
        }
        Insert: {
          content_hash: string
          covers_turns_from?: number
          covers_turns_to: number
          generated_at?: string
          generation_model?: string | null
          id?: string
          summary_text: string
          summary_type: string
          tenant_id: string
          thread_id: string
          user_id: string
          version?: number
          vtid?: string | null
        }
        Update: {
          content_hash?: string
          covers_turns_from?: number
          covers_turns_to?: number
          generated_at?: string
          generation_model?: string | null
          id?: string
          summary_text?: string
          summary_type?: string
          tenant_id?: string
          thread_id?: string
          user_id?: string
          version?: number
          vtid?: string | null
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          id: string
          tenant_id: string
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          tenant_id: string
          thread_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          tenant_id?: string
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "typing_indicators_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "typing_indicators_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_active_roles: {
        Row: {
          active_role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_active_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      user_activity_log: {
        Row: {
          activity_data: Json
          activity_type: string
          context_data: Json
          created_at: string
          dedupe_key: string | null
          id: string
          ingested_at: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          activity_data: Json
          activity_type: string
          context_data?: Json
          created_at?: string
          dedupe_key?: string | null
          id?: string
          ingested_at?: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          activity_data?: Json
          activity_type?: string
          context_data?: Json
          created_at?: string
          dedupe_key?: string | null
          id?: string
          ingested_at?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      user_activity_log_archive: {
        Row: {
          activity_data: Json
          activity_type: string
          context_data: Json
          created_at: string
          dedupe_key: string | null
          id: string
          ingested_at: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          activity_data: Json
          activity_type: string
          context_data?: Json
          created_at?: string
          dedupe_key?: string | null
          id?: string
          ingested_at?: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          activity_data?: Json
          activity_type?: string
          context_data?: Json
          created_at?: string
          dedupe_key?: string | null
          id?: string
          ingested_at?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          api_key: string
          created_at: string
          encrypted_key: string | null
          id: string
          service_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          encrypted_key?: string | null
          id?: string
          service_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          encrypted_key?: string | null
          id?: string
          service_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      user_context_cache: {
        Row: {
          cached_at: string
          context_data: Json
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          cached_at?: string
          context_data: Json
          expires_at?: string
          id?: string
          user_id: string
        }
        Update: {
          cached_at?: string
          context_data?: Json
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_context_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      user_device_tokens: {
        Row: {
          created_at: string
          device_label: string | null
          fcm_token: string
          id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          fcm_token: string
          id?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          fcm_token?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_discount_codes: {
        Row: {
          code: string
          created_at: string
          discount_percent: number
          expires_at: string
          id: string
          tenant_slug: string
          used_at: string | null
          used_on_purchase_id: string | null
          user_id: string
          valid_for: string
        }
        Insert: {
          code: string
          created_at?: string
          discount_percent?: number
          expires_at?: string
          id?: string
          tenant_slug?: string
          used_at?: string | null
          used_on_purchase_id?: string | null
          user_id: string
          valid_for?: string
        }
        Update: {
          code?: string
          created_at?: string
          discount_percent?: number
          expires_at?: string
          id?: string
          tenant_slug?: string
          used_at?: string | null
          used_on_purchase_id?: string | null
          user_id?: string
          valid_for?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_discount_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      user_feedback_reports: {
        Row: {
          admin_notes: string | null
          affected_screen: string | null
          attachments: string[] | null
          created_at: string
          id: string
          report_type: string
          severity: string
          status: string
          tenant_id: string | null
          transcript: string
          updated_at: string
          user_id: string
          vtid: string | null
        }
        Insert: {
          admin_notes?: string | null
          affected_screen?: string | null
          attachments?: string[] | null
          created_at?: string
          id?: string
          report_type?: string
          severity?: string
          status?: string
          tenant_id?: string | null
          transcript: string
          updated_at?: string
          user_id: string
          vtid?: string | null
        }
        Update: {
          admin_notes?: string | null
          affected_screen?: string | null
          attachments?: string[] | null
          created_at?: string
          id?: string
          report_type?: string
          severity?: string
          status?: string
          tenant_id?: string | null
          transcript?: string
          updated_at?: string
          user_id?: string
          vtid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_feedback_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_feedback_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      user_health_plans: {
        Row: {
          active: boolean | null
          adherence_score: number | null
          ai_generated: boolean | null
          created_at: string | null
          generated_at: string | null
          id: string
          last_updated: string | null
          plan_data: Json
          plan_type: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          adherence_score?: number | null
          ai_generated?: boolean | null
          created_at?: string | null
          generated_at?: string | null
          id?: string
          last_updated?: string | null
          plan_data: Json
          plan_type: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          adherence_score?: number | null
          ai_generated?: boolean | null
          created_at?: string | null
          generated_at?: string | null
          id?: string
          last_updated?: string | null
          plan_data?: Json
          plan_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_health_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      user_interests: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          interest: string
          metadata: Json | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          interest: string
          metadata?: Json | null
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          interest?: string
          metadata?: Json | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      user_journey: {
        Row: {
          created_at: string
          days_active: number
          engagement_score: number
          experience_level: string
          id: string
          last_active_at: string | null
          milestones: Json | null
          onboarding_stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_active?: number
          engagement_score?: number
          experience_level?: string
          id?: string
          last_active_at?: string | null
          milestones?: Json | null
          onboarding_stage?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_active?: number
          engagement_score?: number
          experience_level?: string
          id?: string
          last_active_at?: string | null
          milestones?: Json | null
          onboarding_stage?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_journey_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      user_match_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_type: Database["public"]["Enums"]["match_interaction_type"]
          metadata: Json | null
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_type: Database["public"]["Enums"]["match_interaction_type"]
          metadata?: Json | null
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_type?: Database["public"]["Enums"]["match_interaction_type"]
          metadata?: Json | null
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_matches: {
        Row: {
          compatibility_score: number | null
          conversation_started: boolean | null
          id: string
          is_active: boolean | null
          match_reason: string | null
          matched_at: string
          metadata: Json | null
          user_id_1: string
          user_id_2: string
        }
        Insert: {
          compatibility_score?: number | null
          conversation_started?: boolean | null
          id?: string
          is_active?: boolean | null
          match_reason?: string | null
          matched_at?: string
          metadata?: Json | null
          user_id_1: string
          user_id_2: string
        }
        Update: {
          compatibility_score?: number | null
          conversation_started?: boolean | null
          id?: string
          is_active?: boolean | null
          match_reason?: string | null
          matched_at?: string
          metadata?: Json | null
          user_id_1?: string
          user_id_2?: string
        }
        Relationships: []
      }
      user_memory_metadata: {
        Row: {
          category_progress: Json | null
          created_at: string
          id: string
          last_ai_sync_at: string | null
          total_memories_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_progress?: Json | null
          created_at?: string
          id?: string
          last_ai_sync_at?: string | null
          total_memories_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_progress?: Json | null
          created_at?: string
          id?: string
          last_ai_sync_at?: string | null
          total_memories_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_memory_metadata_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          community_notifications: boolean
          created_at: string
          dnd_enabled: boolean
          dnd_end_time: string | null
          dnd_start_time: string | null
          health_notifications: boolean
          live_room_notifications: boolean
          match_notifications: boolean
          memory_notifications: boolean
          muted_threads: string[] | null
          push_enabled: boolean
          recommendation_notifications: boolean
          social_notifications: boolean
          system_notifications: boolean
          task_notifications: boolean
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          community_notifications?: boolean
          created_at?: string
          dnd_enabled?: boolean
          dnd_end_time?: string | null
          dnd_start_time?: string | null
          health_notifications?: boolean
          live_room_notifications?: boolean
          match_notifications?: boolean
          memory_notifications?: boolean
          muted_threads?: string[] | null
          push_enabled?: boolean
          recommendation_notifications?: boolean
          social_notifications?: boolean
          system_notifications?: boolean
          task_notifications?: boolean
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          community_notifications?: boolean
          created_at?: string
          dnd_enabled?: boolean
          dnd_end_time?: string | null
          dnd_start_time?: string | null
          health_notifications?: boolean
          live_room_notifications?: boolean
          match_notifications?: boolean
          memory_notifications?: boolean
          muted_threads?: string[] | null
          push_enabled?: boolean
          recommendation_notifications?: boolean
          social_notifications?: boolean
          system_notifications?: boolean
          task_notifications?: boolean
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string | null
          channel: string
          created_at: string
          data: Json | null
          id: string
          priority: string
          push_sent_at: string | null
          read_at: string | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          channel?: string
          created_at?: string
          data?: Json | null
          id?: string
          priority?: string
          push_sent_at?: string | null
          read_at?: string | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string
          data?: Json | null
          id?: string
          priority?: string
          push_sent_at?: string | null
          read_at?: string | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          ai_model: string | null
          ai_response_length: string | null
          ai_temperature: number | null
          auto_delete_recordings_days: number | null
          auto_greeting_enabled: boolean | null
          autopilot_categories: Json | null
          autopilot_enabled: boolean | null
          autopilot_max_actions_per_day: number | null
          autopilot_priority_filter: string | null
          autopilot_quiet_hours_end: string | null
          autopilot_quiet_hours_start: string | null
          created_at: string | null
          greeting_frequency: string | null
          greeting_message_types: Json | null
          id: string
          interests: string[] | null
          shorts_filtering_enabled: boolean | null
          store_voice_recordings: boolean | null
          stt_auto_punctuation: boolean | null
          stt_instant_enabled: boolean | null
          stt_language: string | null
          stt_sensitivity: number | null
          tts_character: string | null
          tts_gender: string | null
          tts_pitch: number | null
          tts_speed: number | null
          tts_voice: string | null
          tts_volume: number | null
          updated_at: string | null
          user_id: string
          wellness_goals: string[] | null
        }
        Insert: {
          ai_model?: string | null
          ai_response_length?: string | null
          ai_temperature?: number | null
          auto_delete_recordings_days?: number | null
          auto_greeting_enabled?: boolean | null
          autopilot_categories?: Json | null
          autopilot_enabled?: boolean | null
          autopilot_max_actions_per_day?: number | null
          autopilot_priority_filter?: string | null
          autopilot_quiet_hours_end?: string | null
          autopilot_quiet_hours_start?: string | null
          created_at?: string | null
          greeting_frequency?: string | null
          greeting_message_types?: Json | null
          id?: string
          interests?: string[] | null
          shorts_filtering_enabled?: boolean | null
          store_voice_recordings?: boolean | null
          stt_auto_punctuation?: boolean | null
          stt_instant_enabled?: boolean | null
          stt_language?: string | null
          stt_sensitivity?: number | null
          tts_character?: string | null
          tts_gender?: string | null
          tts_pitch?: number | null
          tts_speed?: number | null
          tts_voice?: string | null
          tts_volume?: number | null
          updated_at?: string | null
          user_id: string
          wellness_goals?: string[] | null
        }
        Update: {
          ai_model?: string | null
          ai_response_length?: string | null
          ai_temperature?: number | null
          auto_delete_recordings_days?: number | null
          auto_greeting_enabled?: boolean | null
          autopilot_categories?: Json | null
          autopilot_enabled?: boolean | null
          autopilot_max_actions_per_day?: number | null
          autopilot_priority_filter?: string | null
          autopilot_quiet_hours_end?: string | null
          autopilot_quiet_hours_start?: string | null
          created_at?: string | null
          greeting_frequency?: string | null
          greeting_message_types?: Json | null
          id?: string
          interests?: string[] | null
          shorts_filtering_enabled?: boolean | null
          store_voice_recordings?: boolean | null
          stt_auto_punctuation?: boolean | null
          stt_instant_enabled?: boolean | null
          stt_language?: string | null
          stt_sensitivity?: number | null
          tts_character?: string | null
          tts_gender?: string | null
          tts_pitch?: number | null
          tts_speed?: number | null
          tts_voice?: string | null
          tts_volume?: number | null
          updated_at?: string | null
          user_id?: string
          wellness_goals?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          is_enabled: boolean
          role: Database["public"]["Enums"]["vitana_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          is_enabled?: boolean
          role: Database["public"]["Enums"]["vitana_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          is_enabled?: boolean
          role?: Database["public"]["Enums"]["vitana_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      user_supplements: {
        Row: {
          category: string
          created_at: string
          dosage: string | null
          frequency: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          dosage?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          dosage?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_tenants: {
        Row: {
          active_role: string
          created_at: string
          id: string
          is_primary: boolean
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_role?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_role?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_tenants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_tenants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["app_user_id"]
          },
        ]
      }
      user_wallets: {
        Row: {
          balance: number
          created_at: string | null
          currency_type: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          currency_type: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          currency_type?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_wellness_interests: {
        Row: {
          interests: string[]
          looking_for: string[] | null
          preferred_activity_time: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          interests?: string[]
          looking_for?: string[] | null
          preferred_activity_time?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          interests?: string[]
          looking_for?: string[] | null
          preferred_activity_time?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_wellness_interests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      video_metadata: {
        Row: {
          has_captions: boolean | null
          media_id: string
          resolution: string | null
          topic: string | null
          video_type: string | null
        }
        Insert: {
          has_captions?: boolean | null
          media_id: string
          resolution?: string | null
          topic?: string | null
          video_type?: string | null
        }
        Update: {
          has_captions?: boolean | null
          media_id?: string
          resolution?: string | null
          topic?: string | null
          video_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_metadata_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: true
            referencedRelation: "media_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vitana_index_config: {
        Row: {
          algorithm_weights: Json | null
          created_at: string | null
          created_by: string | null
          display_preferences: Json | null
          id: string
          is_active: boolean | null
          scoring_tiers: Json | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          algorithm_weights?: Json | null
          created_at?: string | null
          created_by?: string | null
          display_preferences?: Json | null
          id?: string
          is_active?: boolean | null
          scoring_tiers?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          algorithm_weights?: Json | null
          created_at?: string | null
          created_by?: string | null
          display_preferences?: Json | null
          id?: string
          is_active?: boolean | null
          scoring_tiers?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vitana_index_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      vitana_index_scores: {
        Row: {
          created_at: string | null
          date: string
          id: string
          model_version: string | null
          provenance: Json | null
          score_exercise: number | null
          score_hydration: number | null
          score_mental: number | null
          score_nutrition: number | null
          score_sleep: number | null
          score_total: number
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          model_version?: string | null
          provenance?: Json | null
          score_exercise?: number | null
          score_hydration?: number | null
          score_mental?: number | null
          score_nutrition?: number | null
          score_sleep?: number | null
          score_total: number
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          model_version?: string | null
          provenance?: Json | null
          score_exercise?: number | null
          score_hydration?: number | null
          score_mental?: number | null
          score_nutrition?: number | null
          score_sleep?: number | null
          score_total?: number
          tenant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      voucher_orders: {
        Row: {
          amount_cents: number
          buyer_email: string
          buyer_name: string | null
          buyer_user_id: string | null
          checkout_session_id: string | null
          created_at: string
          currency: string
          id: string
          payment_intent_id: string | null
          pdf_path: string | null
          provider: string
          status: string
          tenant_id: string
          updated_at: string
          voucher_id: string
        }
        Insert: {
          amount_cents: number
          buyer_email: string
          buyer_name?: string | null
          buyer_user_id?: string | null
          checkout_session_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_intent_id?: string | null
          pdf_path?: string | null
          provider?: string
          status?: string
          tenant_id: string
          updated_at?: string
          voucher_id: string
        }
        Update: {
          amount_cents?: number
          buyer_email?: string
          buyer_name?: string | null
          buyer_user_id?: string | null
          checkout_session_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_intent_id?: string | null
          pdf_path?: string | null
          provider?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "voucher_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "voucher_orders_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_redemptions: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          id: string
          reason: string | null
          staff_user_id: string
          status: string
          tenant_id: string
          voucher_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          id?: string
          reason?: string | null
          staff_user_id: string
          status: string
          tenant_id: string
          voucher_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          id?: string
          reason?: string | null
          staff_user_id?: string
          status?: string
          tenant_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_redemptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "voucher_redemptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "voucher_redemptions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          code: string | null
          created_at: string
          expires_at: string
          id: string
          redeemed_at: string | null
          redeemed_by_staff_id: string | null
          redeemed_by_user_id: string | null
          redeemed_event_id: string | null
          status: string
          tenant_id: string
          tier: string
          type: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          expires_at: string
          id?: string
          redeemed_at?: string | null
          redeemed_by_staff_id?: string | null
          redeemed_by_user_id?: string | null
          redeemed_event_id?: string | null
          status?: string
          tenant_id: string
          tier: string
          type?: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          redeemed_at?: string | null
          redeemed_by_staff_id?: string | null
          redeemed_by_user_id?: string | null
          redeemed_event_id?: string | null
          status?: string
          tenant_id?: string
          tier?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_redeemed_by_user_id_fkey"
            columns: ["redeemed_by_user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "vouchers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "vouchers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      vtid_ledger: {
        Row: {
          assigned_to: string
          claim_expires_at: string | null
          claim_started_at: string | null
          claimed_by: string | null
          completed_at: string | null
          created_at: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          is_terminal: boolean | null
          is_test: boolean
          layer: string
          metadata: Json
          module: string
          parent_vtid: string | null
          spec_approved_at: string | null
          spec_approved_by: string | null
          spec_approved_hash: string | null
          spec_current_hash: string | null
          spec_current_id: string | null
          spec_last_error: string | null
          spec_status: string
          status: string
          summary: string | null
          task_family: string
          task_module: string
          task_type: string
          tenant: string
          terminal_outcome: string | null
          title: string | null
          updated_at: string | null
          voided_at: string | null
          voided_reason: string | null
          vtid: string
        }
        Insert: {
          assigned_to?: string
          claim_expires_at?: string | null
          claim_started_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_terminal?: boolean | null
          is_test?: boolean
          layer: string
          metadata?: Json
          module: string
          parent_vtid?: string | null
          spec_approved_at?: string | null
          spec_approved_by?: string | null
          spec_approved_hash?: string | null
          spec_current_hash?: string | null
          spec_current_id?: string | null
          spec_last_error?: string | null
          spec_status?: string
          status: string
          summary?: string | null
          task_family?: string
          task_module?: string
          task_type?: string
          tenant?: string
          terminal_outcome?: string | null
          title?: string | null
          updated_at?: string | null
          voided_at?: string | null
          voided_reason?: string | null
          vtid: string
        }
        Update: {
          assigned_to?: string
          claim_expires_at?: string | null
          claim_started_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_terminal?: boolean | null
          is_test?: boolean
          layer?: string
          metadata?: Json
          module?: string
          parent_vtid?: string | null
          spec_approved_at?: string | null
          spec_approved_by?: string | null
          spec_approved_hash?: string | null
          spec_current_hash?: string | null
          spec_current_id?: string | null
          spec_last_error?: string | null
          spec_status?: string
          status?: string
          summary?: string | null
          task_family?: string
          task_module?: string
          task_type?: string
          tenant?: string
          terminal_outcome?: string | null
          title?: string | null
          updated_at?: string | null
          voided_at?: string | null
          voided_reason?: string | null
          vtid?: string
        }
        Relationships: []
      }
      wallet_credits: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          tenant_id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          tenant_id: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          tenant_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_credits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "wallet_credits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "wallet_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          exchange_rate: number | null
          fees: number | null
          from_currency: string | null
          from_user_id: string | null
          id: string
          metadata: Json | null
          status: string | null
          to_currency: string | null
          to_user_id: string | null
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          exchange_rate?: number | null
          fees?: number | null
          from_currency?: string | null
          from_user_id?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          to_currency?: string | null
          to_user_id?: string | null
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          exchange_rate?: number | null
          fees?: number | null
          from_currency?: string | null
          from_user_id?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          to_currency?: string | null
          to_user_id?: string | null
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      wearable_samples: {
        Row: {
          id: string
          metric: string | null
          provider: string | null
          raw_json: Json | null
          tenant_id: string
          ts: string
          unit: string | null
          user_id: string
          value: number
        }
        Insert: {
          id?: string
          metric?: string | null
          provider?: string | null
          raw_json?: Json | null
          tenant_id: string
          ts: string
          unit?: string | null
          user_id: string
          value: number
        }
        Update: {
          id?: string
          metric?: string | null
          provider?: string | null
          raw_json?: Json | null
          tenant_id?: string
          ts?: string
          unit?: string | null
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      worker_registry: {
        Row: {
          capabilities: string[] | null
          created_at: string | null
          current_vtid: string | null
          id: string
          last_heartbeat_at: string | null
          max_concurrent: number | null
          metadata: Json | null
          registered_at: string | null
          status: string | null
          updated_at: string | null
          version: string | null
          worker_id: string
        }
        Insert: {
          capabilities?: string[] | null
          created_at?: string | null
          current_vtid?: string | null
          id?: string
          last_heartbeat_at?: string | null
          max_concurrent?: number | null
          metadata?: Json | null
          registered_at?: string | null
          status?: string | null
          updated_at?: string | null
          version?: string | null
          worker_id: string
        }
        Update: {
          capabilities?: string[] | null
          created_at?: string | null
          current_vtid?: string | null
          id?: string
          last_heartbeat_at?: string | null
          max_concurrent?: number | null
          metadata?: Json | null
          registered_at?: string | null
          status?: string | null
          updated_at?: string | null
          version?: string | null
          worker_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_system_health: {
        Row: {
          active_memberships: number | null
          total_global_messages: number | null
          total_global_threads: number | null
          total_memberships: number | null
          total_messages: number | null
          total_tenants: number | null
          total_threads: number | null
        }
        Relationships: []
      }
      admin_tenant_analytics: {
        Row: {
          active_users: number | null
          admin_count: number | null
          patient_count: number | null
          professional_count: number | null
          staff_count: number | null
          tenant_id: string | null
          tenant_name: string | null
          tenant_slug: string | null
          total_users: number | null
        }
        Relationships: []
      }
      admin_user_analytics: {
        Row: {
          active_users_24h: number | null
          active_users_7d: number | null
          new_users_30d: number | null
          new_users_7d: number | null
          total_users: number | null
        }
        Relationships: []
      }
      commandhub_board_visible: {
        Row: {
          is_terminal: boolean | null
          status: string | null
          terminal_outcome: string | null
          updated_at: string | null
          vtid: string | null
        }
        Insert: {
          is_terminal?: boolean | null
          status?: string | null
          terminal_outcome?: string | null
          updated_at?: string | null
          vtid?: string | null
        }
        Update: {
          is_terminal?: boolean | null
          status?: string | null
          terminal_outcome?: string | null
          updated_at?: string | null
          vtid?: string | null
        }
        Relationships: []
      }
      live_rooms_public: {
        Row: {
          access_level: string | null
          created_at: string | null
          ends_at: string | null
          host_user_id: string | null
          id: string | null
          metadata: Json | null
          starts_at: string | null
          status: string | null
          tenant_id: string | null
          title: string | null
          topic_keys: string[] | null
          updated_at: string | null
        }
        Insert: {
          access_level?: string | null
          created_at?: string | null
          ends_at?: string | null
          host_user_id?: string | null
          id?: string | null
          metadata?: never
          starts_at?: string | null
          status?: string | null
          tenant_id?: string | null
          title?: string | null
          topic_keys?: string[] | null
          updated_at?: string | null
        }
        Update: {
          access_level?: string | null
          created_at?: string | null
          ends_at?: string | null
          host_user_id?: string | null
          id?: string | null
          metadata?: never
          starts_at?: string | null
          status?: string | null
          tenant_id?: string | null
          title?: string | null
          topic_keys?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      popular_podcast_shows: {
        Row: {
          category: string | null
          episode_count: number | null
          host_name: string | null
          latest_episode_date: string | null
          show_name: string | null
          subscriber_count: number | null
        }
        Relationships: []
      }
      signup_funnel: {
        Row: {
          active_role: string | null
          app_user_id: string | null
          attempt_id: string | null
          attempt_status: string | null
          auth_created_at: string | null
          auth_user_id: string | null
          completed_at: string | null
          display_name: string | null
          email: string | null
          email_confirmed_at: string | null
          funnel_stage: string | null
          is_primary: boolean | null
          last_sign_in_at: string | null
          membership_created_at: string | null
          metadata: Json | null
          profile_created_at: string | null
          started_at: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_users_user_id_fkey"
            columns: ["app_user_id"]
            isOneToOne: true
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "signup_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_analytics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "signup_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      user_follow_counts: {
        Row: {
          followers_count: number | null
          following_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "signup_funnel"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      vtid_specs: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string | null
          spec_hash: string | null
          spec_markdown: string | null
          status: string | null
          title: string | null
          version: number | null
          vtid: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          spec_hash?: string | null
          spec_markdown?: string | null
          status?: string | null
          title?: string | null
          version?: number | null
          vtid?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          spec_hash?: string | null
          spec_markdown?: string | null
          status?: string | null
          title?: string | null
          version?: number | null
          vtid?: string | null
        }
        Relationships: []
      }
      VtidLedger: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string | null
          is_test: boolean | null
          layer: string | null
          metadata: Json | null
          module: string | null
          parent_vtid: string | null
          status: string | null
          summary: string | null
          task_family: string | null
          task_module: string | null
          task_type: string | null
          tenant: string | null
          title: string | null
          updated_at: string | null
          voided_at: string | null
          voided_reason: string | null
          vtid: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string | null
          is_test?: boolean | null
          layer?: string | null
          metadata?: Json | null
          module?: string | null
          parent_vtid?: string | null
          status?: string | null
          summary?: string | null
          task_family?: string | null
          task_module?: string | null
          task_type?: string | null
          tenant?: string | null
          title?: string | null
          updated_at?: string | null
          voided_at?: string | null
          voided_reason?: string | null
          vtid?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string | null
          is_test?: boolean | null
          layer?: string | null
          metadata?: Json | null
          module?: string | null
          parent_vtid?: string | null
          status?: string | null
          summary?: string | null
          task_family?: string | null
          task_module?: string | null
          task_type?: string | null
          tenant?: string | null
          title?: string | null
          updated_at?: string | null
          voided_at?: string | null
          voided_reason?: string | null
          vtid?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_autopilot_recommendation: {
        Args: { p_recommendation_id: string; p_user_id?: string }
        Returns: Json
      }
      allocate_global_vtid: {
        Args: { p_layer?: string; p_module?: string; p_source?: string }
        Returns: {
          id: string
          num: number
          vtid: string
        }[]
      }
      archive_old_activity_logs: { Args: never; Returns: undefined }
      audit_access: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_object_id: string
          p_object_type: string
          p_reason?: string
        }
        Returns: undefined
      }
      bootstrap_admin_user: {
        Args: { p_user_email: string; p_user_id: string }
        Returns: undefined
      }
      check_phone_on_platform: {
        Args: { phone_number: string }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
        }[]
      }
      claim_vtid_task: {
        Args: {
          p_expires_minutes?: number
          p_vtid: string
          p_worker_id: string
        }
        Returns: Json
      }
      clean_expired_context_cache: { Args: never; Returns: undefined }
      clean_expired_memory: { Args: never; Returns: undefined }
      cleanup_abandoned_transactions: { Args: never; Returns: undefined }
      cleanup_old_presence_records: { Args: never; Returns: undefined }
      cleanup_old_typing_indicators: { Args: never; Returns: undefined }
      count_events_by_stage: {
        Args: { since_time?: string }
        Returns: {
          count: number
          task_stage: string
        }[]
      }
      create_global_direct_thread: {
        Args: { p_recipient_id: string }
        Returns: string
      }
      create_or_get_global_dm: {
        Args: { p_other_user: string }
        Returns: {
          thread_id: string
        }[]
      }
      create_tenant_direct_thread: {
        Args: { p_recipient_id: string; p_tenant_id: string }
        Returns: string
      }
      create_vtid_atomic: {
        Args: {
          p_family: string
          p_is_test?: boolean
          p_metadata?: Json
          p_module: string
          p_status?: string
          p_summary?: string
          p_tenant?: string
          p_title: string
        }
        Returns: {
          created_at: string
          id: string
          layer: string
          module: string
          status: string
          tenant: string
          title: string
          vtid: string
        }[]
      }
      current_active_role: { Args: never; Returns: string }
      current_tenant: { Args: never; Returns: string }
      current_tenant_id: { Args: never; Returns: string }
      current_user_id: { Args: never; Returns: string }
      decrypt_api_key: { Args: { encrypted_key_text: string }; Returns: string }
      dev_bootstrap_request_context: {
        Args: { p_active_role: string; p_tenant_id: string }
        Returns: Json
      }
      dev_set_request_context:
        | {
            Args: { p_active_role: string; p_tenant_id: string }
            Returns: Json
          }
        | {
            Args: {
              p_active_role: string
              p_tenant_id: string
              p_user_id: string
            }
            Returns: Json
          }
      encrypt_api_key: { Args: { api_key_text: string }; Returns: string }
      expire_stale_vtid_claims: { Args: never; Returns: number }
      follow_user: { Args: { target_user_id: string }; Returns: Json }
      generate_discount_code: { Args: { prefix?: string }; Returns: string }
      generate_event_slug: {
        Args: { event_id?: string; event_title: string }
        Returns: string
      }
      generate_ticket_number: { Args: never; Returns: string }
      generate_unique_handle: {
        Args: {
          p_display_name?: string
          p_email?: string
          p_full_name?: string
        }
        Returns: string
      }
      generate_voucher_code: { Args: never; Returns: string }
      get_active_role: { Args: never; Returns: string }
      get_active_thread_messages: {
        Args: { p_limit?: number; p_thread_id: string }
        Returns: {
          channel: string
          content: string
          created_at: string
          id: string
          metadata: Json
          role: string
          tenant_id: string
          thread_id: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "conversation_messages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_active_users_count: { Args: { hours_ago?: number }; Returns: number }
      get_autopilot_recommendations: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_status?: string[]
          p_user_id?: string
        }
        Returns: {
          activated_at: string
          activated_vtid: string
          created_at: string
          domain: string
          effort_score: number
          id: string
          impact_score: number
          risk_level: string
          status: string
          summary: string
          title: string
        }[]
      }
      get_autopilot_recommendations_count: {
        Args: { p_user_id?: string }
        Returns: number
      }
      get_conversation_participants: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          email: string
          full_name: string
          last_message_at: string
          phone: string
          user_id: string
        }[]
      }
      get_current_facts: {
        Args: {
          p_entity?: string
          p_fact_keys?: string[]
          p_tenant_id: string
          p_user_id: string
        }
        Returns: {
          entity: string
          extracted_at: string
          fact_key: string
          fact_value: string
          fact_value_type: string
          id: string
          provenance_confidence: number
          provenance_source: string
        }[]
      }
      get_follow_status: { Args: { target_user_id: string }; Returns: boolean }
      get_live_room_summary: { Args: { p_live_room_id: string }; Returns: Json }
      get_message_reactions: {
        Args: { message_id_param: string }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          emoji: string
          message_id: string
          user_id: string
        }[]
      }
      get_message_reactions_text: {
        Args: { message_id_param: string }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          emoji: string
          message_id: string
          user_id: string
        }[]
      }
      get_minimal_profiles_by_ids: {
        Args: { user_ids: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
        }[]
      }
      get_minimal_profiles_by_ids_text: {
        Args: { user_ids: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
        }[]
      }
      get_next_spec_version: { Args: { p_vtid: string }; Returns: number }
      get_pending_worker_tasks: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          layer: string
          module: string
          status: string
          summary: string
          title: string
          updated_at: string
          vtid: string
        }[]
      }
      get_public_campaign_details: {
        Args: { campaign_id: string }
        Returns: {
          cover_image_url: string
          created_at: string
          description: string
          end_date: string
          id: string
          metadata: Json
          name: string
          owner_avatar: string
          owner_id: string
          owner_name: string
          start_date: string
          status: string
          target_channels: Json
        }[]
      }
      get_public_event_details: {
        Args: { event_id: string }
        Returns: {
          description: string
          end_time: string
          event_type: string
          has_tickets: boolean
          id: string
          image_url: string
          is_paid_event: boolean
          location: string
          lowest_ticket_price: number
          max_participants: number
          metadata: Json
          organizer_avatar: string
          organizer_name: string
          participant_count: number
          start_time: string
          title: string
        }[]
      }
      get_recent_admin_activity: {
        Args: { limit_count?: number }
        Returns: {
          created_at: string
          event_data: Json
          event_type: string
          id: string
          user_email: string
          user_id: string
        }[]
      }
      get_recent_test_failures: {
        Args: never
        Returns: {
          error_count: number
          integration_name: string
          latest_error: string
          latest_timestamp: string
        }[]
      }
      get_role_preference: {
        Args: { p_tenant_id: string }
        Returns: {
          role: string
        }[]
      }
      get_system_health: {
        Args: never
        Returns: {
          metric: string
          status: string
          value: string
        }[]
      }
      get_thread_participants: {
        Args: { context_param?: string; thread_id_param: string }
        Returns: {
          avatar_url: string
          display_name: string
          joined_at: string
          last_read_at: string
          role: string
          user_id: string
        }[]
      }
      get_thread_participants_text: {
        Args: { context_param?: string; thread_id_param: string }
        Returns: {
          avatar_url: string
          display_name: string
          joined_at: string
          last_read_at: string
          role: string
          user_id: string
        }[]
      }
      get_thread_summary: {
        Args: { p_summary_type?: string; p_thread_id: string }
        Returns: {
          covers_turns_to: number
          generated_at: string
          summary_text: string
          version: number
        }[]
      }
      get_ticket_by_qr_token: {
        Args: { token: string }
        Returns: {
          buyer_email: string
          buyer_name: string
          checked_in_at: string
          event_id: string
          event_image_url: string
          event_location: string
          event_start_time: string
          event_title: string
          id: string
          quantity: number
          status: string
          ticket_number: string
          ticket_type_name: string
        }[]
      }
      get_unread_match_count: { Args: { p_user_id: string }; Returns: number }
      get_user_admin_status: {
        Args: { tenant_id_param: string; user_id_param: string }
        Returns: boolean
      }
      get_user_balance: {
        Args: { currency_param: string; user_id_param: string }
        Returns: number
      }
      get_user_follow_counts: { Args: { user_id_param: string }; Returns: Json }
      get_user_growth_trend: {
        Args: never
        Returns: {
          date: string
          new_users: number
          total_users: number
        }[]
      }
      get_user_profile_by_identifier: {
        Args: { identifier: string }
        Returns: {
          avatar_url: string
          bio: string
          cover_url: string
          created_at: string
          display_name: string
          email: string
          facebook_bio: string
          facebook_interests: string[]
          facebook_synced_at: string
          facebook_url: string
          full_name: string
          handle: string
          instagram_bio: string
          instagram_followers_count: number
          instagram_interests: string[]
          instagram_synced_at: string
          instagram_url: string
          linkedin_headline: string
          linkedin_summary: string
          linkedin_synced_at: string
          linkedin_url: string
          location: string
          tiktok_bio: string
          tiktok_content_themes: string[]
          tiktok_followers_count: number
          tiktok_synced_at: string
          tiktok_url: string
          user_id: string
          x_bio: string
          x_followers_count: number
          x_synced_at: string
          x_topics: string[]
          x_url: string
          youtube_content_categories: string[]
          youtube_description: string
          youtube_subscribers_count: number
          youtube_synced_at: string
          youtube_url: string
        }[]
      }
      get_user_stripe_account: {
        Args: { p_user_id: string }
        Returns: {
          stripe_account_id: string
          stripe_charges_enabled: boolean
        }[]
      }
      get_user_stripe_status: {
        Args: never
        Returns: {
          stripe_account_id: string
          stripe_charges_enabled: boolean
          stripe_onboarded_at: string
          stripe_payouts_enabled: boolean
        }[]
      }
      get_worker_connector_stats: { Args: never; Returns: Json }
      has_active_consent: {
        Args: {
          p_data_scope: string
          p_grantee_id: string
          p_grantee_type: string
          p_user_id: string
        }
        Returns: boolean
      }
      has_active_relationship: {
        Args: {
          p_object_id: string
          p_object_type: string
          p_relationship_type: string
          p_subject_id: string
          p_subject_type: string
        }
        Returns: boolean
      }
      health_compute_features_daily: { Args: { p_date: string }; Returns: Json }
      health_compute_vitana_index: {
        Args: { p_date: string; p_model_version?: string }
        Returns: Json
      }
      health_generate_recommendations: {
        Args: { p_from: string; p_model_version?: string; p_to: string }
        Returns: Json
      }
      health_get_summary: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      health_ingest_lab_report: { Args: { p_payload: Json }; Returns: Json }
      health_ingest_wearable_samples: {
        Args: { p_payload: Json }
        Returns: Json
      }
      increment_thread_turn: {
        Args: { p_tenant_id: string; p_thread_id: string; p_user_id: string }
        Returns: number
      }
      increment_wallet_balance: {
        Args: { p_amount: number; p_currency_type: string; p_user_id: string }
        Returns: number
      }
      initialize_user_wallet: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      is_community_user: { Args: never; Returns: boolean }
      is_exafy_admin: { Args: { user_id_param: string }; Returns: boolean }
      is_group_admin: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_participant_of_global_thread: {
        Args: { thread_id_param: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      is_tenant_scoped_user: { Args: never; Returns: boolean }
      list_roles_for_active_tenant: {
        Args: { p_tenant_id: string }
        Returns: {
          role: string
        }[]
      }
      live_add_highlight: {
        Args: { p_live_room_id: string; p_text: string; p_type: string }
        Returns: Json
      }
      live_room_admit_all: { Args: { p_room_id: string }; Returns: Json }
      live_room_admit_user: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: Json
      }
      live_room_ban_user: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: Json
      }
      live_room_check_access:
        | { Args: { p_room_id: string; p_user_id: string }; Returns: boolean }
        | {
            Args: { p_room_id: string; p_tenant_id: string; p_user_id: string }
            Returns: boolean
          }
      live_room_create: { Args: { p_payload: Json }; Returns: Json }
      live_room_create_session: {
        Args: { p_payload: Json; p_room_id: string }
        Returns: Json
      }
      live_room_disconnect: { Args: { p_room_id: string }; Returns: Json }
      live_room_end: { Args: { p_live_room_id: string }; Returns: Json }
      live_room_end_session: { Args: { p_room_id: string }; Returns: Json }
      live_room_get: {
        Args: { p_live_room_id: string }
        Returns: {
          access_level: string
          created_at: string
          ends_at: string
          host_user_id: string
          id: string
          metadata: Json
          starts_at: string
          status: string
          tenant_id: string
          title: string
          topic_keys: string[]
          updated_at: string
        }[]
      }
      live_room_get_counts: { Args: { p_session_id: string }; Returns: Json }
      live_room_get_lobby: { Args: { p_room_id: string }; Returns: Json }
      live_room_get_paid_grants: {
        Args: { p_session_id: string }
        Returns: Json
      }
      live_room_get_sessions: { Args: { p_room_id: string }; Returns: Json }
      live_room_get_state: {
        Args: { p_room_id: string; p_user_id?: string }
        Returns: Json
      }
      live_room_grant_access: {
        Args: {
          p_access_type: string
          p_room_id: string
          p_stripe_payment_intent_id?: string
          p_user_id: string
        }
        Returns: string
      }
      live_room_invalidate_all_grants: {
        Args: { p_room_id: string }
        Returns: number
      }
      live_room_invalidate_session_grants: {
        Args: { p_session_id: string }
        Returns: Json
      }
      live_room_join: { Args: { p_live_room_id: string }; Returns: Json }
      live_room_join_session: {
        Args: { p_room_id: string; p_session_id: string }
        Returns: Json
      }
      live_room_kick_user: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: Json
      }
      live_room_leave: { Args: { p_live_room_id: string }; Returns: Json }
      live_room_reject_user: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: Json
      }
      live_room_revoke_access: {
        Args: { p_grant_id: string; p_reason: string }
        Returns: boolean
      }
      live_room_set_host_present: {
        Args: { p_present: boolean; p_room_id: string }
        Returns: Json
      }
      live_room_start: { Args: { p_live_room_id: string }; Returns: Json }
      live_room_transition_status: {
        Args: {
          p_expected_old_status: string
          p_new_status: string
          p_room_id: string
        }
        Returns: Json
      }
      live_room_update_grant_refund: {
        Args: {
          p_grant_id: string
          p_refund_id?: string
          p_refund_status: string
        }
        Returns: Json
      }
      live_room_update_metadata: {
        Args: { p_live_room_id: string; p_metadata: Json }
        Returns: boolean
      }
      live_room_update_room_name: {
        Args: {
          p_cover_image_url?: string
          p_description?: string
          p_name?: string
          p_room_id: string
          p_slug?: string
        }
        Returns: Json
      }
      match_memories: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_user_id?: string
          query_embedding: string
        }
        Returns: {
          confidence_score: number
          content: string
          created_at: string
          id: string
          memory_type: string
          metadata: Json
          similarity: number
          user_id: string
        }[]
      }
      match_memories_v2: {
        Args: {
          p_domain: string
          p_limit?: number
          p_module: string
          p_query_embedding: string
          p_query_text?: string
          p_threshold?: number
          p_user_id: string
        }
        Returns: {
          fact_payload: Json
          memory_id: string
          similarity: number
          summary_text: string
        }[]
      }
      me_context: { Args: never; Returns: Json }
      me_set_active_role: { Args: { p_role: string }; Returns: Json }
      me_tenant_id: { Args: { p_user_id: string }; Returns: string }
      meetup_rsvp: {
        Args: { p_meetup_id: string; p_status: string }
        Returns: Json
      }
      memory_add_diary_entry: {
        Args: {
          p_energy_level?: number
          p_entry_date: string
          p_entry_type: string
          p_mood?: string
          p_raw_text: string
          p_tags?: string[]
        }
        Returns: Json
      }
      memory_extract_garden_nodes: {
        Args: { p_diary_entry_id: string }
        Returns: Json
      }
      memory_facts_needing_embeddings: {
        Args: { p_batch_size?: number; p_tenant_id?: string }
        Returns: {
          entity: string
          fact_key: string
          fact_value: string
          id: string
          tenant_id: string
          user_id: string
        }[]
      }
      memory_facts_semantic_search: {
        Args: {
          p_entity?: string
          p_min_confidence?: number
          p_query_embedding: string
          p_tenant_id?: string
          p_top_k?: number
          p_user_id?: string
        }
        Returns: {
          entity: string
          extracted_at: string
          fact_key: string
          fact_value: string
          fact_value_type: string
          id: string
          provenance_confidence: number
          provenance_source: string
          similarity_score: number
        }[]
      }
      memory_garden_node_upsert: {
        Args: {
          p_confidence: number
          p_domain: string
          p_node_type: string
          p_seen_date: string
          p_source: string
          p_summary: string
          p_tenant_id: string
          p_title: string
          p_user_id: string
        }
        Returns: {
          id: string
          is_new: boolean
        }[]
      }
      memory_get_context: {
        Args: { p_categories?: string[]; p_limit?: number; p_since?: string }
        Returns: Json
      }
      memory_get_diary_entries: {
        Args: { p_from?: string; p_limit?: number; p_to?: string }
        Returns: Json
      }
      memory_get_garden_summary: { Args: never; Returns: Json }
      memory_get_items_needing_embeddings: {
        Args: {
          p_category_key?: string
          p_limit?: number
          p_since?: string
          p_tenant_id?: string
        }
        Returns: {
          category_key: string
          content: string
          created_at: string
          id: string
          tenant_id: string
          user_id: string
        }[]
      }
      memory_mark_for_reembed: {
        Args: {
          p_category_key?: string
          p_since?: string
          p_tenant_id?: string
          p_until?: string
          p_user_id?: string
        }
        Returns: Json
      }
      memory_semantic_search: {
        Args: {
          p_active_role?: string
          p_categories?: string[]
          p_max_age_hours?: number
          p_query_embedding: string
          p_recency_boost?: boolean
          p_tenant_id?: string
          p_top_k?: number
          p_user_id?: string
          p_visibility_scope?: string
          p_workspace_scope?: string
        }
        Returns: {
          active_role: string
          category_key: string
          combined_score: number
          content: string
          content_json: Json
          conversation_id: string
          created_at: string
          id: string
          importance: number
          occurred_at: string
          origin_service: string
          recency_score: number
          similarity_score: number
          source: string
          visibility_scope: string
          vtid: string
          workspace_scope: string
        }[]
      }
      memory_update_embeddings: { Args: { p_updates: Json }; Returns: Json }
      memory_write_item: { Args: { p_payload: Json }; Returns: Json }
      next_vtid: {
        Args: { p_family: string; p_module: string }
        Returns: string
      }
      oasis_events_cleanup: {
        Args: { retention_days?: number }
        Returns: number
      }
      process_wallet_exchange: {
        Args: {
          p_amount: number
          p_exchange_rate: number
          p_from_currency: string
          p_to_currency: string
          p_user_id: string
        }
        Returns: {
          from_balance: number
          to_balance: number
          transaction_id: string
        }[]
      }
      process_wallet_exchange_and_send: {
        Args: {
          p_amount: number
          p_exchange_rate: number
          p_from_currency: string
          p_from_user_id: string
          p_to_currency: string
          p_to_user_id: string
        }
        Returns: {
          exchange_transaction_id: string
          from_balance: number
          net_converted_amount: number
          to_balance: number
          transfer_transaction_id: string
        }[]
      }
      process_wallet_transfer: {
        Args: {
          p_amount: number
          p_currency: string
          p_from_user_id: string
          p_to_user_id: string
        }
        Returns: {
          from_balance: number
          to_balance: number
          transaction_id: string
        }[]
      }
      redeem_voucher: {
        Args: {
          p_device_id?: string
          p_event_id: string
          p_staff_user_id: string
          p_tenant_id: string
          p_voucher_id: string
        }
        Returns: Json
      }
      reject_autopilot_recommendation: {
        Args: { p_reason?: string; p_recommendation_id: string }
        Returns: Json
      }
      relationship_ensure_node: {
        Args: {
          p_domain?: string
          p_metadata?: Json
          p_node_type: string
          p_ref_id?: string
          p_title: string
        }
        Returns: Json
      }
      release_vtid_claim: {
        Args: { p_reason?: string; p_vtid: string; p_worker_id: string }
        Returns: Json
      }
      resolve_event_by_slug: {
        Args: { identifier: string }
        Returns: {
          description: string
          end_time: string
          event_type: string
          has_tickets: boolean
          id: string
          image_url: string
          is_paid_event: boolean
          is_sold_out: boolean
          location: string
          lowest_ticket_price: number
          max_participants: number
          metadata: Json
          organizer_avatar: string
          organizer_name: string
          participant_count: number
          slug: string
          start_time: string
          title: string
        }[]
      }
      resolve_tenant_for_user: { Args: { p_user_id: string }; Returns: string }
      resolve_thread_id: {
        Args: {
          p_active_role?: string
          p_provided_thread_id?: string
          p_session_timeout_hours?: number
          p_tenant_id: string
          p_user_id: string
        }
        Returns: {
          is_new: boolean
          resumed: boolean
          thread_id: string
          turn_count: number
        }[]
      }
      rpc_board_list_scheduled: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          is_test: boolean
          status: string
          summary: string
          task_family: string
          task_type: string
          tenant: string
          title: string
          updated_at: string
          vtid: string
        }[]
      }
      search_global_directory: {
        Args: { search_term: string }
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          email: string
          full_name: string
          user_id: string
        }[]
      }
      search_knowledge_docs: {
        Args: { max_results?: number; search_query: string }
        Returns: {
          id: string
          path: string
          score: number
          snippet: string
          source_type: string
          tags: string[]
          title: string
        }[]
      }
      search_minimal_profiles_text: {
        Args: { search_query: string; search_scope?: string }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
        }[]
      }
      search_tenant_directory: {
        Args: { search_term: string; tenant_id_param: string }
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          email: string
          full_name: string
          user_id: string
        }[]
      }
      set_active_role: { Args: { p_role: string }; Returns: Json }
      set_role_preference: {
        Args: { p_role: string; p_tenant_id: string }
        Returns: undefined
      }
      snooze_autopilot_recommendation: {
        Args: { p_hours?: number; p_recommendation_id: string }
        Returns: Json
      }
      switch_to_tenant_by_slug: {
        Args: { p_tenant_slug: string }
        Returns: undefined
      }
      toggle_message_reaction: {
        Args: { emoji_param: string; message_id_param: string }
        Returns: boolean
      }
      toggle_message_reaction_text: {
        Args: { emoji_param: string; message_id_param: string }
        Returns: boolean
      }
      unfollow_user: { Args: { target_user_id: string }; Returns: Json }
      update_api_metrics: {
        Args: { p_integration_id: string }
        Returns: undefined
      }
      update_package_with_items: {
        Args: {
          p_billing_interval?: string
          p_description?: string
          p_duration_weeks?: number
          p_image_url?: string
          p_items?: Json
          p_original_price_cents?: number
          p_package_id: string
          p_package_type?: string
          p_price_cents?: number
          p_status?: string
          p_tenant_id: string
          p_title: string
          p_validity_days?: number
        }
        Returns: string
      }
      update_user_balance: {
        Args: {
          amount_param: number
          currency_param: string
          operation?: string
          user_id_param: string
        }
        Returns: number
      }
      update_user_stripe_account: {
        Args: { p_stripe_account_id: string }
        Returns: undefined
      }
      update_user_stripe_status: {
        Args: {
          p_charges_enabled: boolean
          p_payouts_enabled: boolean
          p_stripe_account_id: string
        }
        Returns: undefined
      }
      upsert_knowledge_doc: {
        Args: {
          p_content: string
          p_path: string
          p_source_type?: string
          p_tags?: string[]
          p_title: string
        }
        Returns: string
      }
      upsert_relationship_edge: {
        Args: {
          p_edge_type: string
          p_metadata?: Json
          p_source_id: string
          p_source_type: string
          p_strength_delta: number
          p_target_id: string
          p_target_type: string
          p_tenant_id: string
        }
        Returns: Json
      }
      validate_role_assignment: {
        Args: { p_role: string; p_tenant_id: string; p_user_id: string }
        Returns: boolean
      }
      worker_heartbeat: {
        Args: { p_active_vtid?: string; p_worker_id: string }
        Returns: Json
      }
      write_fact: {
        Args: {
          p_entity?: string
          p_fact_key: string
          p_fact_value: string
          p_fact_value_type?: string
          p_provenance_confidence?: number
          p_provenance_source?: string
          p_provenance_utterance_id?: string
          p_tenant_id: string
          p_thread_id?: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      channel_type:
        | "email"
        | "sms"
        | "whatsapp"
        | "push"
        | "slack"
        | "discord"
        | "telegram"
      collection_method: "home_kit" | "lab_facility"
      health_processing_status: "uploaded" | "processing" | "parsed" | "failed"
      health_report_type:
        | "blood_panel"
        | "genomics"
        | "metabolomics"
        | "microbiome"
        | "allergy"
        | "cancer"
        | "hormones"
        | "imaging"
        | "other"
      lab_test_category:
        | "blood_markers"
        | "genomics"
        | "microbiome"
        | "metabolomics"
        | "allergy"
        | "cancer"
        | "specialized"
      match_interaction_type: "like" | "pass" | "block" | "report"
      memory_scope:
        | "PERSONAL"
        | "ROLE_PRIVATE"
        | "RELATIONSHIP"
        | "COMMUNITY"
        | "SYSTEM"
      memory_sensitivity:
        | "general"
        | "health"
        | "genomic"
        | "financial"
        | "private"
      notification_type:
        | "test_results"
        | "appointment_reminder"
        | "test_reminder"
        | "critical_alert"
        | "follow"
        | "new_message"
        | "new_group_message"
      order_status:
        | "pending"
        | "confirmed"
        | "sample_collected"
        | "processing"
        | "completed"
        | "cancelled"
      post_status: "draft" | "scheduled" | "published" | "failed"
      tenant_role:
        | "community"
        | "patient"
        | "professional"
        | "reseller"
        | "staff"
        | "admin"
      vitana_role:
        | "community"
        | "patient"
        | "professional"
        | "staff"
        | "admin"
        | "developer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      channel_type: [
        "email",
        "sms",
        "whatsapp",
        "push",
        "slack",
        "discord",
        "telegram",
      ],
      collection_method: ["home_kit", "lab_facility"],
      health_processing_status: ["uploaded", "processing", "parsed", "failed"],
      health_report_type: [
        "blood_panel",
        "genomics",
        "metabolomics",
        "microbiome",
        "allergy",
        "cancer",
        "hormones",
        "imaging",
        "other",
      ],
      lab_test_category: [
        "blood_markers",
        "genomics",
        "microbiome",
        "metabolomics",
        "allergy",
        "cancer",
        "specialized",
      ],
      match_interaction_type: ["like", "pass", "block", "report"],
      memory_scope: [
        "PERSONAL",
        "ROLE_PRIVATE",
        "RELATIONSHIP",
        "COMMUNITY",
        "SYSTEM",
      ],
      memory_sensitivity: [
        "general",
        "health",
        "genomic",
        "financial",
        "private",
      ],
      notification_type: [
        "test_results",
        "appointment_reminder",
        "test_reminder",
        "critical_alert",
        "follow",
        "new_message",
        "new_group_message",
      ],
      order_status: [
        "pending",
        "confirmed",
        "sample_collected",
        "processing",
        "completed",
        "cancelled",
      ],
      post_status: ["draft", "scheduled", "published", "failed"],
      tenant_role: [
        "community",
        "patient",
        "professional",
        "reseller",
        "staff",
        "admin",
      ],
      vitana_role: [
        "community",
        "patient",
        "professional",
        "staff",
        "admin",
        "developer",
      ],
    },
  },
} as const
