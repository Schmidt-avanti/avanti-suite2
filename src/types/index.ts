
export type TaskStatus = 'new' | 'in progress' | 'blocked' | 'completed' | 'followup';

export interface Customer {
  id: string;
  name: string;
  branch?: string;
  createdAt?: string;
  isActive?: boolean;
  cost_center?: string;
  contact_person?: string;
  billing_address?: string;
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
  };
  closing_comment: string | null;
  attachments: string[] | null;
  source: string | null;
  endkunde_id: string | null;
  endkunde_email: string | null;
  from_email?: string; // Added for compatibility with useTasks.ts
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

export type TaskActivityAction = 'create' | 'assign' | 'status_change' | 'open' | 'close';

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

// Add missing interfaces
export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  fullName?: string;
  avatarUrl?: string;
  customers?: Customer[];
  is_active?: boolean;
}

export type UserRole = 'admin' | 'agent' | 'client';

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
  task_id?: string;
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  customer_id?: string;
  type: 'paypal' | 'creditcard';
  value: string;
  active: boolean;
  last_used?: string;
  created_at: string;
  updated_at: string;
  card_holder?: string;
  expiry_month?: number;
  expiry_year?: number;
  billing_address?: string;
  billing_city?: string;
  billing_zip?: string;
}

export interface TaskTimeSummary {
  user_id: string;
  task_id: string;
  total_hours: number;
  total_seconds: number;
  session_count: number;
}
