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
          created_at: string | null
          role: Database["public"]["Enums"]["tenant_role"]
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role?: Database["public"]["Enums"]["tenant_role"]
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: Database["public"]["Enums"]["tenant_role"]
          status?: string
          tenant_id?: string
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
      messages: {
        Row: {
          body: string
          created_at: string | null
          id: string
          recipient_id: string | null
          sender_id: string
          tenant_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          recipient_id?: string | null
          sender_id: string
          tenant_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          recipient_id?: string | null
          sender_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          created_at: string
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string | null
          id: string
          medical_conditions: string[] | null
          medications: string[] | null
          phone: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          id?: string
          medical_conditions?: string[] | null
          medications?: string[] | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
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
      tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_admin_user: {
        Args: { user_email: string; user_id: string }
        Returns: undefined
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
      tenant_role:
        | "community"
        | "patient"
        | "professional"
        | "staff"
        | "admin"
        | "exafy_admin"
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
      tenant_role: [
        "community",
        "patient",
        "professional",
        "staff",
        "admin",
        "exafy_admin",
      ],
    },
  },
} as const
