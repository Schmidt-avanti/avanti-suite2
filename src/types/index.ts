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
}

// Existing types (to fix build errors)
export type TaskStatus = 'new' | 'in_progress' | 'followup' | 'completed';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  created_at: string;
  source?: string;
  readable_id?: string;
  customer?: {
    id: string;
    name: string;
  };
  creator?: {
    id: string;
    "Full Name": string;
  };
  assignee?: {
    id: string;
    "Full Name": string;
  };
  follow_up_date?: string;
  closing_comment?: string;
  attachments?: any[];
  endkunde_id?: string;
  endkunde_email?: string; 
  from_email?: string;     
  description?: string;    
  matched_use_case_id?: string;
  
  // Adding the missing properties to fix TypeScript errors
  customer_id: string;
  created_by?: string;
  assigned_to?: string;
}

// Add missing types that are causing errors
export type UserRole = 'admin' | 'agent' | 'client';

export type TaskActivityAction = 'open' | 'close' | 'status_change' | 'comment' | 'assign';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  fullName?: string; // Add this property to fix the error
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
