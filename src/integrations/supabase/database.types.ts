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
      call_sessions: {
        Row: {
          agent_id: string | null
          call_notes: string | null
          call_sid: string | null
          created_at: string | null
          customer_id: string | null
          direction: string
          duration_seconds: number | null
          ended_at: string | null
          endkunde_id: string | null
          endkunde_phone: string | null
          id: string
          recording_url: string | null
          started_at: string | null
          status: string
          task_id: string | null
          twilio_phone_number_id: string | null
        }
        Insert: {
          agent_id?: string | null
          call_notes?: string | null
          call_sid?: string | null
          created_at?: string | null
          customer_id?: string | null
          direction: string
          duration_seconds?: number | null
          ended_at?: string | null
          endkunde_id?: string | null
          endkunde_phone?: string | null
          id?: string
          recording_url?: string | null
          started_at?: string | null
          status: string
          task_id?: string | null
          twilio_phone_number_id?: string | null
        }
        Update: {
          agent_id?: string | null
          call_notes?: string | null
          call_sid?: string | null
          created_at?: string | null
          customer_id?: string | null
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          endkunde_id?: string | null
          endkunde_phone?: string | null
          id?: string
          recording_url?: string | null
          started_at?: string | null
          status?: string
          task_id?: string | null
          twilio_phone_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_endkunde_id_fkey"
            columns: ["endkunde_id"]
            isOneToOne: false
            referencedRelation: "endkunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_twilio_phone_number_id_fkey"
            columns: ["twilio_phone_number_id"]
            isOneToOne: false
            referencedRelation: "twilio_phone_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
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
      customer_products: {
        Row: {
          assigned_at: string | null
          customer_id: string
          id: string
          product_number: string
          product_version: number
        }
        Insert: {
          assigned_at?: string | null
          customer_id: string
          id?: string
          product_number: string
          product_version: number
        }
        Update: {
          assigned_at?: string | null
          customer_id?: string
          id?: string
          product_number?: string
          product_version?: number
        }
        Relationships: []
      }
      customer_task_counters: {
        Row: {
          current_count: number
          customer_id: string
          prefix: string
        }
        Insert: {
          current_count?: number
          customer_id: string
          prefix: string
        }
        Update: {
          current_count?: number
          customer_id?: string
          prefix?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_task_counters_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
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
          avanti_email: string | null
          billing_address: string | null
          billing_email: string | null
          branch: string | null
          city: string | null
          contact_person: string | null
          cost_center: string | null
          created_at: string
          csm_email: string | null
          email: string | null
          has_invoice_address: boolean | null
          id: string
          industry: string | null
          invoice_city: string | null
          invoice_street: string | null
          invoice_zip: string | null
          is_active: boolean
          is_schwungrad_by_csm_active: boolean | null
          name: string
          schwungrad_mail: string | null
          street: string | null
          zip: string | null
        }
        Insert: {
          avanti_email?: string | null
          billing_address?: string | null
          billing_email?: string | null
          branch?: string | null
          city?: string | null
          contact_person?: string | null
          cost_center?: string | null
          created_at?: string
          csm_email?: string | null
          email?: string | null
          has_invoice_address?: boolean | null
          id?: string
          industry?: string | null
          invoice_city?: string | null
          invoice_street?: string | null
          invoice_zip?: string | null
          is_active?: boolean
          is_schwungrad_by_csm_active?: boolean | null
          name: string
          schwungrad_mail?: string | null
          street?: string | null
          zip?: string | null
        }
        Update: {
          avanti_email?: string | null
          billing_address?: string | null
          billing_email?: string | null
          branch?: string | null
          city?: string | null
          contact_person?: string | null
          cost_center?: string | null
          created_at?: string
          csm_email?: string | null
          email?: string | null
          has_invoice_address?: boolean | null
          id?: string
          industry?: string | null
          invoice_city?: string | null
          invoice_street?: string | null
          invoice_zip?: string | null
          is_active?: boolean
          is_schwungrad_by_csm_active?: boolean | null
          name?: string
          schwungrad_mail?: string | null
          street?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      email_threads: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string
          direction: string
          id: string
          message_id: string | null
          recipient: string
          reply_to_id: string | null
          sender: string
          subject: string | null
          task_id: string
          thread_id: string | null
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string
          direction: string
          id?: string
          message_id?: string | null
          recipient: string
          reply_to_id?: string | null
          sender: string
          subject?: string | null
          task_id: string
          thread_id?: string | null
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string
          direction?: string
          id?: string
          message_id?: string | null
          recipient?: string
          reply_to_id?: string | null
          sender?: string
          subject?: string | null
          task_id?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_threads_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_threads_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      endkunden: {
        Row: {
          Adresse: string
          created_at: string
          customer_ID: string | null
          endkunden_contacts: string | null
          external_ID: string | null
          Gebäude: string | null
          id: string
          Lage: string | null
          Nachname: string
          Ort: string
          Postleitzahl: string
          Rufnummer: string | null
          updated_at: string
          Vorname: string | null
          Wohnung: string | null
        }
        Insert: {
          Adresse: string
          created_at?: string
          customer_ID?: string | null
          endkunden_contacts?: string | null
          external_ID?: string | null
          Gebäude?: string | null
          id?: string
          Lage?: string | null
          Nachname: string
          Ort: string
          Postleitzahl: string
          Rufnummer?: string | null
          updated_at?: string
          Vorname?: string | null
          Wohnung?: string | null
        }
        Update: {
          Adresse?: string
          created_at?: string
          customer_ID?: string | null
          endkunden_contacts?: string | null
          external_ID?: string | null
          Gebäude?: string | null
          id?: string
          Lage?: string | null
          Nachname?: string
          Ort?: string
          Postleitzahl?: string
          Rufnummer?: string | null
          updated_at?: string
          Vorname?: string | null
          Wohnung?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "endkunden_customer_ID_fkey"
            columns: ["customer_ID"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endkunden_endkunden_contacts_fkey"
            columns: ["endkunden_contacts"]
            isOneToOne: false
            referencedRelation: "endkunden_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      endkunden_contacts: {
        Row: {
          created_at: string
          customer_id: string | null
          email: string | null
          id: string
          name: string | null
          phone: string | null
          role: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_emails: {
        Row: {
          attachments: Json | null
          body_html: string | null
          body_text: string | null
          from_email: string
          from_name: string | null
          id: string
          in_reply_to: string | null
          message_id: string | null
          processed: boolean
          raw_headers: string | null
          received_at: string
          reference_ids: string | null
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
          in_reply_to?: string | null
          message_id?: string | null
          processed?: boolean
          raw_headers?: string | null
          received_at?: string
          reference_ids?: string | null
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
          in_reply_to?: string | null
          message_id?: string | null
          processed?: boolean
          raw_headers?: string | null
          received_at?: string
          reference_ids?: string | null
          subject?: string | null
          to_emails?: string[]
        }
        Relationships: []
      }
      knowledge_articles: {
        Row: {
          content: string
          created_at: string
        Insert: {
          content: string;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          title: string;
          use_case_id?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          title?: string;
          use_case_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "knowledge_articles_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "knowledge_articles_use_case_id_fkey";
            columns: ["use_case_id"];
            referencedRelation: "use_cases";
            referencedColumns: ["id"];
          },
        ];
      };
      opening_hours: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          organization_id: string;
          rules: Json;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          organization_id: string;
          rules: Json;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          organization_id?: string;
          rules?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "opening_hours_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      product_option_requirements: {
        Row: {
          option_id: string;
          required_product_id: string;
        };
        Insert: {
          option_id: string;
          required_product_id: string;
        };
        Update: {
          option_id?: string;
          required_product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_option_requirements_option_id_fkey";
            columns: ["option_id"];
            referencedRelation: "product_options";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_option_requirements_required_product_id_fkey";
            columns: ["required_product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_option_versions: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          is_latest: boolean;
          price_monthly: number;
          price_once: number;
          product_option_id: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          is_latest?: boolean;
          price_monthly: number;
          price_once: number;
          product_option_id: string;
          version: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          is_latest?: boolean;
          price_monthly?: number;
          price_once?: number;
          product_option_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_option_versions_product_option_id_fkey";
            columns: ["product_option_id"];
            referencedRelation: "product_options";
            referencedColumns: ["id"];
          },
        ];
      };
      product_options: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
          id: string;
          name: string;
          organization_id: string | null;
          product_id: string | null;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          name: string;
          organization_id?: string | null;
          product_id?: string | null;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          name?: string;
          organization_id?: string | null;
          product_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_organization";
            columns: ["organization_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_options_deleted_by_fkey";
            columns: ["deleted_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_options_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
          id: string;
          minutes: number;
          monthly_fee: number;
          name: string;
          opening_hours_id: string | null;
          organization_id: string;
          outbound_hours: number;
          product_number: string;
          setup_fee: number;
          status: string;
          valid_from: string | null;
          valid_to: string | null;
          version: number;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          minutes: number;
          monthly_fee: number;
          name: string;
          opening_hours_id?: string | null;
          organization_id: string;
          outbound_hours: number;
          product_number: string;
          setup_fee: number;
          status: string;
          valid_from?: string | null;
          valid_to?: string | null;
          version: number;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          minutes?: number;
          monthly_fee?: number;
          name?: string;
          opening_hours_id?: string | null;
          organization_id?: string;
          outbound_hours?: number;
          product_number?: string;
          setup_fee?: number;
          status?: string;
          valid_from?: string | null;
          valid_to?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "products_deleted_by_fkey";
            columns: ["deleted_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_opening_hours_id_fkey";
            columns: ["opening_hours_id"];
            referencedRelation: "opening_hours";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          "Full Name": string;
          created_at: string;
          id: string;
          is_active: boolean;
          organization_id: string | null;
          role: string;
        };
        Insert: {
          "Full Name": string;
          created_at?: string;
          id: string;
          is_active?: boolean;
          organization_id?: string | null;
          role: string;
        };
        Update: {
          "Full Name"?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          organization_id?: string | null;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          assigned_to: string | null;
          created_at: string;
          customer_id: string | null;
          description: string | null;
          endkunde_id: string | null;
          id: string;
          status: string;
          title: string;
        };
        Insert: {
          assigned_to?: string | null;
          created_at?: string;
          customer_id?: string | null;
          description?: string | null;
          endkunde_id?: string | null;
          id?: string;
          status?: string;
          title: string;
        };
        Update: {
          assigned_to?: string | null;
          created_at?: string;
          customer_id?: string | null;
          description?: string | null;
          endkunde_id?: string | null;
          id?: string;
          status?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey";
            columns: ["assigned_to"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
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
          previous_message_id: string | null
          role: string
          task_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          previous_message_id?: string | null
          role: string
          task_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          previous_message_id?: string | null
          role?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_messages_previous_message_id_fkey"
            columns: ["previous_message_id"]
            isOneToOne: false
            referencedRelation: "task_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_sessions: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          end_time: string | null
          id: string
          start_time: string
          task_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          start_time?: string
          task_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          start_time?: string
          task_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_times: {
        Row: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          session_type: string | null
          started_at: string
          task_id: string
          time_spent_task: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          session_type?: string | null
          started_at?: string
          task_id: string
          time_spent_task?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          session_type?: string | null
          started_at?: string
          task_id?: string
          time_spent_task?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_times_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_times_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      task_workflow_progress: {
        Row: {
          completed: boolean | null
          created_at: string
          id: string
          task_id: string
          updated_at: string
          use_case_id: string
          workflow_data: Json | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          use_case_id: string
          workflow_data?: Json | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          use_case_id?: string
          workflow_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "task_workflow_progress_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_workflow_progress_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          attachments: Json | null
          awaiting_customer_since: string | null
          closing_comment: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          description: string
          endkunde_email: string | null
          endkunde_id: string | null
          follow_up_date: string | null
          forwarded_to: string | null
          id: string
          is_blank_task: boolean | null
          last_reminder_sent_at: string | null
          match_confidence: number | null
          match_reasoning: string | null
          matched_use_case_id: string | null
          processed_no_use_case: boolean | null
          readable_id: string | null
          reminder_count: number
          source: string | null
          source_email_id: string | null
          status: string
          title: string
          total_duration_seconds: number | null
          total_time_seconds: number | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attachments?: Json | null
          awaiting_customer_since?: string | null
          closing_comment?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          description: string
          endkunde_email?: string | null
          endkunde_id?: string | null
          follow_up_date?: string | null
          forwarded_to?: string | null
          id?: string
          is_blank_task?: boolean | null
          last_reminder_sent_at?: string | null
          match_confidence?: number | null
          match_reasoning?: string | null
          matched_use_case_id?: string | null
          processed_no_use_case?: boolean | null
          readable_id?: string | null
          reminder_count?: number
          source?: string | null
          source_email_id?: string | null
          status?: string
          title: string
          total_duration_seconds?: number | null
          total_time_seconds?: number | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attachments?: Json | null
          awaiting_customer_since?: string | null
          closing_comment?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string
          endkunde_email?: string | null
          endkunde_id?: string | null
          follow_up_date?: string | null
          forwarded_to?: string | null
          id?: string
          is_blank_task?: boolean | null
          last_reminder_sent_at?: string | null
          match_confidence?: number | null
          match_reasoning?: string | null
          matched_use_case_id?: string | null
          processed_no_use_case?: boolean | null
          readable_id?: string | null
          reminder_count?: number
          source?: string | null
          source_email_id?: string | null
          status?: string
          title?: string
          total_duration_seconds?: number | null
          total_time_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "auth_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_endkunde_id_fkey"
            columns: ["endkunde_id"]
            isOneToOne: false
            referencedRelation: "endkunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_matched_use_case_id_fkey"
            columns: ["matched_use_case_id"]
            isOneToOne: false
            referencedRelation: "use_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_source_email_id_fkey"
            columns: ["source_email_id"]
            isOneToOne: false
            referencedRelation: "inbound_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      twilio_phone_numbers: {
        Row: {
          created_at: string
          customer_id: string
          friendly_name: string
          id: string
          phone_number: string
          status: string
          twilio_sid: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          friendly_name: string
          id?: string
          phone_number: string
          status?: string
          twilio_sid: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          friendly_name?: string
          id?: string
          phone_number?: string
          status?: string
          twilio_sid?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "twilio_phone_numbers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
          process_map: Json | null
          response_id: string | null
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
          process_map?: Json | null
          response_id?: string | null
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
          process_map?: Json | null
          response_id?: string | null
          steps?: string | null
          title?: string
          type?: string | null
          typical_activities?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "use_cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "use_cases_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_chats: {
        Row: {
          id: string
          message: string
          read_status: boolean
          receiver_id: string
          sender_id: string
          timestamp: string
        }
        Insert: {
          id?: string
          message: string
          read_status?: boolean
          receiver_id: string
          sender_id: string
          timestamp?: string
        }
        Update: {
          id?: string
          message?: string
          read_status?: boolean
          receiver_id?: string
          sender_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_chats_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "auth_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_chats_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "auth_users_view"
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
      user_reminders: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          remind_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          remind_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          remind_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          id: string
          last_seen: string
          user_id: string
        }
        Insert: {
          id?: string
          last_seen?: string
          user_id: string
        }
        Update: {
          id?: string
          last_seen?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "auth_users_view"
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
      whatsapp_chat_sessions: {
        Row: {
          chat_id: string
          last_activity: string
          user_id: string
        }
        Insert: {
          chat_id: string
          last_activity?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          last_activity?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_chat_sessions_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_users_view"
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
      workflow_deviations: {
        Row: {
          created_at: string
          created_by: string | null
          deviation_text: string
          id: string
          task_id: string
          use_case_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deviation_text: string
          id?: string
          task_id: string
          use_case_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deviation_text?: string
          id?: string
          task_id?: string
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_deviations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_deviations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_deviations_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      auth_users_view: {
        Row: {
          created_at: string | null
          email: string | null
          email_confirmed_at: string | null
          id: string | null
          last_sign_in_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          email_confirmed_at?: string | null
          id?: string | null
          last_sign_in_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          email_confirmed_at?: string | null
          id?: string | null
          last_sign_in_at?: string | null
        }
        Relationships: []
      }
      task_time_summary: {
        Row: {
          session_count: number | null
          task_id: string | null
          total_hours: number | null
          total_seconds: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_times_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_times_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_populate_profile_emails: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      calculate_completed_times_for_customer: {
        Args: {
          customer_id_param: string
          from_date_param: string
          to_date_param: string
        }
        Returns: {
          date_day: string
          total_minutes: number
        }[]
      }
      calculate_total_time_for_customer: {
        Args: {
          customer_id_param: string
          from_date_param: string
          to_date_param: string
        }
        Returns: number
      }
      create_chat_session: {
        Args: { chat_id_param: string; user_id_param: string }
        Returns: undefined
      }
      create_product_option_with_version: {
        Args:
          | {
              option_name: string
              description: string
              price_monthly: number
              price_once: number
            }
          | {
              option_name: string
              p_product_id: string
              version_description: string
              monthly_price: number
              once_price: number
            }
        Returns: {
          created_at: string
          id: string
          name: string
          product_id: string | null
        }
      }
      debug_customer_times: {
        Args: {
          customer_id_param: string
          from_date_param: string
          to_date_param: string
        }
        Returns: {
          task_id: string
          task_title: string
          started_at: string
          duration_seconds: number
          user_id: string
        }[]
      }
      delete_customer_cascade: {
        Args: { customer_id_param: string }
        Returns: undefined
      }
      delete_use_case_cascade: {
        Args: { use_case_id_param: string }
        Returns: undefined
      }
      generate_avanti_email: {
        Args: { customer_name: string }
        Returns: string
      }
      generate_customer_prefix: {
        Args: { customer_name: string }
        Returns: string
      }
      generate_embedding: {
        Args: { input_text: string }
        Returns: string
      }
      get_active_break_slots: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_available_break_minutes: {
        Args: { user_id_param: string }
        Returns: number
      }
      get_chat_session: {
        Args: { chat_id_param: string }
        Returns: {
          user_id: string
        }[]
      }
      get_system_settings: {
        Args: Record<PropertyKey, never>
        Returns: {
          key: string
          value: string
          description: string
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
      match_relevant_knowledge_articles: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
          customer_id_param: string
        }
        Returns: {
          id: string
          title: string
          content: string
          similarity: number
        }[]
      }
      match_similar_use_cases: {
        Args:
          | {
              query_embedding: string
              match_threshold: number
              match_count: number
            }
          | {
              query_embedding: string
              match_threshold: number
              match_count: number
              customer_id_param?: string
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
      refresh_session: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      user_has_customer_access: {
        Args: { customer_id_param: string }
        Returns: boolean
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
