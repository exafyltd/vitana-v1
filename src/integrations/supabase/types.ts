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
          description: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
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
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
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
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          user_id?: string
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
            referencedRelation: "tenants"
            referencedColumns: ["id"]
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
      diary_entries: {
        Row: {
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
          participant_count?: number
          start_time?: string
          title?: string
          updated_at?: string
          virtual_link?: string | null
        }
        Relationships: []
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
          name: string
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
          name: string
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
          name?: string
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
          id: string
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dnd_enabled?: boolean
          dnd_end_time?: string | null
          dnd_start_time?: string | null
          id?: string
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dnd_enabled?: boolean
          dnd_end_time?: string | null
          dnd_start_time?: string | null
          id?: string
          push_enabled?: boolean
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
      profiles: {
        Row: {
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
          handle: string | null
          id: string
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
          professional_skills: string[] | null
          tenant_id: string | null
          tiktok_bio: string | null
          tiktok_content_themes: string[] | null
          tiktok_followers_count: number | null
          tiktok_synced_at: string | null
          tiktok_url: string | null
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
          handle?: string | null
          id?: string
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
          professional_skills?: string[] | null
          tenant_id?: string | null
          tiktok_bio?: string | null
          tiktok_content_themes?: string[] | null
          tiktok_followers_count?: number | null
          tiktok_synced_at?: string | null
          tiktok_url?: string | null
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
          handle?: string | null
          id?: string
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
          professional_skills?: string[] | null
          tenant_id?: string | null
          tiktok_bio?: string | null
          tiktok_content_themes?: string[] | null
          tiktok_followers_count?: number | null
          tiktok_synced_at?: string | null
          tiktok_url?: string | null
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
            referencedRelation: "tenants"
            referencedColumns: ["id"]
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
      archive_old_activity_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      bootstrap_admin_user: {
        Args: { p_user_email: string; p_user_id: string }
        Returns: undefined
      }
      clean_expired_context_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      clean_expired_memory: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_abandoned_transactions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_presence_records: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_typing_indicators: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      decrypt_api_key: {
        Args: { encrypted_key_text: string }
        Returns: string
      }
      encrypt_api_key: {
        Args: { api_key_text: string }
        Returns: string
      }
      follow_user: {
        Args: { target_user_id: string }
        Returns: Json
      }
      generate_unique_handle: {
        Args: {
          p_display_name?: string
          p_email?: string
          p_full_name?: string
        }
        Returns: string
      }
      get_follow_status: {
        Args: { target_user_id: string }
        Returns: boolean
      }
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
      get_role_preference: {
        Args: { p_tenant_id: string }
        Returns: {
          role: string
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
      get_unread_match_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_admin_status: {
        Args: { tenant_id_param: string; user_id_param: string }
        Returns: boolean
      }
      get_user_balance: {
        Args: { currency_param: string; user_id_param: string }
        Returns: number
      }
      get_user_follow_counts: {
        Args: { user_id_param: string }
        Returns: Json
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
          full_name: string
          handle: string
          location: string
          user_id: string
        }[]
      }
      initialize_user_wallet: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      is_community_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_exafy_admin: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      is_participant_of_global_thread: {
        Args: { thread_id_param: string }
        Returns: boolean
      }
      is_tenant_scoped_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      list_roles_for_active_tenant: {
        Args: { p_tenant_id: string }
        Returns: {
          role: string
        }[]
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
      unfollow_user: {
        Args: { target_user_id: string }
        Returns: Json
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
