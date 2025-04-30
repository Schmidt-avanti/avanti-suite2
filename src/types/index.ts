
export type TaskStatus = 'new' | 'in_progress' | 'blocked' | 'completed' | 'followup';
export type UserRole = 'admin' | 'agent' | 'client';
export type TaskActivityAction = 'open' | 'close' | 'status_change' | 'assign' | 'comment';

export interface Customer {
  id: string;
  name: string;
  email?: string;
  street?: string;
  city?: string;
  zip?: string;
  is_active?: boolean;
  created_at?: string;
  branch?: string;
  cost_center?: string;
  contact_person?: string;
  billing_address?: string;
  billing_email?: string;
  avanti_email?: string;
}

export interface Task {
  id: string;
  readable_id: string;
  created_at: string;
  title: string;
  description: string;
  status: TaskStatus;
  customer_id: string;
  customer?: Customer;
  created_by: string;
  creator?: {
    "Full Name": string;
    id?: string;
  };
  assigned_to: string;
  assignee?: {
    "Full Name": string;
    id?: string;
  };
  closing_comment: string | null;
  attachments: string[] | null;
  source: string | null;
  endkunde_id: string | null;
  endkunde_email: string | null;
  from_email?: string;
  matched_use_case_id?: string | null;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string;
  timestamp: string;
  action: TaskActivityAction;
  status_from: TaskStatus | null;
  status_to: TaskStatus | null;
}

export interface TaskMessage {
  id: string;
  created_at: string;
  task_id: string;
  content: string;
  role: 'user' | 'assistant';
  created_by: string;
}

export interface UseCase {
  id: string;
  title: string;
  description: string;
  customer_id: string;
  prompt: string;
  active: boolean;
}

export interface EmailThread {
  id: string;
  task_id: string;
  sender: string;
  recipient: string;
  subject?: string;
  content: string;
  attachments?: string[];
  created_at: string;
  direction: 'inbound' | 'outbound';
  reply_to_id?: string;
}

export interface Notification {
  id: string;
  message: string;
  user_id: string;
  task_id?: string;
  created_at: string;
  read_at?: string | null;
}

export interface PaymentMethod {
  id: string;
  type: 'paypal' | 'creditcard';  // Using string literals for type safety
  value: string;
  active: boolean;
  customer_id?: string;
  user_id: string;
  card_holder?: string;
  expiry_month?: number;
  expiry_year?: number;
  billing_address?: string;
  billing_zip?: string;
  billing_city?: string;
  last_used?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;  // The primary name field used throughout the app
  firstName?: string; // Added for compatibility with existing code
  lastName?: string;
  avatarUrl?: string; // Added for profile pictures
  is_active?: boolean;
  createdAt: string;
  customers?: Customer[];
  name?: string;     // Added for compatibility with some components
}

export interface TaskTimeSummary {
  task_id: string;
  user_id: string;
  session_count: number;
  total_seconds: number;
  total_hours: number;
}
