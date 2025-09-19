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
      global_community_events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_time: string | null
          event_type: string
          id: string
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
          full_name: string | null
          handle: string | null
          id: string
          medical_conditions: string[] | null
          medications: string[] | null
          phone: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
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
          full_name?: string | null
          handle?: string | null
          id?: string
          medical_conditions?: string[] | null
          medications?: string[] | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
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
          full_name?: string | null
          handle?: string | null
          id?: string
          medical_conditions?: string[] | null
          medications?: string[] | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_admin_user: {
        Args: { p_user_email: string; p_user_id: string }
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
      create_tenant_direct_thread: {
        Args: { p_recipient_id: string; p_tenant_id: string }
        Returns: string
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
      get_minimal_profiles_by_ids: {
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
      get_user_admin_status: {
        Args: { tenant_id_param: string; user_id_param: string }
        Returns: boolean
      }
      is_community_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_exafy_admin: {
        Args: { user_id_param: string }
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
      search_minimal_profiles: {
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
      validate_role_assignment: {
        Args: { p_role: string; p_tenant_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      collection_method: "home_kit" | "lab_facility"
      lab_test_category:
        | "blood_markers"
        | "genomics"
        | "microbiome"
        | "metabolomics"
        | "allergy"
        | "cancer"
        | "specialized"
      notification_type:
        | "test_results"
        | "appointment_reminder"
        | "test_reminder"
        | "critical_alert"
      order_status:
        | "pending"
        | "confirmed"
        | "sample_collected"
        | "processing"
        | "completed"
        | "cancelled"
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
      notification_type: [
        "test_results",
        "appointment_reminder",
        "test_reminder",
        "critical_alert",
      ],
      order_status: [
        "pending",
        "confirmed",
        "sample_collected",
        "processing",
        "completed",
        "cancelled",
      ],
      tenant_role: ["community", "patient", "professional", "staff", "admin"],
    },
  },
} as const
