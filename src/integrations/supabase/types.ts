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
        Relationships: []
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
            referencedColumns: ["id"]
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
            referencedColumns: ["id"]
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
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
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
            referencedColumns: ["id"]
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
            referencedColumns: ["id"]
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
        Relationships: []
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
            referencedColumns: ["id"]
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        ]
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
        Relationships: []
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
            foreignKeyName: "event_co_creators_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "global_community_events"
            referencedColumns: ["id"]
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
          start_time: string
          title: string
          updated_at: string
          virtual_link: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
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
          start_time: string
          title: string
          updated_at?: string
          virtual_link?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
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
          start_time?: string
          title?: string
          updated_at?: string
          virtual_link?: string | null
        }
        Relationships: []
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
        ]
      }
      global_community_groups: {
        Row: {
          avatar_url: string | null
          category: string | null
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
        Relationships: []
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
      governance_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          severity: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          severity?: number | null
          tenant_id: string
        }
        Update: {
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
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          logic: Json
          name: string
          tenant_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logic: Json
          name: string
          tenant_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logic?: Json
          name?: string
          tenant_id?: string
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
        ]
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
        Relationships: []
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
        Relationships: []
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
          sender_id: string
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
          sender_id: string
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
          sender_id?: string
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
            referencedColumns: ["id"]
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
        Relationships: []
      }
      oasis_events: {
        Row: {
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
          tenant: string | null
          title: string | null
          topic: string
          vtid: string | null
        }
        Insert: {
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
          tenant?: string | null
          title?: string | null
          topic: string
          vtid?: string | null
        }
        Update: {
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
      oasis_tasks: {
        Row: {
          assignee: string | null
          created_at: string
          description: string | null
          id: number
          metadata: Json | null
          status: string
          title: string
          updated_at: string
          vtid: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string
          description?: string | null
          id?: number
          metadata?: Json | null
          status?: string
          title: string
          updated_at?: string
          vtid: string
        }
        Update: {
          assignee?: string | null
          created_at?: string
          description?: string | null
          id?: number
          metadata?: Json | null
          status?: string
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
            referencedColumns: ["id"]
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
            referencedColumns: ["id"]
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
            referencedColumns: ["id"]
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
        Relationships: []
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
        Relationships: []
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
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string | null
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
            referencedColumns: ["id"]
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      vtid_ledger: {
        Row: {
          created_at: string | null
          layer: string
          module: string
          status: string
          summary: string | null
          title: string | null
          updated_at: string | null
          vtid: string
        }
        Insert: {
          created_at?: string | null
          layer: string
          module: string
          status: string
          summary?: string | null
          title?: string | null
          updated_at?: string | null
          vtid: string
        }
        Update: {
          created_at?: string | null
          layer?: string
          module?: string
          status?: string
          summary?: string | null
          title?: string | null
          updated_at?: string | null
          vtid?: string
        }
        Relationships: []
      }
      VtidLedger: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          description_md: string | null
          environment: string | null
          id: string
          is_test: boolean
          last_event_at: string | null
          last_event_id: string | null
          layer: string
          metadata: Json | null
          module: string
          parent_vtid: string | null
          priority: string | null
          service: string | null
          status: string
          summary: string | null
          task_family: string
          task_module: string | null
          task_type: string | null
          tenant: string
          title: string
          updated_at: string
          vtid: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          description_md?: string | null
          environment?: string | null
          id: string
          is_test?: boolean
          last_event_at?: string | null
          last_event_id?: string | null
          layer: string
          metadata?: Json | null
          module: string
          parent_vtid?: string | null
          priority?: string | null
          service?: string | null
          status: string
          summary?: string | null
          task_family: string
          task_module?: string | null
          task_type?: string | null
          tenant: string
          title: string
          updated_at?: string
          vtid: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          description_md?: string | null
          environment?: string | null
          id?: string
          is_test?: boolean
          last_event_at?: string | null
          last_event_id?: string | null
          layer?: string
          metadata?: Json | null
          module?: string
          parent_vtid?: string | null
          priority?: string | null
          service?: string | null
          status?: string
          summary?: string | null
          task_family?: string
          task_module?: string | null
          task_type?: string | null
          tenant?: string
          title?: string
          updated_at?: string
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
            referencedColumns: ["id"]
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
      commandhub_board_api: {
        Row: {
          created_at: string | null
          is_test: boolean | null
          status: string | null
          summary: string | null
          task_family: string | null
          task_type: string | null
          tenant: string | null
          title: string | null
          updated_at: string | null
          vtid: string | null
        }
        Insert: {
          created_at?: string | null
          is_test?: boolean | null
          status?: string | null
          summary?: never
          task_family?: string | null
          task_type?: string | null
          tenant?: string | null
          title?: never
          updated_at?: string | null
          vtid?: string | null
        }
        Update: {
          created_at?: string | null
          is_test?: boolean | null
          status?: string | null
          summary?: never
          task_family?: string | null
          task_type?: string | null
          tenant?: string | null
          title?: never
          updated_at?: string | null
          vtid?: string | null
        }
        Relationships: []
      }
      commandhub_board_v1: {
        Row: {
          created_at: string | null
          is_test: boolean | null
          status: string | null
          summary: string | null
          task_family: string | null
          task_type: string | null
          tenant: string | null
          title: string | null
          updated_at: string | null
          vtid: string | null
        }
        Insert: {
          created_at?: string | null
          is_test?: boolean | null
          status?: string | null
          summary?: never
          task_family?: string | null
          task_type?: string | null
          tenant?: string | null
          title?: never
          updated_at?: string | null
          vtid?: string | null
        }
        Update: {
          created_at?: string | null
          is_test?: boolean | null
          status?: string | null
          summary?: never
          task_family?: string | null
          task_type?: string | null
          tenant?: string | null
          title?: never
          updated_at?: string | null
          vtid?: string | null
        }
        Relationships: []
      }
      commandhub_board_visible: {
        Row: {
          created_at: string | null
          is_test: boolean | null
          status: string | null
          summary: string | null
          task_family: string | null
          task_type: string | null
          tenant: string | null
          title: string | null
          updated_at: string | null
          vtid: string | null
        }
        Insert: {
          created_at?: string | null
          is_test?: boolean | null
          status?: string | null
          summary?: never
          task_family?: string | null
          task_type?: string | null
          tenant?: string | null
          title?: never
          updated_at?: string | null
          vtid?: string | null
        }
        Update: {
          created_at?: string | null
          is_test?: boolean | null
          status?: string | null
          summary?: never
          task_family?: string | null
          task_type?: string | null
          tenant?: string | null
          title?: never
          updated_at?: string | null
          vtid?: string | null
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
      user_follow_counts: {
        Row: {
          followers_count: number | null
          following_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      archive_old_activity_logs: { Args: never; Returns: undefined }
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
      clean_expired_context_cache: { Args: never; Returns: undefined }
      clean_expired_memory: { Args: never; Returns: undefined }
      cleanup_abandoned_transactions: { Args: never; Returns: undefined }
      cleanup_old_presence_records: { Args: never; Returns: undefined }
      cleanup_old_typing_indicators: { Args: never; Returns: undefined }
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
      current_tenant: { Args: never; Returns: string }
      decrypt_api_key: { Args: { encrypted_key_text: string }; Returns: string }
      encrypt_api_key: { Args: { api_key_text: string }; Returns: string }
      follow_user: { Args: { target_user_id: string }; Returns: Json }
      generate_unique_handle: {
        Args: {
          p_display_name?: string
          p_email?: string
          p_full_name?: string
        }
        Returns: string
      }
      get_active_users_count: { Args: { hours_ago?: number }; Returns: number }
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
      get_follow_status: { Args: { target_user_id: string }; Returns: boolean }
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
      get_public_campaign_details: {
        Args: { campaign_id: string }
        Returns: {
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
          id: string
          image_url: string
          location: string
          max_participants: number
          organizer_avatar: string
          organizer_id: string
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
      initialize_user_wallet: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      is_community_user: { Args: never; Returns: boolean }
      is_exafy_admin: { Args: { user_id_param: string }; Returns: boolean }
      is_participant_of_global_thread: {
        Args: { thread_id_param: string }
        Returns: boolean
      }
      is_tenant_scoped_user: { Args: never; Returns: boolean }
      list_roles_for_active_tenant: {
        Args: { p_tenant_id: string }
        Returns: {
          role: string
        }[]
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
      next_vtid: {
        Args: { p_family: string; p_module: string }
        Returns: string
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
      set_role_preference: {
        Args: { p_role: string; p_tenant_id: string }
        Returns: undefined
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
      update_user_balance: {
        Args: {
          amount_param: number
          currency_param: string
          operation?: string
          user_id_param: string
        }
        Returns: number
      }
      validate_role_assignment: {
        Args: { p_role: string; p_tenant_id: string; p_user_id: string }
        Returns: boolean
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
      lab_test_category:
        | "blood_markers"
        | "genomics"
        | "microbiome"
        | "metabolomics"
        | "allergy"
        | "cancer"
        | "specialized"
      match_interaction_type: "like" | "pass" | "block" | "report"
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
      tenant_role: "community" | "patient" | "professional" | "staff" | "admin"
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
      tenant_role: ["community", "patient", "professional", "staff", "admin"],
    },
  },
} as const
