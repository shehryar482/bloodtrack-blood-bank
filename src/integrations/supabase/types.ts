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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      blood_requests: {
        Row: {
          approval_mode: string | null
          approved_at: string | null
          approved_by: string | null
          archive_reason: string | null
          bed_no: string | null
          created_at: string
          id: string
          indication: string
          is_archived: boolean
          is_uncrossmatched: boolean
          patient_id: string
          request_code: string
          requesting_doctor: string
          required_by: string | null
          status: string
          updated_at: string
          urgency: string
          user_id: string
          ward_id: string | null
        }
        Insert: {
          approval_mode?: string | null
          approved_at?: string | null
          approved_by?: string | null
          archive_reason?: string | null
          bed_no?: string | null
          created_at?: string
          id?: string
          indication: string
          is_archived?: boolean
          is_uncrossmatched?: boolean
          patient_id: string
          request_code: string
          requesting_doctor: string
          required_by?: string | null
          status?: string
          updated_at?: string
          urgency?: string
          user_id?: string
          ward_id?: string | null
        }
        Update: {
          approval_mode?: string | null
          approved_at?: string | null
          approved_by?: string | null
          archive_reason?: string | null
          bed_no?: string | null
          created_at?: string
          id?: string
          indication?: string
          is_archived?: boolean
          is_uncrossmatched?: boolean
          patient_id?: string
          request_code?: string
          requesting_doctor?: string
          required_by?: string | null
          status?: string
          updated_at?: string
          urgency?: string
          user_id?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blood_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_requests_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_units: {
        Row: {
          abo_group: string
          collection_date: string
          component: string
          created_at: string
          discard_reason: string | null
          expiry_at: string
          id: string
          rh_d: string
          status: string
          storage_location: string | null
          unit_number: string
          updated_at: string
          user_id: string
          volume_ml: number | null
        }
        Insert: {
          abo_group: string
          collection_date: string
          component: string
          created_at?: string
          discard_reason?: string | null
          expiry_at: string
          id?: string
          rh_d: string
          status?: string
          storage_location?: string | null
          unit_number: string
          updated_at?: string
          user_id?: string
          volume_ml?: number | null
        }
        Update: {
          abo_group?: string
          collection_date?: string
          component?: string
          created_at?: string
          discard_reason?: string | null
          expiry_at?: string
          id?: string
          rh_d?: string
          status?: string
          storage_location?: string | null
          unit_number?: string
          updated_at?: string
          user_id?: string
          volume_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blood_units_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crossmatch_tests: {
        Row: {
          antibody_screen: string
          created_at: string
          id: string
          patient_abo: string | null
          patient_rh: string | null
          request_id: string
          result: string
          tested_at: string
          unit_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          antibody_screen?: string
          created_at?: string
          id?: string
          patient_abo?: string | null
          patient_rh?: string | null
          request_id: string
          result: string
          tested_at?: string
          unit_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          antibody_screen?: string
          created_at?: string
          id?: string
          patient_abo?: string | null
          patient_rh?: string | null
          request_id?: string
          result?: string
          tested_at?: string
          unit_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crossmatch_tests_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "blood_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crossmatch_tests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "blood_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crossmatch_tests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_records: {
        Row: {
          created_at: string
          crossmatch_id: string | null
          id: string
          issued_at: string
          issued_uncrossmatched: boolean
          received_by: string
          request_id: string
          unit_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crossmatch_id?: string | null
          id?: string
          issued_at?: string
          issued_uncrossmatched?: boolean
          received_by: string
          request_id: string
          unit_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          crossmatch_id?: string | null
          id?: string
          issued_at?: string
          issued_uncrossmatched?: boolean
          received_by?: string
          request_id?: string
          unit_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_records_crossmatch_id_fkey"
            columns: ["crossmatch_id"]
            isOneToOne: false
            referencedRelation: "crossmatch_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_records_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "blood_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_records_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: true
            referencedRelation: "blood_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          abo_group: string | null
          created_at: string
          date_of_birth: string | null
          father_or_husband_name: string | null
          full_name: string
          gender: string | null
          id: string
          mr_number: string
          rh_d: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          abo_group?: string | null
          created_at?: string
          date_of_birth?: string | null
          father_or_husband_name?: string | null
          full_name: string
          gender?: string | null
          id?: string
          mr_number: string
          rh_d?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          abo_group?: string | null
          created_at?: string
          date_of_birth?: string | null
          father_or_husband_name?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          mr_number?: string
          rh_d?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      request_items: {
        Row: {
          component: string
          created_at: string
          id: string
          quantity_issued: number
          quantity_requested: number
          request_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          component: string
          created_at?: string
          id?: string
          quantity_issued?: number
          quantity_requested: number
          request_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          component?: string
          created_at?: string
          id?: string
          quantity_issued?: number
          quantity_requested?: number
          request_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "blood_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wards: {
        Row: {
          created_at: string
          extension_no: string | null
          id: string
          updated_at: string
          user_id: string
          ward_code: string | null
          ward_name: string
        }
        Insert: {
          created_at?: string
          extension_no?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          ward_code?: string | null
          ward_name: string
        }
        Update: {
          created_at?: string
          extension_no?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          ward_code?: string | null
          ward_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "wards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
