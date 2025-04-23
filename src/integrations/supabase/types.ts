export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      customer_contacts: {
        Row: {
          created_at: string
          customer_id: string | null
          email: string | null
          id: string
          is_main: boolean | null
          name: string
          phone: string | null
          position: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          is_main?: boolean | null
          name: string
          phone?: string | null
          position?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          is_main?: boolean | null
          name?: string
          phone?: string | null
          position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tools: {
        Row: {
          created_at: string
          crm: string | null
          customer_id: string | null
          id: string
          knowledge_base: string | null
          task_management: string | null
        }
        Insert: {
          created_at?: string
          crm?: string | null
          customer_id?: string | null
          id?: string
          knowledge_base?: string | null
          task_management?: string | null
        }
        Update: {
          created_at?: string
          crm?: string | null
          customer_id?: string | null
          id?: string
          knowledge_base?: string | null
          task_management?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_tools_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          branch: string | null
          city: string | null
          created_at: string
          email: string | null
          has_invoice_address: boolean | null
          id: string
          industry: string | null
          invoice_city: string | null
          invoice_street: string | null
          invoice_zip: string | null
          is_active: boolean
          name: string
          street: string | null
          zip: string | null
        }
        Insert: {
          branch?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          has_invoice_address?: boolean | null
          id?: string
          industry?: string | null
          invoice_city?: string | null
          invoice_street?: string | null
          invoice_zip?: string | null
          is_active?: boolean
          name: string
          street?: string | null
          zip?: string | null
        }
        Update: {
          branch?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          has_invoice_address?: boolean | null
          id?: string
          industry?: string | null
          invoice_city?: string | null
          invoice_street?: string | null
          invoice_zip?: string | null
          is_active?: boolean
          name?: string
          street?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      inbound_emails: {
        Row: {
          attachments: Json | null
          body_html: string | null
          body_text: string | null
          from_email: string
          from_name: string | null
          id: string
          message_id: string | null
          processed: boolean
          raw_headers: string | null
          received_at: string
          subject: string | null
          to_emails: string[]
        }
        Insert: {
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          from_email: string
          from_name?: string | null
          id?: string
          message_id?: string | null
          processed?: boolean
          raw_headers?: string | null
          received_at?: string
          subject?: string | null
          to_emails: string[]
        }
        Update: {
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          from_email?: string
          from_name?: string | null
          id?: string
          message_id?: string | null
          processed?: boolean
          raw_headers?: string | null
          received_at?: string
          subject?: string | null
          to_emails?: string[]
        }
        Relationships: []
      }
      knowledge_articles: {
        Row: {
          content: string
          created_at: string
          created_by: string
          customer_id: string
          id: string
          is_active: boolean
          metadata: Json | null
          response_id: string | null
          title: string
          updated_at: string
          use_case_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          customer_id: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          response_id?: string | null
          title: string
          updated_at?: string
          use_case_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          customer_id?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          response_id?: string | null
          title?: string
          updated_at?: string
          use_case_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_articles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_articles_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          "Full Name": string
          id: string
          is_active: boolean
          role: string
        }
        Insert: {
          created_at?: string
          "Full Name": string
          id: string
          is_active?: boolean
          role: string
        }
        Update: {
          created_at?: string
          "Full Name"?: string
          id?: string
          is_active?: boolean
          role?: string
        }
        Relationships: []
      }
      prompt_templates: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      task_activities: {
        Row: {
          action: string
          id: string
          status_from: string | null
          status_to: string | null
          task_id: string
          timestamp: string
          user_id: string
        }
        Insert: {
          action: string
          id?: string
          status_from?: string | null
          status_to?: string | null
          task_id: string
          timestamp?: string
          user_id: string
        }
        Update: {
          action?: string
          id?: string
          status_from?: string | null
          status_to?: string | null
          task_id?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activities_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_messages: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          role: string
          task_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          role: string
          task_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          role?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          customer_id: string
          description: string
          id: string
          match_confidence: number | null
          match_reasoning: string | null
          matched_use_case_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          customer_id: string
          description: string
          id?: string
          match_confidence?: number | null
          match_reasoning?: string | null
          matched_use_case_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string
          description?: string
          id?: string
          match_confidence?: number | null
          match_reasoning?: string | null
          matched_use_case_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_matched_use_case_id_fkey"
            columns: ["matched_use_case_id"]
            isOneToOne: false
            referencedRelation: "use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      use_cases: {
        Row: {
          chat_response: Json | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          decision_logic: Json[] | null
          embedding: string | null
          expected_result: string | null
          id: string
          information_needed: string | null
          is_active: boolean | null
          next_question: string | null
          process_map: Json[] | null
          steps: string | null
          title: string
          type: string | null
          typical_activities: string | null
          updated_at: string | null
        }
        Insert: {
          chat_response?: Json | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          decision_logic?: Json[] | null
          embedding?: string | null
          expected_result?: string | null
          id?: string
          information_needed?: string | null
          is_active?: boolean | null
          next_question?: string | null
          process_map?: Json[] | null
          steps?: string | null
          title: string
          type?: string | null
          typical_activities?: string | null
          updated_at?: string | null
        }
        Update: {
          chat_response?: Json | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          decision_logic?: Json[] | null
          embedding?: string | null
          expected_result?: string | null
          id?: string
          information_needed?: string | null
          is_active?: boolean | null
          next_question?: string | null
          process_map?: Json[] | null
          steps?: string | null
          title?: string
          type?: string | null
          typical_activities?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "use_cases_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_customer_assignments: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_customer_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_customer_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_accounts: {
        Row: {
          api_key: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          name: string | null
          pphone_number: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          name?: string | null
          pphone_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          name?: string | null
          pphone_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_chats: {
        Row: {
          account_id: string
          contact_name: string
          contact_number: string
          created_at: string
          id: string
          last_message: string | null
          last_message_time: string | null
          unread_count: number | null
          updated_at: string
        }
        Insert: {
          account_id: string
          contact_name: string
          contact_number: string
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_time?: string | null
          unread_count?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          contact_name?: string
          contact_number?: string
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_time?: string | null
          unread_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_chats_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_inbound_webhooks: {
        Row: {
          body: string
          from_number: string
          id: string
          timestamp: string
        }
        Insert: {
          body: string
          from_number: string
          id?: string
          timestamp?: string
        }
        Update: {
          body?: string
          from_number?: string
          id?: string
          timestamp?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          chat_id: string
          content: string
          id: string
          is_from_me: boolean
          read_at: string | null
          sent_at: string
        }
        Insert: {
          chat_id: string
          content: string
          id?: string
          is_from_me?: boolean
          read_at?: string | null
          sent_at?: string
        }
        Update: {
          chat_id?: string
          content?: string
          id?: string
          is_from_me?: boolean
          read_at?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_chats"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      create_chat_session: {
        Args: { chat_id_param: string; user_id_param: string }
        Returns: undefined
      }
      generate_embedding: {
        Args: { input_text: string }
        Returns: string
      }
      get_chat_session: {
        Args: { chat_id_param: string }
        Returns: {
          user_id: string
        }[]
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      match_email_to_customer: {
        Args: { email_address: string }
        Returns: string
      }
      match_similar_use_cases: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          title: string
          type: string
          information_needed: string
          steps: string
          similarity: number
        }[]
      }
      release_chat_session: {
        Args: { chat_id_param: string; user_id_param: string }
        Returns: undefined
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      update_chat_session: {
        Args: { chat_id_param: string; user_id_param: string }
        Returns: undefined
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
