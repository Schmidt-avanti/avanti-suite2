
// Update UserRole type to match database constraint
export type UserRole = 'admin' | 'agent' | 'customer' | 'supervisor';

// Define TaskActivityAction type that was missing
export type TaskActivityAction = 'open' | 'close' | 'status_change' | 'assign' | 'comment';

// Add to existing types
export interface TaskTime {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  created_at: string;
}

export interface TaskTimeSummary {
  task_id: string;
  user_id: string;
  total_seconds: number;
  total_hours: number;
  session_count: number;
}

// Adding email thread interface
export interface EmailThread {
  id: string;
  task_id: string;
  subject: string | null;
  direction: 'inbound' | 'outbound';
  sender: string;
  recipient: string;
  content: string;
  attachments?: string[];
  created_at: string;
  thread_id?: string | null;
  reply_to_id?: string | null;
  message_id?: string | null;
}

// Existing types (to fix build errors)
export type TaskStatus = 'new' | 'in_progress' | 'followup' | 'completed' | 'cancelled' | 'forwarded' | 'waiting_for_customer';

export interface Task {
  id: string;
  title: string;
  description?: string; // Was present in DB schema
  status: TaskStatus;
  created_at: string;
  updated_at: string; // Added, from DB schema, to be used for 'closed_at'
  source?: string;
  readable_id?: string;
  customer_id: string; // Was present in DB schema and already added
  customer?: Customer; // Populated by useTaskDetail, now using the full Customer type
  created_by?: string; // User ID, was present in DB schema and already added
  creator?: { // Populated by useTaskDetail
    id: string;
    "Full Name": string;
  };
  assigned_to?: string; // User ID, was present in DB schema and already added
  assignee?: { // Populated by useTaskDetail
    id: string;
    "Full Name": string;
  };
  follow_up_date?: string; // Was present in DB schema
  closing_comment?: string; // Was present in DB schema
  attachments?: any[]; // Type 'jsonb' in DB, 'any[]' is a reasonable approximation for now
  endkunde_id?: string; // Was present in DB schema
  endkunde_email?: string; // Was present in DB schema
  // from_email is not in the DB schema for 'tasks' table
  matched_use_case_id?: string; // Was present in DB schema
  match_confidence?: number; // Was present in DB schema (double precision)
  match_reasoning?: string; // Was present in DB schema
  source_email_id?: string; // Was present in DB schema (uuid)
  forwarded_to?: string; // Was present in DB schema
  processed_no_use_case?: boolean; // Was present in DB schema
  total_duration_seconds?: number; // Was present in DB schema (integer)
  // total_time_seconds is a duplicate of total_duration_seconds in the DB schema, using one.
  is_blank_task?: boolean; // Flag für Blanko-Aufgabe ohne Ava-Unterstützung
  matched_use_case_title?: string | null; // Added for displaying in TaskDetailInfo
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  fullName?: string; 
  "Full Name": string; // Required to match Task.creator and Task.assignee structure
}

export interface Contact {
  id: string; // Assuming contacts might have IDs if stored separately
  type: string; // e.g., 'phone', 'email', 'mobile'
  value: string; // The actual phone number or email address
  label?: string; // e.g., 'Work', 'Home', 'Main'
  is_primary?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  branch?: string;
  created_at: string;
  is_active?: boolean;
  cost_center?: string;
  billing_email?: string;
  billing_address?: string;
  contact_person?: string;
  avanti_email?: string; // Add this field for the custom email
  
  // Adding the missing properties that were causing TypeScript errors
  street?: string;
  zip?: string;
  city?: string;
  email?: string;
  industry?: string;
  has_invoice_address?: boolean;
  invoice_street?: string;
  invoice_zip?: string;
  invoice_city?: string;
  phone?: string; // Made optional as it might not exist in DB or not always be queried
  contacts?: Contact[] | null; // Made optional as it's not queried directly anymore
  additional_info?: any; // Added to support dynamic metadata for use cases
}

export type Notification = {
  id: string;
  user_id: string;
  message: string;
  task_id?: string;
  created_at: string;
  read_at: string | null;
};

export interface PaymentMethod {
  id: string;
  user_id: string;
  type: 'paypal' | 'creditcard';
  value: string;
  created_at: string;
  updated_at: string;
  last_used: string | null;
  active: boolean;
  customer_id?: string;
  card_holder?: string;
  expiry_month?: number;
  expiry_year?: number;
  billing_address?: string;
  billing_zip?: string;
  billing_city?: string;
}

export interface Endkunde {
  id: string;
  name: string; // Composite of Vorname and Nachname
  Vorname?: string; // Raw field from DB
  Nachname?: string; // Raw field from DB
  created_at: string;
}

export interface DetailedTask extends Task {
  customer: Customer | null;
  creator: User | null;
  assignee: User | null;
  endkunde: Endkunde | null;
  // matched_use_case_title is inherited from Task
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  useCase?: any; 
}
